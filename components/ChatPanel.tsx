// components/ChatPanel.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ChatMessage } from '../types';
import { SendIcon, LoadingSpinner, UserIcon, ModelIcon, FolderIcon, LogOutIcon, SparklesIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSubmit: (prompt: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  activeProjectName: string;
  onOpenDrawerRequest: () => void;
  onLogout: () => void;
  userEmail: string | null;
  isChatDisabled: boolean;
  onCritiqueRequest: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    isLoading, 
    onSubmit, 
    onSuggestionClick,
    activeProjectName,
    onOpenDrawerRequest,
    onLogout,
    userEmail,
    isChatDisabled,
    onCritiqueRequest,
}) => {
  const [prompt, setPrompt] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
      setPrompt('');
    }
  };
  
  const handleSuggestion = (suggestion: string) => {
    if (!isLoading) {
      onSuggestionClick(suggestion);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={onOpenDrawerRequest} 
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" 
              title="Open Projects"
            >
              <FolderIcon className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
                <h1 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={activeProjectName}>
                  {activeProjectName}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={userEmail || ''}>{userEmail}</p>
            </div>
        </div>
         <button 
            onClick={onLogout} 
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" 
            title="Log Out"
        >
            <LogOutIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            msg.role !== 'system' && (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 self-start"><ModelIcon className="w-5 h-5 text-green-500 dark:text-green-400" /></div>}
                <div className={`max-w-md`}>
                    <div className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                        {msg.role === 'model' ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                    </div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {msg.suggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestion(suggestion)}
                                    disabled={isLoading}
                                    className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                 {msg.role === 'user' && <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600"><UserIcon className="w-5 h-5 text-blue-500 dark:text-blue-300"/></div>}
              </div>
            )
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
               <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600"><ModelIcon className="w-5 h-5 text-green-500 dark:text-green-400" /></div>
              <div className="max-w-md p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none flex items-center">
                <LoadingSpinner className="w-5 h-5 mr-2" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmit(e);
              }
            }}
            placeholder={isChatDisabled ? 'Create or select a project to start.' : 'Describe what you want to build...'}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-3 pr-24 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            rows={2}
            disabled={isLoading || isChatDisabled}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            <button
              type="button"
              onClick={onCritiqueRequest}
              disabled={isLoading || isChatDisabled}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:text-gray-600 disabled:bg-transparent transition-colors"
              title="Get AI Feedback on Design & Accessibility"
            >
                <SparklesIcon className="w-5 h-5" />
            </button>
            <button
                type="submit"
                disabled={isLoading || !prompt.trim() || isChatDisabled}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 disabled:text-gray-600 disabled:bg-transparent transition-colors"
            >
                <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;