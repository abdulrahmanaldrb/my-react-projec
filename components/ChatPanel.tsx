// components/ChatPanel.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ChatMessage } from '../types';
import { SendIcon, LoadingSpinner, UserIcon, ModelIcon, FolderIcon, LogOutIcon, SparklesIcon, StopIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import InteractiveCodeBlock from './InteractiveCodeBlock';
import { useLanguage } from '../App';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSubmit: (prompt: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onFileSelect: (fileName: string) => void; // New prop to handle opening file in workspace
  activeProjectName: string;
  onOpenDrawerRequest: () => void;
  onLogout: () => void;
  userEmail: string | null;
  isChatDisabled: boolean;
  onCritiqueRequest: () => void;
  onStopGeneration: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    isLoading, 
    onSubmit, 
    onSuggestionClick,
    onFileSelect,
    activeProjectName,
    onOpenDrawerRequest,
    onLogout,
    userEmail,
    isChatDisabled,
    onCritiqueRequest,
    onStopGeneration,
}) => {
  const { t, language } = useLanguage();
  const [prompt, setPrompt] = React.useState('');
  const [selectedSuggestions, setSelectedSuggestions] = React.useState<string[]>([]);
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

  const toggleSelectSuggestion = (s: string) => {
    setSelectedSuggestions(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const sendSelectedSuggestions = () => {
    if (selectedSuggestions.length === 0 || isLoading) return;
    const combined = selectedSuggestions.map(s => `- ${s}`).join('\n');
    onSubmit(combined);
    setSelectedSuggestions([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={onOpenDrawerRequest} 
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" 
              title={t('projects.openProjects')}
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
            title={t('auth.logOut')}
        >
            <LogOutIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((msg, index) => {
            if (msg.role === 'system') return null;

            // Define the regex to find the entire suggestions block, non-greedily.
            // It stops at the next heading, the footer, or the end of the string.
            const suggestionsBlockRegex = /\n### (?:Suggestions|اقتراحات)[\s\S]*?(?=\n###|\*For custom development|\*للتطوير المخصص|$)/;
            // Split the content by this block and rejoin the other parts.
            // This effectively removes the suggestions block from the text to be rendered, regardless of its position.
            const contentWithoutSuggestions = msg.content.split(suggestionsBlockRegex).join('').trim();
            
            const userBubbleClasses = language === 'ar' ? 'rounded-bl-none' : 'rounded-br-none';
            const modelBubbleClasses = language === 'ar' ? 'rounded-br-none' : 'rounded-bl-none';

            return (
              <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 self-start"><ModelIcon className="w-5 h-5 text-green-500 dark:text-green-400" /></div>}
                <div className={`max-w-md w-full`}>
                    <div className={`p-3 rounded-xl ${msg.role === 'user' ? `bg-blue-600 text-white ${userBubbleClasses}` : `bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${modelBubbleClasses}`}`}>
                        <MarkdownRenderer content={contentWithoutSuggestions} />
                        
                        {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {msg.attachedFiles.map(file => (
                                    <InteractiveCodeBlock 
                                        key={file.name} 
                                        file={file}
                                        onOpenFile={onFileSelect}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                              {msg.suggestions.map((suggestion, i) => {
                                  const selected = selectedSuggestions.includes(suggestion);
                                  return (
                                      <button
                                          key={i}
                                          onClick={() => toggleSelectSuggestion(suggestion)}
                                          disabled={isLoading}
                                          className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200'}`}
                                      >
                                          {suggestion}
                                      </button>
                                  );
                              })}
                          </div>
                          <div className="flex gap-2">
                              <button
                                  type="button"
                                  onClick={sendSelectedSuggestions}
                                  disabled={isLoading || selectedSuggestions.length === 0}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                              >
                                  {t('chat.send') || 'Send selected'}
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setSelectedSuggestions([])}
                                  disabled={selectedSuggestions.length === 0}
                                  className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-3 py-1 rounded disabled:opacity-50"
                              >
                                  {t('common.clear') || 'Clear'}
                              </button>
                          </div>
                        </div>
                    )}
                </div>
                 {msg.role === 'user' && <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600"><UserIcon className="w-5 h-5 text-blue-500 dark:text-blue-300"/></div>}
              </div>
            )
          })}
          {isLoading && messages[messages.length - 1]?.role !== 'model' && (
            <div className="flex items-start gap-3">
               <div className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-600"><ModelIcon className="w-5 h-5 text-green-500 dark:text-green-400" /></div>
              <div className="max-w-md p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none flex items-center">
                <LoadingSpinner className="w-5 h-5 mr-2" />
                <span>{t('chat.thinking')}</span>
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
            placeholder={isChatDisabled ? t('chat.placeholderDisabled') : t('chat.placeholder')}
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
              title={t('chat.critiqueTooltip')}
            >
                <SparklesIcon className="w-5 h-5" />
            </button>
            {isLoading ? (
                <button
                    type="button"
                    onClick={onStopGeneration}
                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                    title={t('chat.stopGenerationTitle')}
                >
                    <StopIcon className="w-5 h-5" />
                </button>
            ) : (
                <button
                    type="submit"
                    disabled={!prompt.trim() || isChatDisabled}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 disabled:text-gray-600 disabled:bg-transparent transition-colors"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;