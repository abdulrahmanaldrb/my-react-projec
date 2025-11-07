// components/CollaborationModal.tsx
import * as React from 'react';
import { Project, UserCredentials } from '../types';
import { XMarkIcon, LoadingSpinner, TrashIcon, UserIcon } from './icons';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser: UserCredentials;
  onInvite: (project: Project, email: string) => Promise<string>;
  onRemove: (project: Project, userId: string) => Promise<void>;
  showToast: (message: string) => void;
}

const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen, onClose, project, currentUser, onInvite, onRemove, showToast }) => {
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setIsLoading(true);
    setError('');
    try {
        await onInvite(project, inviteEmail.trim());
        showToast(`Invitation sent to ${inviteEmail.trim()}`);
        setInviteEmail('');
    } catch (err: any) {
        setError(err.message || "Failed to send invitation.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this collaborator?")) return;
    try {
        await onRemove(project, userId);
        showToast("Collaborator removed.");
    } catch (err: any) {
        showToast(err.message || "Failed to remove collaborator.");
    }
  };

  const collaborators = Object.entries(project.collaborators);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Share "{project.name}"</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Invite others to collaborate on this project in real-time.</p>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
            required
          />
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center w-28">
            {isLoading ? <LoadingSpinner className="w-5 h-5" /> : 'Send Invite'}
          </button>
        </form>
        {error && <p className="text-red-500 dark:text-red-400 text-xs mb-4">{error}</p>}

        {/* Collaborators List */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Collaborators</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {collaborators.map(([userId, { email, role }]) => (
              <div key={userId} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
                    </div>
                </div>
                {role !== 'owner' && (
                  <button 
                    onClick={() => handleRemove(userId)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" 
                    title="Remove collaborator"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationModal;