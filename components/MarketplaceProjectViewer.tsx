// components/MarketplaceProjectViewer.tsx
import * as React from 'react';
import { MarketplaceProject } from '../types';
import Workspace from './Workspace';
import Preview from './Preview';
import ChatPanel from './ChatPanel';
import ReviewsPanel from './ReviewsPanel';
import { ArrowLeftIcon, ArrowDownTrayIcon, PlusIcon, CheckBadgeIcon } from './icons';
import { incrementProjectDownloads } from '../services/firebaseService';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { useLanguage } from '../App';

interface MarketplaceProjectViewerProps {
    project: MarketplaceProject;
    onBack: () => void;
    onClone: (project: MarketplaceProject) => void;
    onViewProfile: (userId: string) => void;
    showToast: (message: string) => void;
}

const MarketplaceProjectViewer: React.FC<MarketplaceProjectViewerProps> = ({ project, onBack, onClone, onViewProfile, showToast }) => {
    const { t } = useLanguage();
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [previewPath, setPreviewPath] = React.useState<string | null>('index.html');
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [activeTab, setActiveTab] = React.useState<'reviews' | 'preview' | 'code' | 'chat'>('reviews');

    const handleFileSelectFromChat = (fileName: string) => {
        setSelectedFile(fileName);
        setActiveTab('code');
    };

    const canDownload = project.shareData?.permissions.allowDownload ?? false;
    
    // Check for new and old permission structures for cloning
    // Fix: Cast permissions to `any` to allow checking for legacy `allowPreview` property for backward compatibility.
    const oldPerms = project.shareData?.permissions as any;
    const canClone = (project.shareData?.permissions.clonePermission !== 'none') || (oldPerms?.allowPreview === true);
    
    React.useEffect(() => {
        const indexFile = project.files.find(f => f.name === 'index.html');
        const firstFile = project.files.length > 0 ? project.files[0].name : null;
        const fileToSelect = indexFile ? indexFile.name : firstFile;
        setSelectedFile(fileToSelect);
        setPreviewPath(project.files.some(f => f.name === 'index.html') ? 'index.html' : null);
        // Default to reviews tab as requested
        setActiveTab('reviews');
    }, [project]);
    
    const handleDownload = async () => {
        try {
            await incrementProjectDownloads(project.id);
        } catch (error) {
            console.error("Failed to increment download count:", error);
            // Non-critical, so we proceed with the download anyway.
        }

        const zip = new JSZip();
        project.files.forEach((file) => {
            zip.file(file.name, file.content);
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${project.name.replace(/\s+/g, '_')}.zip`);
    };

    const anonymizeEmail = (email: string) => {
        if (!email) return 'anonymous';
        const [user, domain] = email.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
    }

    return (
         <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className={`w-[30%] max-w-[500px] min-w-[350px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 ${activeTab !== 'chat' ? 'hidden' : 'flex'}`}>
                <ChatPanel
                    messages={project.chatHistory}
                    isLoading={false}
                    onSubmit={() => {}}
                    onSuggestionClick={() => {}}
                    // Fix: Added missing onFileSelect prop.
                    onFileSelect={handleFileSelectFromChat}
                    activeProjectName={project.name}
                    onOpenDrawerRequest={() => {}}
                    onLogout={() => {}}
                    userEmail={`by ${project.creatorEmail}`}
                    isChatDisabled={true}
                    onCritiqueRequest={() => {}}
                    // Fix: Add missing onStopGeneration prop to ChatPanel.
                    onStopGeneration={() => {}}
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between pr-4 h-[49px]">
                    <div className="flex items-center">
                        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors m-2">
                            <ArrowLeftIcon className="w-4 h-4 shrink-0" />
                            <span>{t('marketplace.viewer.back')}</span>
                        </button>
                         <div className="border-l border-gray-200 dark:border-gray-700 ml-2 pl-4 mr-4">
                            <h2 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={project.name}>{project.name}</h2>
                            <button onClick={() => onViewProfile(project.creatorId)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline flex items-center gap-1">
                                <span>{t('marketplace.by', { email: anonymizeEmail(project.creatorEmail) })}</span>
                                {project.creatorIsVerified && <CheckBadgeIcon className="w-4 h-4 shrink-0 text-blue-500" title={t('marketplace.verifiedCreator')} />}
                            </button>
                        </div>
                        <div className="border-l border-gray-200 dark:border-gray-700 h-full pl-2 flex items-center">
                            <button onClick={() => setActiveTab('reviews')} className={`px-4 py-2 text-sm h-full ${activeTab === 'reviews' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>{t('marketplace.viewer.overviewReviews')}</button>
                            <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 text-sm h-full ${activeTab === 'preview' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>{t('marketplace.viewer.preview')}</button>
                            <button onClick={() => setActiveTab('code')} className={`px-4 py-2 text-sm h-full ${activeTab === 'code' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>{t('marketplace.viewer.code')}</button>
                            <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm h-full ${activeTab === 'chat' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>{t('marketplace.viewer.chat')}</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canDownload && (
                            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md">
                                <ArrowDownTrayIcon className="w-4 h-4 shrink-0" /> {t('marketplace.viewer.download')}
                            </button>
                        )}
                        <button onClick={() => onClone(project)} disabled={!canClone} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                           <PlusIcon className="w-4 h-4 shrink-0" /> {canClone ? t('marketplace.viewer.cloneToMy') : t('marketplace.viewer.cloningNotAllowed')}
                        </button>
                    </div>
                </header>

                <div className="flex-1 min-h-0">
                    <div className={`h-full w-full ${activeTab === 'preview' ? '' : 'hidden'}`}>
                        <Preview files={project.files} currentPath={previewPath} iframeRef={iframeRef} refreshKey={0} isMobile={false} />
                    </div>
                    <div className={`h-full w-full ${activeTab === 'code' ? '' : 'hidden'}`}>
                        <Workspace files={project.files} onFileSelect={setSelectedFile} selectedFile={selectedFile} onFileContentChange={() => {}} readOnly={true} />
                    </div>
                     <div className={`h-full w-full ${activeTab === 'reviews' ? '' : 'hidden'}`}>
                        <ReviewsPanel project={project} showToast={showToast} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketplaceProjectViewer;
