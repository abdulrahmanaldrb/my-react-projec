// components/ProjectChatPanel.tsx
import * as React from 'react';
import { Project, ProjectChatMessage, UserCredentials } from '../types';
import { XMarkIcon, SendIcon, LoadingSpinner } from './icons';
import { sendProjectChatMessage } from '../services/firebaseService';
import { useLanguage } from '../App';

interface ProjectChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser: UserCredentials;
}

const ProjectChatPanel: React.FC<ProjectChatPanelProps> = ({ isOpen, onClose, project, currentUser }) => {
  const { t, language } = useLanguage();
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if(isOpen) {
        setTimeout(scrollToBottom, 100);
    }
  }, [project?.projectChat, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !project || isSending) return;
    
    setIsSending(true);
    try {
      await sendProjectChatMessage(project.id, message);
      setMessage('');
    } catch (error) {
      console.error("Failed to send message", error);
      // Maybe show a toast here in a real app
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
      if (!timestamp || !timestamp.toDate) return '';
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      ></div>

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 flex flex-col h-full w-96 bg-gray-50 dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('header.projectChat')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project?.name}</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" title={t('common.close')}>
                <XMarkIcon className="w-5 h-5" />
            </button>
        </header>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {project?.projectChat && project.projectChat.length > 0 ? project.projectChat.map((msg) => {
                const isCurrentUser = msg.userId === currentUser.uid;
                const userBubbleClasses = language === 'ar' ? 'rounded-bl-none' : 'rounded-br-none';
                const modelBubbleClasses = language === 'ar' ? 'rounded-br-none' : 'rounded-bl-none';
                return (
                    <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-xl max-w-xs ${isCurrentUser ? `bg-blue-600 text-white ${userBubbleClasses}` : `bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${modelBubbleClasses}`}`}>
                            {!isCurrentUser && <p className="text-xs font-bold text-purple-500 dark:text-purple-400 mb-1">{msg.userEmail.split('@')[0]}</p>}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">{formatTimestamp(msg.timestamp)}</p>
                    </div>
                );
            }) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">{t('projectChat.noMessages')}</p>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={project ? t('projectChat.placeholder') : t('projectChat.placeholderDisabled')}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={!project || isSending}
            />
            <button
              type="submit"
              disabled={!project || isSending || !message.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 disabled:text-gray-600 disabled:bg-transparent transition-colors"
            >
              {isSending ? <LoadingSpinner className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectChatPanel;