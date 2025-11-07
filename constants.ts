// constants.ts

import { ChatMessage, Project, ShareData } from './types';

export const SYSTEM_PROMPT = `You are a senior frontend developer AI assistant. Your role is to help users build and modify web projects by providing the complete code and a thoughtful explanation of your work.

You will receive a user's prompt and the current state of the project's files.

Your response MUST be a single, valid JSON object. Do not add any conversational text or markdown formatting around the JSON object.

The JSON object must have two top-level keys: "files" and "responseMessage".

1.  "files": An array of file objects, representing the ENTIRE project state. Each file object must contain:
    - "name": The full file path (e.g., "index.html").
    - "language": The programming language (e.g., "html", "css", "javascript").
    - "content": The full content of the file.

2.  "responseMessage": An object explaining your thought process. It must contain:
    - "plan": A string describing your step-by-step plan BEFORE making changes.
    - "summary": A string summarizing the changes you made AFTER implementing them.
    - "suggestions": An array of 2-3 short, actionable strings for what the user could ask for next (e.g., "Add a dark mode toggle", "Make the header sticky").

Adopt a helpful and collaborative persona. Think like a real developer: plan your work, execute it, and then suggest next steps. Always return the complete project in the "files" array, even for small changes.`;

export const INITIAL_CHAT_MESSAGE: ChatMessage = {
  role: 'model',
  content: `أهلاً بك في "أنا مهندس"

منصتك الذكية لبناء المواقع. صف فكرتك، ونحن نبني موقعك.
لا حاجة لخبرة برمجية. هنا، تتحول أفكارك إلى واقع.

صف الموقع الذي تتخيله، سواء كان متجراً إلكترونياً بتصاميم عصرية ورسوم متحركة، أو مدونة شخصية، أو موقعاً لشركتك. "أنا مهندس" يفهم رؤيتك ويتولى الباقي.

جرب أن تطلب مثلاً:
"أريد متجر أزياء إلكتروني بتصميم عصري، مع إضافة رسوم متحركة (animations) أنيقة عند تصفح المنتجات."

ابدأ الآن، ودع الهندسة الرقمية تبني لك موقع أحلامك.`
};

export const createNewProject = (name: string, userId: string, userEmail: string): Project => {
    const initialShareData: ShareData = {
      status: 'none',
      permissions: {
        allowDownload: false,
        clonePermission: 'none',
      },
      category: 'Website',
      description: '',
    };
    return {
        id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        files: [],
        chatHistory: [INITIAL_CHAT_MESSAGE],
        previewHistory: {
            stack: [JSON.stringify([])], // Start with the initial empty state for undo/redo
            position: 0,
        },
        shareData: initialShareData,
        // Initialize collaboration fields
        ownerId: userId,
        collaborators: {
            [userId]: { email: userEmail, role: 'owner' },
        },
        memberIds: [userId],
    };
};


export const PROJECT_CATEGORIES = [
  'Website',
  'Portfolio',
  'E-commerce',
  'Blog',
  'Game',
  'Utility',
  'Other',
];