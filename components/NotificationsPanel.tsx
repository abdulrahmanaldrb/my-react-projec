// components/NotificationsPanel.tsx
import * as React from 'react';
import { ProjectInvitation, Notification } from '../types';
import { CheckIcon, XMarkIcon, UsersIcon, CheckBadgeIcon, StarIcon, ChatBubbleLeftEllipsisIcon } from './icons';

interface NotificationsPanelProps {
  invitations: ProjectInvitation[];
  notifications: Notification[];
  onRespond: (invitationId: string, accept: boolean) => void;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationIcon = ({ type }: { type: Notification['type'] | 'project_invitation' }) => {
    switch(type) {
        case 'project_invitation': return <UsersIcon className="w-5 h-5 text-purple-500" />;
        case 'project_approved': return <CheckBadgeIcon className="w-5 h-5 text-green-500" />;
        case 'new_review': return <StarIcon className="w-5 h-5 text-yellow-500" />;
        case 'review_reply': return <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500" />;
        case 'account_verified': return <CheckBadgeIcon className="w-5 h-5 text-blue-500" />;
        case 'project_rejected': return <XMarkIcon className="w-5 h-5 text-red-500" />;
        default: return <CheckBadgeIcon className="w-5 h-5 text-gray-500" />;
    }
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ invitations, notifications, onRespond, onClose, onMarkAsRead, onMarkAllAsRead }) => {
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const unreadNotifications = notifications.filter(n => !n.isRead);

    return (
        <div ref={panelRef} className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {(invitations.length > 0 || unreadNotifications.length > 0) && (
                     <button 
                        onClick={onMarkAllAsRead} 
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Mark all as read
                    </button>
                )}
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
                {invitations.length === 0 && notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No new notifications.</p>
                ) : (
                    <div className="space-y-2">
                        {/* Invitations first */}
                        {invitations.map(inv => (
                            <div key={inv.id} className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md">
                                <div className="flex items-start gap-3">
                                    <NotificationIcon type="project_invitation" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">{inv.fromUserEmail}</span> invited you to collaborate on <span className="font-semibold text-gray-900 dark:text-white">"{inv.projectName}"</span>.
                                        </p>
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={() => onRespond(inv.id, false)} className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md">
                                                Decline
                                            </button>
                                            <button onClick={() => onRespond(inv.id, true)} className="px-2 py-1 text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/10 dark:hover:bg-green-500/20 rounded-md">
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Other notifications */}
                        {notifications.map(noti => (
                             <div 
                                key={noti.id} 
                                onClick={() => onMarkAsRead(noti.id)}
                                className={`p-3 rounded-md cursor-pointer transition-colors ${noti.isRead ? 'opacity-60' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                             >
                                <div className="flex items-start gap-3">
                                    <NotificationIcon type={noti.type} />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{noti.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(noti.createdAt?.toDate()).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;