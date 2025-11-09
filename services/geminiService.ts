// services/geminiService.ts

import { GoogleGenAI } from "@google/genai";
import { GeminiResponse, ProjectFile, ChatMessage } from '../types';
import { SYSTEM_PROMPT } from '../constants';
import { getAIConfig } from './firebaseService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

let systemPromptCache: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (systemPromptCache) {
    return systemPromptCache;
  }
  try {
    const config = await getAIConfig();
    if (config && config.systemPrompt) {
      console.log("Using remote AI system prompt.");
      systemPromptCache = config.systemPrompt;
      return systemPromptCache;
    }
  } catch (error) {
    console.error("Failed to fetch remote AI config, using default.", error);
  }
  // Fallback to local constant
  console.log("Using default AI system prompt.");
  systemPromptCache = SYSTEM_PROMPT;
  return systemPromptCache;
}

/**
 * Parses the final, complete Markdown response from the AI into a structured GeminiResponse object.
 * @param markdownText The full response from the AI.
 * @returns A GeminiResponse object.
 */
function parseFinalResponse(markdownText: string): Omit<GeminiResponse, 'rawMarkdown'> {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const planRegex = /### (?:Plan|خطة)\s*([\s\S]*?)(?=```json)/;
    
    // More robust, order-agnostic regexes. They stop at the next heading, the footer, or the end of the string.
    const boundary = `(?=\\n###|\\*For custom development|\\*للتطوير المخصص|$)`;
    const summaryRegex = new RegExp(`### (?:Summary|ملخص)\\s*([\\s\\S]*?)${boundary}`);
    const suggestionsRegex = new RegExp(`### (?:Suggestions|اقتراحات)\\s*([\\s\\S]*?)${boundary}`);
    const answerRegex = new RegExp(`### (?:Answer|إجابة)\\s*([\\s\\S]*?)${boundary}`);
    
    const footerRegex = /\*(?:For custom development and AI solutions, contact the platform developer, Eng. Abdulrahman Al-Darb\.|للتطوير المخصص وحلول الذكاء الاصطناعي، تواصل مع مطور المنصة م\. عبدالرحمن الدرب\.)\*/;


    const jsonMatch = markdownText.match(jsonRegex);
    let files: ProjectFile[] = [];
    if (jsonMatch && jsonMatch[1]) {
        try {
            files = JSON.parse(jsonMatch[1]).files;
        } catch (e) {
            console.error("Failed to parse JSON from final response:", e);
        }
    }
    
    // Helper to clean up matched markdown
    const cleanMatch = (match: RegExpMatchArray | null) => match?.[1]?.trim() || '';

    const plan = cleanMatch(markdownText.match(planRegex));
    const summary = cleanMatch(markdownText.match(summaryRegex));
    const suggestionsText = cleanMatch(markdownText.match(suggestionsRegex));
    const suggestions = suggestionsText.split('\n').map(s => s.replace(/^- /, '').trim()).filter(Boolean);
    const footer = markdownText.match(footerRegex)?.[0] || '';
    const answer = cleanMatch(markdownText.match(answerRegex));

    return {
        files: files || [],
        responseMessage: {
            plan: plan,
            summary: summary,
            answer: answer,
            suggestions: suggestions,
            footer: footer,
        },
    };
}


export async function generateCodeStream(
    prompt: string, 
    currentFiles: ProjectFile[], 
    chatHistory: ChatMessage[], 
    language: 'ar' | 'en',
    onChunk: (textChunk: string) => void,
    signal: AbortSignal
): Promise<GeminiResponse> {
  try {
    const systemInstruction = await getSystemPrompt();
    
    const historyForContext = chatHistory
      .slice(-6)
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const fullPrompt = `
      <language_preference>${language}</language_preference>
      <conversation_history>${historyForContext}</conversation_history>
      <user_request>${prompt}</user_request>
      <project_files>${JSON.stringify(currentFiles, null, 2)}</project_files>
    `;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    let aggregatedResponseText = '';
    for await (const chunk of responseStream) {
        signal.throwIfAborted(); // Check for cancellation on each chunk.
        const chunkText = chunk.text;
        if (chunkText) {
            aggregatedResponseText += chunkText;
            onChunk(chunkText);
        }
    }
    
    // Perform a final, clean parse of the entire aggregated response
    const parsedResponse = parseFinalResponse(aggregatedResponseText);
    return {
        ...parsedResponse,
        rawMarkdown: aggregatedResponseText,
    };

  } catch (error) {
    // If it's an AbortError, re-throw it so the caller can handle it.
    if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
    }
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while generating code: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating code.");
  }
}

const DESIGN_CRITIQUE_PROMPT = `You are an expert UI/UX designer and accessibility specialist named "CritiqueBot".
Your task is to analyze the provided web project files (HTML and CSS) and provide a detailed, constructive critique.

Your analysis should cover the following areas:
1.  **Layout & Composition:** Is the layout balanced? Is there a clear visual hierarchy? Is the spacing (margins, padding) consistent and effective?
2.  **Typography:** Are the font choices appropriate? Is the font size and line height readable? Is there sufficient contrast between text and background?
3.  **Color Palette:** Is the color scheme harmonious? Does it support the brand/purpose of the site? Is color contrast sufficient for accessibility (WCAG AA standards)?
4.  **Accessibility (a11y):** Are semantic HTML tags used correctly? Do images have \`alt\` attributes? Are interactive elements keyboard-navigable? Are ARIA roles used where necessary?

Format your response in Markdown. Use headings, bullet points, and code snippets to make your feedback clear, concise, and actionable. Be encouraging and professional. Start your response with a brief, overall impression.
Do not suggest any code changes in a code block, only provide feedback.`;


export async function generateCritique(currentFiles: ProjectFile[]): Promise<string> {
  try {
    const promptContent = `
      Project Files:
      ${JSON.stringify(currentFiles.map(f => ({ name: f.name, content: f.content })), null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Use a powerful model for nuanced feedback
      contents: promptContent,
      config: {
        systemInstruction: DESIGN_CRITIQUE_PROMPT,
        temperature: 0.5, // Allow for some creativity in the feedback
      },
    });

    return response.text;
  } catch (error)
 {
    console.error("Error calling Gemini API for critique:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while generating critique: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating critique.");
  }
}