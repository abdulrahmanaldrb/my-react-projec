// components/ManageUserModal.tsx
import * as React from 'react';
import { AdminUser, UserProfileData } from '../types';
import { XMarkIcon, LoadingSpinner, CheckBadgeIcon } from './icons';

interface ManageUserModalProps {
  user: AdminUser;
  profile: UserProfileData;
  onClose: () => void;
  onSave: (userId: string, updates: Partial<UserProfileData>) => Promise<void>;
  onViewProjects: () => void;
}

const ManageUserModal: React.FC<ManageUserModalProps> = ({ user, profile, onClose, onSave, onViewProjects }) => {
    const [status, setStatus] = React.useState<'active' | 'suspended' | 'banned'>(user.status);
    const [isVerified, setIsVerified] = React.useState(user.isVerified);
    const [displayName, setDisplayName] = React.useState(profile.displayName || '');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(user.uid, { status, isVerified, displayName });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage User</h2>
                     {user.isVerified && <CheckBadgeIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" title="Verified User" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 break-all">
                    Managing account: <span className="font-semibold text-gray-800 dark:text-gray-200">{user.email}</span>
                </p>

                <div className="space-y-4">
                     <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                        <input
                            type="text"
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Status</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                        >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                    <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id="isVerified"
                                type="checkbox"
                                checked={isVerified}
                                onChange={(e) => setIsVerified(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="isVerified" className="font-medium text-gray-700 dark:text-gray-300">Verified User</label>
                            <p className="text-gray-500 dark:text-gray-400">Verified users get a special badge in the marketplace.</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <button
                        onClick={onViewProjects}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                        View User's Projects
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center min-w-[120px] justify-center"
                        >
                            {isSaving ? <LoadingSpinner className="w-5 h-5" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageUserModal;