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


import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, InformationCircleIcon, StoreIcon, LoadingSpinner, BellIcon, ShareIcon, UsersIcon, XMarkIcon } from './components/icons';

import { generateCode, generateCritique } from './services/geminiService';
import { AuthResponse, signIn, signUp, logOut, onAuthChange } from './services/authService';
import { onProjectsSnapshot, saveProject, deleteProject, updateProject, submitProjectForReview, cloneMarketplaceProject, inviteUserToProject, onInvitationsSnapshot, respondToInvitation, removeCollaborator, onNotificationsSnapshot, markNotificationAsRead, markAllNotificationsAsRead, getActiveAnnouncements } from './services/firebaseService';

import { Project, ChatMessage, UserCredentials, ProjectFile, MarketplaceProject, ShareData, ProjectInvitation, Notification, Announcement } from './types';
import { createNewProject } from './constants';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Allotment } from 'allotment';


type AppView = 'editor' | 'marketplace' | 'marketplace_viewer' | 'user_profile' | 'my_profile' | 'settings';
type AppTheme = 'light' | 'dark';

const AppHeader: React.FC<{
    onViewMarketplace: () => void;
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
    onMarkNotificationAsRead: (id: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    isActionDisabled: boolean;
}> = ({
    onViewMarketplace, onShowIntro, onDownload,
    toggleMobilePreview, isMobilePreview,
    toggleFullScreen, isFullScreen,
    invitations, notifications, onRespondToInvitation,
    onPublish, onCollaborate,
    onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
    isActionDisabled
}) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const invitationCount = invitations.length;
    const totalNotifications = unreadCount + invitationCount;

    return (
        <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end pr-4 h-[49px] gap-2">
            <button
                onClick={onViewMarketplace}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
                title="Marketplace"
            >
                <StoreIcon className="w-5 h-5" />
                <span>المتجر</span>
            </button>
            <button onClick={onShowIntro} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title="About Developer"><InformationCircleIcon className="w-5 h-5" /></button>
            <button
                onClick={onPublish}
                disabled={isActionDisabled}
                className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Publish to Marketplace"
            >
                <ShareIcon className="w-5 h-5" />
            </button>
             <button
                onClick={onCollaborate}
                disabled={isActionDisabled}
                className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Share & Collaborate"
            >
                <UsersIcon className="w-5 h-5" />
            </button>
            <button onClick={onDownload} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title="Download Project"><ArrowDownTrayIcon className="w-5 h-5" /></button>
            
            <div className="relative border-l border-gray-200 dark:border-gray-700 ml-2 pl-2">
                <button onClick={() => setIsNotificationsOpen(p => !p)} className="p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title="Notifications">
                    <BellIcon className="w-5 h-5" />
                    {totalNotifications > 0 && <span className="absolute top-1 right-1 block h-4 w-4 text-xs flex items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-gray-100 dark:ring-gray-800">{totalNotifications}</span>}
                </button>
                 {isNotificationsOpen && (
                    <NotificationsPanel
                        invitations={invitations}
                        notifications={notifications}
                        onRespond={onRespondToInvitation}
                        onClose={() => setIsNotificationsOpen(false)}
                        onMarkAsRead={onMarkNotificationAsRead}
                        // Fix: Corrected typo in prop name. Should be `onMarkAllNotificationsAsRead`.
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                    />
                )}
            </div>

            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                <button onClick={toggleMobilePreview} className={`p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 ${isMobilePreview ? 'text-blue-500 dark:text-blue-400' : ''}`} title="Mobile View"><DevicePhoneMobileIcon className="w-5 h-5" /></button>
                <button onClick={toggleFullScreen} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title={isFullScreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}>{isFullScreen ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}</button>
            </div>
        </header>
    )
}

const App: React.FC = () => {
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
    const [isIntroModalOpen, setIsIntroModalOpen] = React.useState(false);
    const [projectForCollaborationModal, setProjectForCollaborationModal] = React.useState<Project | null>(null);
    const [projectForPublishModal, setProjectForPublishModal] = React.useState<Project | null>(null);
    
    // --- Editor/Preview State ---
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [previewPath, setPreviewPath] = React.useState<string | null>('index.html');
    const [previewRefreshKey, setPreviewRefreshKey] = React.useState(0);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [activeTab, setActiveTab] = React.useState<'code' | 'preview'>('preview');
    const [isPreviewFullScreen, setIsPreviewFullScreen] = React.useState(false);
    const [isPreviewMobile, setIsPreviewMobile] = React.useState(false);
    const [marketplaceProjectToShow, setMarketplaceProjectToShow] = React.useState<MarketplaceProject | null>(null);
    const [profileUserId, setProfileUserId] = React.useState<string | null>(null);

    // --- Derived State ---
    const activeProject = projects.find(p => p.id === activeProjectId) ?? null;
    
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
                showToast("The active project was deleted or you were removed from it.");
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
    }, [user, activeProjectId, projects.length]);

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
            showToast(accept ? "Invitation accepted!" : "Invitation declined.");
        } catch (error: any) {
            showToast(error.message || "Failed to respond to invitation.");
        }
    };
    
    const handleMarkNotificationAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

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
        const newProjectName = `Project ${projects.length + 1}`;
        const newProject = createNewProject(newProjectName, user.uid, user.email);
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
        if (projects.length <= 1) return showToast("Cannot delete the only project.");
        try {
            await deleteProject(id);
            // Listener will update the projects list.
        } catch (error: any) {
            showToast(error.message || "Failed to delete project.");
        }
    };

    const handleRenameProject = async (id: string, newName: string) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
        await updateProject(id, { name: newName });
    };

    // --- Core AI Interaction ---
    const handleSubmitPrompt = async (prompt: string) => {
        if (!activeProject) return;
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', content: prompt };
        const updatedChatHistory = [...activeProject.chatHistory, userMessage];
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, chatHistory: updatedChatHistory } : p));

        try {
            const response = await generateCode(prompt, activeProject.files, activeProject.chatHistory);
            
            let modelContent = '';
            const { answer, plan, summary, footer } = response.responseMessage;

            if (answer) {
                modelContent = answer;
            } else if (plan && summary) {
                modelContent = `${plan}\n\n${summary}`;
            }

            if (footer) {
                modelContent += `\n\n---\n*${footer}*`;
            }
            
            const modelMessage: ChatMessage = { 
                role: 'model', 
                content: modelContent, 
                suggestions: response.responseMessage.suggestions 
            };

            const finalChatHistory = [...updatedChatHistory, modelMessage];

            await updateProject(activeProjectId, { files: response.files, chatHistory: finalChatHistory });
            // The listener will update the local state from Firestore
            
            // Only refresh preview if files were actually changed
            if (!answer) {
                 refreshPreview();
            }

        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', content: "Sorry, an error occurred. Please try again." };
            await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory, errorMessage] });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCritiqueRequest = async () => {
        if (!activeProject) return;
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', content: "[Requested Design & Accessibility Critique]" };
        const updatedChatHistory = [...activeProject.chatHistory, userMessage];
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, chatHistory: updatedChatHistory } : p));

        try {
            const critique = await generateCritique(activeProject.files);
            const modelMessage: ChatMessage = { role: 'model', content: critique };
            await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory, modelMessage] });
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', content: "Sorry, an error occurred while generating the critique." };
            await updateProject(activeProjectId, { chatHistory: [...updatedChatHistory, errorMessage] });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Editor & Preview ---
    const handleFileSelect = (fileName: string) => setSelectedFile(fileName);
    const handleFileContentChange = async (fileName: string, newContent: string) => {
        if (!activeProject) return;
        const newFiles = activeProject.files.map(f => f.name === fileName ? { ...f, content: newContent } : f);
        setProjects(projects.map(p => p.id === activeProjectId ? { ...p, files: newFiles } : p));
        await updateProject(activeProjectId, { files: newFiles });
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
    
    const handleUndo = () => {}; // Undo/Redo is complex with collaboration and needs a new approach (e.g., CRDTs). Disabled for now.
    const handleRedo = () => {};
    
    // --- View Navigation & Data Handlers ---
    const handleCloneProject = async (projectToClone: MarketplaceProject) => {
        if (!user) return;
        const oldPerms = projectToClone.shareData?.permissions as any;
        const newPerms = projectToClone.shareData?.permissions;
    
        let includeChat = (newPerms?.clonePermission === 'files_and_chat') || (oldPerms?.allowPreview && oldPerms?.allowChat);

        try {
            await cloneMarketplaceProject(projectToClone, { includeChat });
            showToast("Project cloned successfully!");
            // Listener will update projects
            setView('editor');
        } catch (error) { showToast("Failed to clone project."); }
    };
    
    const handleViewUserProfile = (userId: string) => { setProfileUserId(userId); setView('user_profile'); };
    const handleViewMyProfile = () => { setView('my_profile'); setIsDrawerOpen(false); };
    const handleViewMarketplaceProject = (project: MarketplaceProject) => { setMarketplaceProjectToShow(project); setView('marketplace_viewer'); };
    const handleViewSettings = () => { setView('settings'); setIsDrawerOpen(false); };

    // --- Utilities ---
    const handleDownload = async () => {
        if (!activeProject) return;
        const zip = new JSZip();
        activeProject.files.forEach((file: ProjectFile) => zip.file(file.name, file.content));
        saveAs(await zip.generateAsync({ type: 'blob' }), `${activeProject.name.replace(/\s+/g, '_')}.zip`);
    };

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
                    <button onClick={handleDismissAnnouncement} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
            <main className={`flex bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${activeAnnouncement ? 'h-[calc(100vh-32px)]' : 'h-screen'}`}>
                {user && (
                    <ProjectsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} projects={projects} activeProjectId={activeProjectId} onSelectProject={handleSelectProject} onNewProject={handleNewProject} onDeleteProject={handleDeleteProject} onRenameProject={handleRenameProject} onShareProject={setProjectForCollaborationModal} onViewMyProfile={handleViewMyProfile} currentTheme={theme} onSetTheme={setTheme} onViewSettings={handleViewSettings} currentUser={user} />
                )}
                {projectForCollaborationModal && user && <CollaborationModal isOpen={true} onClose={() => setProjectForCollaborationModal(null)} project={projectForCollaborationModal} currentUser={user} onInvite={inviteUserToProject} onRemove={removeCollaborator} showToast={showToast} />}
                {projectForPublishModal && user && <ShareProjectModal isOpen={true} onClose={() => setProjectForPublishModal(null)} project={projectForPublishModal} showToast={showToast} />}
                <DeveloperIntroModal isOpen={isIntroModalOpen} onClose={() => setIsIntroModalOpen(false)} userName={user.email.split('@')[0]} />
                
                <div className={`w-[30%] max-w-[500px] min-w-[350px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 ${isPreviewFullScreen ? 'hidden' : 'flex'}`}>
                    <ChatPanel messages={activeProject?.chatHistory || []} isLoading={isLoading} onSubmit={handleSubmitPrompt} onSuggestionClick={handleSubmitPrompt} activeProjectName={activeProject?.name || '...'} onOpenDrawerRequest={() => setIsDrawerOpen(true)} onLogout={handleLogout} userEmail={user.email} isChatDisabled={!activeProject} onCritiqueRequest={handleCritiqueRequest} />
                </div>
                
                <div className={`flex-1 flex flex-col min-w-0 ${isPreviewFullScreen ? 'fixed inset-0 z-40' : ''}`}>
                    <AppHeader
                        onDownload={handleDownload}
                        onShowIntro={() => setIsIntroModalOpen(true)}
                        onViewMarketplace={() => setView('marketplace')}
                        isFullScreen={isPreviewFullScreen}
                        isMobilePreview={isPreviewMobile}
                        toggleFullScreen={() => setIsPreviewFullScreen(p => !p)}
                        toggleMobilePreview={() => setIsPreviewMobile(p => !p)}
                        invitations={invitations}
                        notifications={notifications}
                        onRespondToInvitation={handleInvitationResponse}
                        onPublish={() => activeProject && setProjectForPublishModal(activeProject)}
                        onCollaborate={() => activeProject && setProjectForCollaborationModal(activeProject)}
                        isActionDisabled={!activeProject}
                        onMarkNotificationAsRead={handleMarkNotificationAsRead}
                        onMarkAllNotificationsAsRead={handleMarkAllAsRead}
                    />
                    
                    <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between pr-4 h-[49px]">
                        <div className="flex items-center">
                            <div className="flex items-center p-2">
                                <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-sm rounded-l-md transition-colors ${activeTab === 'code' && !isPreviewFullScreen ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Code</button>
                                <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-sm rounded-r-md transition-colors ${activeTab === 'preview' || isPreviewFullScreen ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Preview</button>
                            </div>
                        </div>
                        {(activeTab === 'preview' || isPreviewFullScreen) && (
                            <div className="flex items-center gap-4 flex-grow justify-center">
                                <div className="flex items-center gap-1">
                                    <button onClick={handleUndo} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50" disabled title="Undo (Coming Soon)"><ArrowLeftIcon className="w-4 h-4" /></button>
                                    <button onClick={handleRedo} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50" disabled title="Redo (Coming Soon)"><ArrowRightIcon className="w-4 h-4" /></button>
                                    <button onClick={refreshPreview} className="p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700" title="Refresh"><RefreshIcon className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 bg-white dark:bg-gray-900 rounded-md px-3 py-1 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs text-center border border-gray-200 dark:border-gray-700">{previewPath || '...'}</div>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {/* Placeholder to keep layout consistent */}
                        </div>
                    </header>
                    <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800">
                         <Allotment defaultSizes={[300, 700]}>
                            <Allotment.Pane minSize={200} preferredSize="30%" visible={activeTab === 'code' && !isPreviewFullScreen}>
                                <Workspace files={activeProject?.files || []} onFileSelect={handleFileSelect} selectedFile={selectedFile} onFileContentChange={handleFileContentChange} />
                            </Allotment.Pane>
                            <Allotment.Pane minSize={300} visible={activeTab === 'preview' || isPreviewFullScreen}>
                                <Preview files={activeProject?.files || []} currentPath={previewPath} iframeRef={iframeRef} refreshKey={previewRefreshKey} isMobile={isPreviewMobile} />
                            </Allotment.Pane>
                        </Allotment>
                    </div>
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

export default App;
