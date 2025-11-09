// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';

import ChatPanel from './components/ChatPanel';
import Workspace from './components/Workspace';
import Preview from './components/Preview';
import Login from './components/Login';
import ProjectsDrawer from './components/ProjectsDrawer';
import AdminPanel from './components/AdminPanel';
import Marketplace from './components/Marketplace';
import MarketplaceProjectViewer from './components/MarketplaceProjectViewer';
import CollaborationModal from './components/CollaborationModal';
import DeveloperIntroModal from './components/DeveloperIntroModal';
import UserProfile from './components/UserProfile';
import MyProfile from './components/MyProfile';
import SettingsPage from './components/SettingsPage';
import NotificationsPanel from './components/NotificationsPanel';
import ShareProjectModal from './components/ShareProjectModal';
import ProjectChatPanel from './components/ProjectChatPanel';
import { enTranslations, arTranslations } from './locales/index';


import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, InformationCircleIcon, StoreIcon, LoadingSpinner, BellIcon, PublishIcon, UsersIcon, XMarkIcon, ChatBubbleLeftEllipsisIcon } from './components/icons';

import { generateCodeStream, generateCritique } from './services/geminiService';
import { AuthResponse, signIn, signUp, logOut, onAuthChange } from './services/authService';
import { onProjectsSnapshot, saveProject, deleteProject, updateProject, submitProjectForReview, cloneMarketplaceProject, inviteUserToProject, onInvitationsSnapshot, respondToInvitation, removeCollaborator, onNotificationsSnapshot, markNotificationAsRead, markAllNotificationsAsRead, getActiveAnnouncements } from './services/firebaseService';

import { Project, ChatMessage, UserCredentials, ProjectFile, MarketplaceProject, ShareData, ProjectInvitation, Notification, Announcement } from './types';
import { createNewProject } from './constants';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Allotment } from 'allotment';

type AppView = 'editor' | 'marketplace' | 'marketplace_viewer' | 'user_profile' | 'my_profile' | 'settings';
type AppTheme = 'light' | 'dark';
type Language = 'en' | 'ar';

const translationsMap = {
    en: enTranslations,
    ar: arTranslations
};

// --- Language Context ---
export const LanguageContext = React.createContext<{
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, replacements?: { [key: string]: string }) => string;
}>({
    language: 'ar',
    setLanguage: () => {},
    t: (key: string) => key,
});

export const useLanguage = () => React.useContext(LanguageContext);


const AppHeader: React.FC<{
    onShowIntro: () => void;
    onDownload: () => void;
    toggleMobilePreview: () => void;
    isMobilePreview: boolean;
    toggleFullScreen: () => void;
    isFullScreen: boolean;
    invitations: ProjectInvitation[];
    notifications: Notification[];
    onRespondToInvitation: (id: string, accept: boolean) => void;
    onPublish: () => void;
    onCollaborate: () => void;
    onToggleProjectChat: () => void;
    onMarkNotificationAsRead: (id: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    isActionDisabled: boolean;
    onViewMarketplace: () => void;
    // New Props for merged header
    activeTab: 'code' | 'preview';
    setActiveTab: (tab: 'code' | 'preview') => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onRefresh: () => void;
    previewPath: string | null;
    onSetPreviewPath: (path: string) => void;
    projectFiles: ProjectFile[];
}> = ({
    onShowIntro, onDownload,
    toggleMobilePreview, isMobilePreview,
    toggleFullScreen, isFullScreen,
    invitations, notifications, onRespondToInvitation,
    onPublish, onCollaborate, onToggleProjectChat,
    onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
    isActionDisabled, onViewMarketplace,
    activeTab, setActiveTab, onUndo, onRedo, canUndo, canRedo, onRefresh, previewPath, onSetPreviewPath, projectFiles
}) => {
    const { t } = useLanguage();
    const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
    const [localPath, setLocalPath] = React.useState(previewPath || '');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const invitationCount = invitations.length;
    const totalNotifications = unreadCount + invitationCount;

    React.useEffect(() => {
        setLocalPath(previewPath || '');
    }, [previewPath]);

    const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (projectFiles.some(f => f.name === localPath)) {
                onSetPreviewPath(localPath);
            } else {
                showToast(t('header.fileNotFoundToast'));
            }
            e.currentTarget.blur();
        }
    };
    
    const showToast = (message: string) => {
        // A bit of a hack, but better than plumbing a toast function all the way down
        const toast = document.createElement('div');
        toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in-out";
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    return (
        <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 h-[49px] gap-4">
            {/* Left Section */}
            <div className="flex items-center">
                <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-sm rounded-s-md transition-colors ${activeTab === 'code' && !isFullScreen ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{t('header.codeTab')}</button>
                <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-sm rounded-e-md transition-colors ${activeTab === 'preview' || isFullScreen ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{t('header.previewTab')}</button>
            </div>

            {/* Center Section: Preview Controls - uses opacity to prevent layout shift */}
            <div className={`flex items-center gap-4 flex-grow justify-center transition-opacity duration-300 ${activeTab === 'preview' || isFullScreen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-1">
                    <button onClick={onUndo} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canUndo} title={t('header.undo')}><ArrowLeftIcon className="w-4 h-4" /></button>
                    <button onClick={onRedo} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRedo} title={t('header.redo')}><ArrowRightIcon className="w-4 h-4" /></button>
                    <button onClick={onRefresh} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={t('header.refresh')}><RefreshIcon className="w-4 h-4" /></button>
                </div>
                <input 
                    type="text"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    onKeyDown={handlePathKeyDown}
                    onBlur={() => setLocalPath(previewPath || '')}
                    className="flex-1 bg-white dark:bg-gray-900 rounded-md px-3 py-1 text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs text-center border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="index.html"
                />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onViewMarketplace}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
                    title={t('header.marketplace')}
                >
                    <StoreIcon className="w-5 h-5" />
                    <span>{t('header.marketplace')}</span>
                </button>
                <button onClick={onShowIntro} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={t('header.aboutDeveloper')}><InformationCircleIcon className="w-5 h-5" /></button>
                <button
                    onClick={onPublish}
                    disabled={isActionDisabled}
                    className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('header.publish')}
                >
                    <PublishIcon className="w-5 h-5" />
                </button>
                 <button
                    onClick={onCollaborate}
                    disabled={isActionDisabled}
                    className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('header.collaborate')}
                >
                    <UsersIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onToggleProjectChat}
                    disabled={isActionDisabled}
                    className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('header.projectChat')}
                >
                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                </button>
                <button onClick={onDownload} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={t('header.download')}><ArrowDownTrayIcon className="w-5 h-5" /></button>
                
                <div className="relative border-s border-gray-200 dark:border-gray-700 ms-2 ps-2">
                    <button onClick={() => setIsNotificationsOpen(p => !p)} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={t('header.notifications')}>
                        <BellIcon className="w-5 h-5" />
                        {totalNotifications > 0 && <span className="absolute top-1 end-1 block h-4 w-4 text-xs flex items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-gray-100 dark:ring-gray-800">{totalNotifications}</span>}
                    </button>
                     {isNotificationsOpen && (
                        <NotificationsPanel
                            invitations={invitations}
                            notifications={notifications}
                            onRespond={onRespondToInvitation}
                            onClose={() => setIsNotificationsOpen(false)}
                            onMarkAsRead={onMarkNotificationAsRead}
                            onMarkAllAsRead={onMarkAllNotificationsAsRead}
                        />
                    )}
                </div>

                <div className="flex items-center gap-1 border-s border-gray-200 dark:border-gray-700 ps-2">
                    <button onClick={toggleMobilePreview} className={`p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 ${isMobilePreview ? 'text-blue-500 dark:text-blue-400' : ''}`} title={t('header.mobileView')}><DevicePhoneMobileIcon className="w-5 h-5" /></button>
                    <button onClick={toggleFullScreen} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={isFullScreen ? t('header.exitFullscreen') : t('header.fullscreen')}>{isFullScreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}</button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translate(-50%, 10px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, 10px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 3s ease-out forwards;
                }
           `}</style>
        </header>
    )
}

// A more robust parser for finding file objects in a streaming, potentially incomplete JSON array string.
function parseStreamingFiles(jsonArrayContent: string): ProjectFile[] {
    const files: ProjectFile[] = [];
    // Split by a comma that is followed by an opening brace, but don't consume the comma.
    // This safely separates file objects in a JSON array.
    const objectStrings = jsonArrayContent.split(/,(?=\s*\{)/);

    objectStrings.forEach(objStr => {
        let currentObjStr = objStr.trim();

        // Find key-value pairs using a non-greedy regex
        const nameMatch = currentObjStr.match(/"name"\s*:\s*"(.*?)"/);
        const langMatch = currentObjStr.match(/"language"\s*:\s*"(.*?)"/);
        const contentMatch = currentObjStr.match(/"content"\s*:\s*"(.*)/s); // 's' flag for dotall

        if (nameMatch && langMatch && contentMatch) {
            const name = nameMatch[1];
            const language = langMatch[1];
            let content = contentMatch[1];

            // The content string is greedy and may contain trailing JSON syntax like `"` or `"}}`
            // We need to find the *correct* end of the content string by tracking escaped quotes.
            let closingQuoteIndex = -1;
            let isEscaped = false;
            for (let i = 0; i < content.length; i++) {
                if (content[i] === '\\' && !isEscaped) {
                    isEscaped = true;
                    continue;
                }
                // If we find a quote that is not escaped, it *could* be the end.
                if (content[i] === '"' && !isEscaped) {
                    // Look ahead: is the next non-whitespace char a '}'? If so, this is the end.
                    const nextChar = content.substring(i + 1).trim().charAt(0);
                    if (nextChar === '}' || nextChar === '') {
                         closingQuoteIndex = i;
                         break;
                    }
                }
                isEscaped = false;
            }

            if (closingQuoteIndex !== -1) {
                content = content.substring(0, closingQuoteIndex);
            } else {
                // If no definitive closing quote is found (because the stream is cut off),
                // we can make a best guess by removing common trailing syntax.
                const endSyntaxMatch = content.match(/("\s*\}\s*\]?\s*\}?)$/);
                if (endSyntaxMatch) {
                    content = content.substring(0, endSyntaxMatch.index);
                }
            }
            
            // Un-escape common sequences.
            content = content.replace(/\\n/g, '\n')
                             .replace(/\\t/g, '\t')
                             .replace(/\\"/g, '"')
                             .replace(/\\\\/g, '\\');

            files.push({ name, language, content });
        }
    });

    return files;
}



const AppContent: React.FC = () => {
    const { t, language } = useLanguage();
    // --- App State ---
    const [view, setView] = React.useState<AppView>('editor');
    const [user, setUser] = React.useState<UserCredentials | null>(null);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [authInitialized, setAuthInitialized] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState<string | null>(null);
    const [theme, setTheme] = React.useState<AppTheme>('dark');
    const [activeAnnouncement, setActiveAnnouncement] = React.useState<Announcement | null>(null);
    
    // --- Project State ---
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
    const [invitations, setInvitations] = React.useState<ProjectInvitation[]>([]);
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    
    // --- UI State ---
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [isProjectChatOpen, setIsProjectChatOpen] = React.useState(false);
    const [isIntroModalOpen, setIsIntroModalOpen] = React.useState(false);
    const [projectForCollaborationModal, setProjectForCollaborationModal] = React.useState<Project | null>(null);
    const [projectForPublishModal, setProjectForPublishModal] = React.useState<Project | null>(null);
    
    // --- Editor/Preview State ---
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [previewPath, setPreviewPath] = React.useState<string | null>('index.html');
    const [previewRefreshKey, setPreviewRefreshKey] = React.useState(0);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [activeTab, setActiveTab] = React.useState<'code' | 'preview'>('preview');
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isPreviewMobile, setIsPreviewMobile] = React.useState(false);
    const [marketplaceProjectToShow, setMarketplaceProjectToShow] = React.useState<MarketplaceProject | null>(null);
    const [profileUserId, setProfileUserId] = React.useState<string | null>(null);

    // --- Cancellation Controller ---
    const abortControllerRef = React.useRef<AbortController | null>(null);

    // --- Derived State ---
    const activeProject = projects.find(p => p.id === activeProjectId) ?? null;
    const canUndo = activeProject ? activeProject.previewHistory.position > 0 : false;
    const canRedo = activeProject ? activeProject.previewHistory.position < activeProject.previewHistory.stack.length - 1 : false;
    
    // --- Theme Management ---
    React.useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as AppTheme | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);

    React.useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Announcement Banner ---
    React.useEffect(() => {
        const checkAnnouncements = async () => {
            try {
                const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
                const announcements = await getActiveAnnouncements();
                const firstUndismissed = announcements.find(a => !dismissed.includes(a.id));
                setActiveAnnouncement(firstUndismissed || null);
            } catch (error) {
                console.error("Failed to fetch announcements:", error);
            }
        };
        if(user && !isAdmin) {
             checkAnnouncements();
        }
    }, [user, isAdmin]);

    const handleDismissAnnouncement = () => {
        if (activeAnnouncement) {
            const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
            dismissed.push(activeAnnouncement.id);
            localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
            setActiveAnnouncement(null);
        }
    };
    
    // --- Toast Notification ---
    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 4000);
    };
    
    // --- Authentication & Real-time Data ---
    React.useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser && firebaseUser.email) {
                if (isAdmin) return;
                const currentUser = { email: firebaseUser.email, uid: firebaseUser.uid };
                setUser(currentUser);
            } else {
                if (!isAdmin) {
                    setUser(null);
                    setIsAdmin(false);
                    setProjects([]);
                    setActiveProjectId(null);
                }
            }
            setAuthInitialized(true);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Real-time project listener
    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onProjectsSnapshot((userProjects) => {
             // Handle case where a project is deleted by another user
            if (activeProjectId && !userProjects.some(p => p.id === activeProjectId)) {
                setActiveProjectId(userProjects[0]?.id || null);
                showToast(t('toasts.projectDeleted'));
            }
             // Handle initial load
            if (projects.length === 0 && userProjects.length > 0 && !activeProjectId) {
                const lastActiveId = localStorage.getItem('lastActiveProjectId');
                setActiveProjectId((lastActiveId && userProjects.some(p => p.id === lastActiveId)) ? lastActiveId : userProjects[0].id);
            }
             // Handle new project creation when list was empty
            if (projects.length === 0 && userProjects.length === 1) {
                setActiveProjectId(userProjects[0].id);
                setIsIntroModalOpen(true);
            }
            setProjects(userProjects);
        });
        return () => unsubscribe();
    }, [user, activeProjectId, projects.length, t]);

    // Save last active project ID
    React.useEffect(() => {
        if (activeProjectId) {
            localStorage.setItem('lastActiveProjectId', activeProjectId);
        }
    }, [activeProjectId]);
    
    // Real-time invitations listener
    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onInvitationsSnapshot(setInvitations);
        return () => unsubscribe();
    }, [user]);
    
    // Real-time notifications listener
    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onNotificationsSnapshot(setNotifications);
        return () => unsubscribe();
    }, [user]);

    const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
        try {
            await respondToInvitation(invitationId, accept);
            showToast(accept ? t('toasts.invitationAccepted') : t('toasts.invitationDeclined'));
        } catch (error: any) {
            showToast(error.message || t('toasts.invitationError'));
        }
    };
    
    const handleMarkNotificationAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

    // Fix: Corrected the function call to use the imported `markAllNotificationsAsRead` from firebaseService.
    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead();
    };

    // --- Auth Handlers ---
    const handleLogin = (email: string, pass: string) => {
        if (email.toLowerCase() === 'admin71275' && pass === '712750321') {
            setIsAdmin(true);
            setUser({ email: 'admin71275', uid: 'admin' }); 
            return Promise.resolve({ success: true });
        }
        return signIn(email, pass);
    };

    const handleSignUp = (email: string, pass: string) => signUp(email, pass);
    const handleLogout = () => isAdmin ? (setIsAdmin(false), setUser(null)) : logOut();
    
    // --- Project Management ---
    const handleNewProject = async () => {
        if (!user) return;
        const newProjectName = `${t('projects.newProjectName')} ${projects.length + 1}`;
        const newProject = createNewProject(newProjectName, user.uid, user.email, t);
        await saveProject(newProject);
        // The real-time listener will add it to the state. We just need to activate it.
        setActiveProjectId(newProject.id);
        setIsDrawerOpen(false);
    };

    const handleSelectProject = (id: string) => {
        setActiveProjectId(id);
        setIsDrawerOpen(false);
    };

    const handleDeleteProject = async (id: string) => {
        if (projects.length <= 1) return showToast(t('toasts.deleteOnlyProjectError'));
        try {
            await deleteProject(id);
            // Listener will update the projects list.
        } catch (error: any) {
            showToast(error.message || t('toasts.deleteProjectError'));
        }
    };

    const handleRenameProject = async (id: string, newName: string) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
        await updateProject(id, { name: newName });
    };

    // --- History Management ---
    const updateProjectHistory = (project: Project, newFiles: ProjectFile[]): Project => {
        const history = project.previewHistory;
        const newStack = history.stack.slice(0, history.position + 1);
        newStack.push(JSON.stringify(newFiles));
        return {
            ...project,
            previewHistory: {
                stack: newStack,
                position: newStack.length - 1,
            },
        };
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false); // Immediately update UI
        }
    };


    // --- Core AI Interaction (Streaming) ---
    const handleSubmitPrompt = async (prompt: string) => {
        if (!activeProject) return;

        const preStreamProjectState = {
            files: activeProject.files,
            chatHistory: activeProject.chatHistory
        };

        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', content: prompt };
        const modelMessage: ChatMessage = { role: 'model', content: '', attachedFiles: [] };
        
        const updatedChatHistory = [...activeProject.chatHistory, userMessage, modelMessage];
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, chatHistory: updatedChatHistory } : p));
        
        abortControllerRef.current = new AbortController();
        let fullStreamText = '';

        const handleStreamChunk = (chunkText: string) => {
            fullStreamText += chunkText;
        
            let currentContent = '';
            let currentFiles: ProjectFile[] = [];
        
            const jsonBlockStart = fullStreamText.indexOf('```json');
            const jsonBlockEnd = fullStreamText.lastIndexOf('```');
        
            if (jsonBlockStart === -1) {
                currentContent = fullStreamText;
            } else {
                currentContent = fullStreamText.substring(0, jsonBlockStart);
                let jsonBuffer = fullStreamText.substring(jsonBlockStart + 7, jsonBlockEnd > jsonBlockStart ? jsonBlockEnd : undefined);
                
                try {
                    const filesMatch = jsonBuffer.match(/"files"\s*:\s*\[\s*([\s\S]*)/);
                    if(filesMatch && filesMatch[1]) {
                        currentFiles = parseStreamingFiles(filesMatch[1]);
                    }
                } catch (e) { /* Ignore parsing errors on incomplete stream */ }

                if (jsonBlockEnd > jsonBlockStart) {
                    currentContent += fullStreamText.substring(jsonBlockEnd + 3);
                }
            }
        
            setProjects(prevProjects => prevProjects.map(p => {
                if (p.id !== activeProjectId) return p;

                const updatedFilesMap = new Map(p.files.map(f => [f.name, f]));
                currentFiles.forEach(file => updatedFilesMap.set(file.name, file));
                const mergedFiles = Array.from(updatedFilesMap.values());

                const newHistory = [...p.chatHistory];
                const lastMsg = newHistory[newHistory.length - 1];

                if (lastMsg?.role === 'model') {
                    lastMsg.content = currentContent;
                    lastMsg.attachedFiles = currentFiles;
                }
                return { ...p, files: mergedFiles, chatHistory: newHistory };
            }));
        };

        try {
            const response = await generateCodeStream(prompt, activeProject.files, activeProject.chatHistory, language, handleStreamChunk, abortControllerRef.current.signal);
            
            const { files, responseMessage, rawMarkdown } = response;

            const finalModelMessage: ChatMessage = {
                role: 'model',
                content: rawMarkdown,
                suggestions: responseMessage.suggestions,
                attachedFiles: files
            };

            const finalChatHistory = [...updatedChatHistory.slice(0, -1), finalModelMessage];
            
            if (response.files && response.files.length > 0) {
                 const projectWithNewHistory = updateProjectHistory(activeProject, response.files);
                 await updateProject(activeProjectId, {
                    files: response.files,
                    chatHistory: finalChatHistory,
                    previewHistory: projectWithNewHistory.previewHistory
                });
                refreshPreview();
            } else {
                 await updateProject(activeProjectId, { chatHistory: finalChatHistory });
            }

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log("Generation stopped by user.");
                const stopMessage: ChatMessage = { role: 'model', content: t('chat.generationStopped') };
                const revertedChatHistory = [...preStreamProjectState.chatHistory, userMessage, stopMessage];
                
                setProjects(projects.map(p => p.id === activeProjectId ? { ...p, files: preStreamProjectState.files, chatHistory: revertedChatHistory } : p));
                await updateProject(activeProjectId, { 
                    files: preStreamProjectState.files, 
                    chatHistory: revertedChatHistory 
                });
                showToast(t('toasts.generationStopped'));
            } else {
                console.error(error);
                const errorMessage: ChatMessage = { role: 'model', content: t('chat.errorMessage') };
                await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory.slice(0, -1), errorMessage] });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };
    
    const handleCritiqueRequest = async () => {
        if (!activeProject) return;
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', content: t('chat.critiqueRequest') };
        const updatedChatHistory = [...activeProject.chatHistory, userMessage];
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, chatHistory: updatedChatHistory } : p));

        try {
            const critique = await generateCritique(activeProject.files);
            const modelMessage: ChatMessage = { role: 'model', content: critique };
            await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory, modelMessage] });
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', content: t('chat.critiqueError') };
            await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory, errorMessage] });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Editor & Preview ---
    const handleFileSelect = (fileName: string) => setSelectedFile(fileName);
    
    // New handler to also switch to code view
    const handleFileSelectFromChat = (fileName: string) => {
        setSelectedFile(fileName);
        setActiveTab('code');
    };

    const handleFileContentChange = async (fileName: string, newContent: string) => {
        if (!activeProject) return;
        const newFiles = activeProject.files.map(f => f.name === fileName ? { ...f, content: newContent } : f);
        const projectWithNewHistory = updateProjectHistory(activeProject, newFiles);
        // Optimistic update of local state before Firestore call
        setProjects(projects.map(p => p.id === activeProjectId ? { ...projectWithNewHistory, files: newFiles } : p));
        await updateProject(activeProjectId, { files: newFiles, previewHistory: projectWithNewHistory.previewHistory });
    };
    const refreshPreview = () => setPreviewRefreshKey(k => k + 1);
    
    const handleIframeNavigation = React.useCallback((event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return;
        const { type, path } = event.data;
        if (type === 'navigate' && path && activeProject?.files.some(f => f.name === path)) {
            setPreviewPath(path);
            refreshPreview();
        }
    }, [activeProject]);

    React.useEffect(() => {
        window.addEventListener('message', handleIframeNavigation);
        return () => window.removeEventListener('message', handleIframeNavigation);
    }, [handleIframeNavigation]);
    
    const handleUndo = async () => {
        if (!activeProject || !canUndo) return;
        const history = activeProject.previewHistory;
        const newPosition = history.position - 1;
        const newFiles = JSON.parse(history.stack[newPosition]);
        const newHistory = { ...history, position: newPosition };
        await updateProject(activeProjectId, { files: newFiles, previewHistory: newHistory });
        // Listener will update state
    };
    
    const handleRedo = async () => {
        if (!activeProject || !canRedo) return;
        const history = activeProject.previewHistory;
        const newPosition = history.position + 1;
        const newFiles = JSON.parse(history.stack[newPosition]);
        const newHistory = { ...history, position: newPosition };
        await updateProject(activeProjectId, { files: newFiles, previewHistory: newHistory });
         // Listener will update state
    };
    
    // --- View Navigation & Data Handlers ---
    const handleCloneProject = async (projectToClone: MarketplaceProject) => {
        if (!user) return;
        const oldPerms = projectToClone.shareData?.permissions as any;
        const newPerms = projectToClone.shareData?.permissions;
    
        let includeChat = (newPerms?.clonePermission === 'files_and_chat') || (oldPerms?.allowPreview && oldPerms?.allowChat);

        try {
            // Fix: Pass the translation function `t` to `cloneMarketplaceProject`.
            await cloneMarketplaceProject(projectToClone, { includeChat }, t);
            showToast(t('toasts.projectCloned'));
            // Listener will update projects
            setView('editor');
        } catch (error) { showToast(t('toasts.cloneProjectError')); }
    };
    
    const handleViewUserProfile = (userId: string) => { setProfileUserId(userId); setView('user_profile'); };
    const handleViewMyProfile = () => { setView('my_profile'); setIsDrawerOpen(false); };
    const handleViewMarketplaceProject = (project: MarketplaceProject) => { setMarketplaceProjectToShow(project); setView('marketplace_viewer'); };
    const handleViewSettings = () => { setView('settings'); setIsDrawerOpen(false); };
    
    // Custom marketplace view handler
    const handleViewMarketplace = () => {
        // This seems to be a custom event for the parent environment.
        // Assuming it's a window method.
        if ((window as any)._marketplace_view) {
            (window as any)._marketplace_view();
        } else {
            // Fallback for local development
            setView('marketplace');
        }
    };

    // --- Utilities ---
    const handleDownload = async () => {
        if (!activeProject) return;
        const zip = new JSZip();
        activeProject.files.forEach((file: ProjectFile) => zip.file(file.name, file.content));
        saveAs(await zip.generateAsync({ type: 'blob' }), `${activeProject.name.replace(/\s+/g, '_')}.zip`);
    };

    // --- RTL Layout Panes ---
    const chatPane = (
      <Allotment.Pane preferredSize={400} minSize={350} visible={!isFullScreen}>
          <ChatPanel 
              messages={activeProject?.chatHistory || []} 
              isLoading={isLoading} 
              onSubmit={handleSubmitPrompt} 
              onSuggestionClick={handleSubmitPrompt} 
              onFileSelect={handleFileSelectFromChat} 
              activeProjectName={activeProject?.name || '...'} 
              onOpenDrawerRequest={() => setIsDrawerOpen(true)} 
              onLogout={handleLogout} 
              userEmail={user?.email || null} 
              isChatDisabled={!activeProject} 
              onCritiqueRequest={handleCritiqueRequest}
              onStopGeneration={handleStopGeneration} 
          />
      </Allotment.Pane>
    );

    const editorPane = (
      <Allotment.Pane>
          <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800">
                  <div className={`h-full w-full ${(!isFullScreen && activeTab === 'code') ? 'block' : 'hidden'}`}>
                      <Workspace 
                          files={activeProject?.files || []} 
                          onFileSelect={handleFileSelect} 
                          selectedFile={selectedFile} 
                          onFileContentChange={handleFileContentChange} 
                      />
                  </div>
                  <div className={`h-full w-full ${ (isFullScreen || activeTab === 'preview') ? 'block' : 'hidden'}`}>
                      <Preview 
                          files={activeProject?.files || []} 
                          currentPath={previewPath} 
                          iframeRef={iframeRef} 
                          refreshKey={previewRefreshKey} 
                          isMobile={isPreviewMobile} 
                      />
                  </div>
              </div>
          </div>
      </Allotment.Pane>
    );


    if (!authInitialized) return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><LoadingSpinner className="w-8 h-8" /></div>;
    if (!user) return <Login onLogin={handleLogin} onSignUp={handleSignUp} />;
    if (isAdmin) return <AdminPanel onLogout={handleLogout} />;
    if (view === 'marketplace') return <Marketplace onViewProject={handleViewMarketplaceProject} onExit={() => setView('editor')} onViewProfile={handleViewUserProfile} />;
    if (view === 'marketplace_viewer' && marketplaceProjectToShow) return <MarketplaceProjectViewer project={marketplaceProjectToShow} onBack={() => setView('marketplace')} onClone={handleCloneProject} onViewProfile={handleViewUserProfile} showToast={showToast} />;
    if (view === 'user_profile' && profileUserId) return <UserProfile userId={profileUserId} onViewProject={handleViewMarketplaceProject} onBack={() => setView('marketplace')} />;
    if (view === 'my_profile') return <MyProfile onBack={() => setView('editor')} showToast={showToast} />;
    if (view === 'settings') return <SettingsPage onBack={() => setView('editor')} showToast={showToast} />;


    return (
        <>
            {activeAnnouncement && (
                <div className="bg-blue-600 text-white text-center p-2 text-sm relative z-50">
                    <span>{activeAnnouncement.message}</span>
                    <button onClick={handleDismissAnnouncement} className="absolute end-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
            <main className={`flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${activeAnnouncement ? 'h-[calc(100vh-32px)]' : 'h-screen'}`}>
                {user && (
                    <ProjectsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} projects={projects} activeProjectId={activeProjectId} onSelectProject={handleSelectProject} onNewProject={handleNewProject} onDeleteProject={handleDeleteProject} onRenameProject={handleRenameProject} onShareProject={setProjectForCollaborationModal} onViewMyProfile={handleViewMyProfile} currentTheme={theme} onSetTheme={setTheme} onViewSettings={handleViewSettings} currentUser={user} />
                )}
                {projectForCollaborationModal && user && <CollaborationModal isOpen={true} onClose={() => setProjectForCollaborationModal(null)} project={projectForCollaborationModal} currentUser={user} onInvite={inviteUserToProject} onRemove={removeCollaborator} showToast={showToast} />}
                {projectForPublishModal && user && <ShareProjectModal isOpen={true} onClose={() => setProjectForPublishModal(null)} project={projectForPublishModal} showToast={showToast} />}
                {isIntroModalOpen && user && <DeveloperIntroModal isOpen={isIntroModalOpen} onClose={() => setIsIntroModalOpen(false)} userName={user.email.split('@')[0]} />}
                {user && <ProjectChatPanel isOpen={isProjectChatOpen} onClose={() => setIsProjectChatOpen(false)} project={activeProject} currentUser={user} />}
                
                <AppHeader
                    onDownload={handleDownload}
                    onShowIntro={() => setIsIntroModalOpen(true)}
                    isFullScreen={isFullScreen}
                    isMobilePreview={isPreviewMobile}
                    toggleFullScreen={() => setIsFullScreen(p => !p)}
                    toggleMobilePreview={() => setIsPreviewMobile(p => !p)}
                    invitations={invitations}
                    notifications={notifications}
                    onRespondToInvitation={handleInvitationResponse}
                    onPublish={() => activeProject && setProjectForPublishModal(activeProject)}
                    onCollaborate={() => activeProject && setProjectForCollaborationModal(activeProject)}
                    onToggleProjectChat={() => setIsProjectChatOpen(p => !p)}
                    isActionDisabled={!activeProject}
                    onMarkNotificationAsRead={handleMarkNotificationAsRead}
                    onMarkAllNotificationsAsRead={handleMarkAllAsRead}
                    onViewMarketplace={handleViewMarketplace}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onRefresh={refreshPreview}
                    previewPath={previewPath}
                    onSetPreviewPath={setPreviewPath}
                    projectFiles={activeProject?.files || []}
                />
                
                <div className="flex-1 min-h-0">
                    <Allotment>
                      {language === 'ar' ? editorPane : chatPane}
                      {language === 'ar' ? chatPane : editorPane}
                    </Allotment>
                </div>
            </main>
            {toastMessage && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-200 text-gray-50 dark:text-gray-900 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in-scale">{toastMessage}</div>}
             <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: translateX(-50%) scale(0.9); }
                    to { opacity: 1; transform: translateX(-50%) scale(1); }
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.3s ease-out forwards;
                }
           `}</style>
        </>
    );
};

const App: React.FC = () => {
    const getInitialLanguage = (): Language => (localStorage.getItem('language') as Language) || 'ar';
    
    const [language, setLanguage] = React.useState<Language>(getInitialLanguage);
    const [translations, setTranslations] = React.useState<any>(() => translationsMap[getInitialLanguage()]);
    
    React.useEffect(() => {
        setTranslations(translationsMap[language]);
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('language', language);
    }, [language]);

    const t = React.useCallback((key: string, replacements?: { [key: string]: string }): string => {
        const keys = key.split('.');
        let result: any = translations;
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                return key;
            }
        }
        
        let strResult = String(result || key);
        
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                strResult = strResult.replace(`{${rKey}}`, replacements[rKey]);
            });
        }

        return strResult;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            <AppContent />
        </LanguageContext.Provider>
    );
};


export default App;