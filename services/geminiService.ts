// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse, ProjectFile, ChatMessage } from '../types';
import { SYSTEM_PROMPT } from '../constants';
import { getAIConfig } from './firebaseService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          language: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['name', 'language', 'content'],
      },
    },
    responseMessage: {
      type: Type.OBJECT,
      properties: {
        plan: { type: Type.STRING },
        summary: { type: Type.STRING },
        answer: { type: Type.STRING },
        footer: { type: Type.STRING },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['suggestions'],
    },
  },
  required: ['files', 'responseMessage'],
};

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


export async function generateCode(prompt: string, currentFiles: ProjectFile[], chatHistory: ChatMessage[]): Promise<GeminiResponse> {
  try {
    const systemInstruction = await getSystemPrompt();
    
    // Take the last 6 messages (excluding the current user prompt which is not yet in the history)
    // and format them for context.
    const historyForContext = chatHistory
      .slice(-6)
      .filter(msg => msg.role !== 'system') // System messages are not part of the conversation flow
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const fullPrompt = `
      <conversation_history>
      ${historyForContext}
      </conversation_history>

      <user_request>${prompt}</user_request>

      <project_files>
      ${JSON.stringify(currentFiles, null, 2)}
      </project_files>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    
    // Basic validation to ensure the response is in a usable state
    if (parsedResponse && Array.isArray(parsedResponse.files) && parsedResponse.responseMessage) {
      return parsedResponse;
    } else {
      console.error("Invalid response format from Gemini API:", parsedResponse);
      throw new Error("Failed to parse the file structure from the AI response.");
    }
  } catch (error) {
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
  } catch (error) {
    console.error("Error calling Gemini API for critique:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while generating critique: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating critique.");
  }
}