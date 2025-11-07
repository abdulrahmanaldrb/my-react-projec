// components/AdminProjectViewer.tsx
// A new component for viewing a user's project in the admin panel.

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { Allotment } from 'allotment';
import { Project, ChatMessage, ProjectFile } from '../types';
import { generateCode } from '../services/geminiService';
import { adminUpdateUserProject, approveSubmission, rejectSubmission } from '../services/firebaseService';

import ChatPanel from './ChatPanel';
import Workspace from './Workspace';
import Preview from './Preview';
import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, CheckIcon, XMarkIcon, LoadingSpinner, PencilIcon } from './icons';

import JSZip from 'jszip';
import saveAs from 'file-saver';

interface AdminProjectViewerProps {
    project: Project;
    userId: string;
    userEmail: string;
    onBack: () => void;
    isApprovalMode: boolean;
}

const AdminProjectViewer: React.FC<AdminProjectViewerProps> = ({ project, userId, userEmail, onBack, isApprovalMode }) => {
    const [currentProject, setCurrentProject] = React.useState<Project>(project);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isReviewActionLoading, setIsReviewActionLoading] = React.useState(false);
    
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [previewPath, setPreviewPath] = React.useState<string | null>('index.html');
    const [previewRefreshKey, setPreviewRefreshKey] = React.useState(0);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const [activeTab, setActiveTab] = React.useState<'code' | 'preview'>('preview');
    const [isPreviewFullScreen, setIsPreviewFullScreen] = React.useState(false);
    const [isPreviewMobile, setIsPreviewMobile] = React.useState(false);

    const [isEditingName, setIsEditingName] = React.useState(false);
    const [editingName, setEditingName] = React.useState(project.name);

    React.useEffect(() => {
        const indexFile = project.files.find(f => f.name === 'index.html');
        const firstFile = project.files.length > 0 ? project.files[0].name : null;
        const fileToSelect = indexFile ? indexFile.name : firstFile;
        setSelectedFile(fileToSelect);
        setPreviewPath(project.files.some(f => f.name === 'index.html') ? 'index.html' : null);
    }, [project]);
    
    // --- Fullscreen ESC handler ---
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isPreviewFullScreen) {
                setIsPreviewFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPreviewFullScreen]);
    
    const handleNameSave = async () => {
        if (editingName.trim() && editingName.trim() !== currentProject.name) {
            await adminUpdateUserProject(currentProject.id, { name: editingName.trim() });
            setCurrentProject(p => ({ ...p, name: editingName.trim() }));
        }
        setIsEditingName(false);
    };

    const handleFileContentChange = async (fileName: string, newContent: string) => {
        const newFiles = currentProject.files.map(f => f.name === fileName ? { ...f, content: newContent } : f);
        setCurrentProject(p => ({ ...p, files: newFiles }));
        await adminUpdateUserProject(currentProject.id, { files: newFiles });
    };

    const handleSubmitPrompt = async (prompt: string) => {
        setIsLoading(true);
        const userMessage: ChatMessage = { role: 'user', content: `(Admin) ${prompt}` };
        
        const optimisticChatHistory = [...currentProject.chatHistory, userMessage];
        setCurrentProject(p => ({ ...p, chatHistory: optimisticChatHistory }));

        try {
            const response = await generateCode(prompt, currentProject.files, currentProject.chatHistory);
            
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
                suggestions: response.responseMessage.suggestions,
            };
            
            const finalProjectState = {
                ...currentProject,
                files: response.files,
                chatHistory: [...optimisticChatHistory, modelMessage],
            };
            
            await adminUpdateUserProject(currentProject.id, { 
                files: response.files, 
                chatHistory: finalProjectState.chatHistory 
            });
            setCurrentProject(finalProjectState);

        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = {
                role: 'model',
                content: "An error occurred while processing the request.",
            };
            const finalChatHistory = [...optimisticChatHistory, errorMessage];
            setCurrentProject(p => ({ ...p, chatHistory: finalChatHistory }));
            await adminUpdateUserProject(currentProject.id, { chatHistory: finalChatHistory });
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleDownload = async () => {
        const zip = new JSZip();
        currentProject.files.forEach((file: ProjectFile) => {
            zip.file(file.name, file.content);
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${currentProject.name.replace(/\s+/g, '_')}.zip`);
    };
    
    const handleApproval = async () => {
        setIsReviewActionLoading(true);
        try {
            // Fix: Removed extra userId argument to match approveSubmission signature.
            await approveSubmission(currentProject);
            onBack();
        } catch (error) {
            console.error("Failed to approve submission", error);
        } finally {
            setIsReviewActionLoading(false);
        }
    };
    
    const handleRejection = async () => {
        setIsReviewActionLoading(true);
        try {
            // Fix: Removed extra userId argument to match rejectSubmission signature.
            await rejectSubmission(currentProject.id);
            onBack();
        } catch (error) {
            console.error("Failed to reject submission", error);
        } finally {
            setIsReviewActionLoading(false);
        }
    };

    const refreshPreview = () => setPreviewRefreshKey(k => k + 1);

    return (
        <main className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className={`w-[30%] max-w-[500px] min-w-[350px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 ${isPreviewFullScreen ? 'hidden' : 'flex'}`}>
                <ChatPanel
                    messages={currentProject.chatHistory}
                    isLoading={isLoading}
                    onSubmit={handleSubmitPrompt}
                    onSuggestionClick={handleSubmitPrompt}
                    activeProjectName={currentProject.name}
                    onOpenDrawerRequest={() => {}}
                    onLogout={() => {}} // No-op for admin
                    userEmail={userEmail}
                    isChatDisabled={false}
                    onCritiqueRequest={() => {}}
                />
            </div>
            <div className={`flex-1 flex flex-col min-w-0 ${isPreviewFullScreen ? 'fixed inset-0 z-40' : ''}`}>
                 <header className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between pr-4 h-[49px]">
                    <div className="flex items-center">
                         <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors m-2">
                            <ArrowLeftIcon className="w-4 h-4" />
                            <span>Back</span>
                        </button>
                        <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                            {isEditingName ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleNameSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                                    className="bg-white dark:bg-gray-900 text-md font-semibold px-2 py-0.5 rounded-md border border-blue-500"
                                    autoFocus
                                />
                            ) : (
                                <h2 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={currentProject.name}>{currentProject.name}</h2>
                            )}
                            <button onClick={() => setIsEditingName(p => !p)} className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <PencilIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="flex items-center">
                            <button 
                                onClick={() => setActiveTab('code')}
                                className={`px-4 py-2 text-sm font-medium transition-colors h-[48px] ${activeTab === 'code' && !isPreviewFullScreen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-700/50'}`}
                            >
                                Code
                            </button>
                            <button 
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 text-sm font-medium transition-colors h-[48px] ${(activeTab === 'preview' || isPreviewFullScreen) ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-700/50'}`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>
                    
                    
                    {isApprovalMode ? (
                        <div className="flex items-center gap-2">
                             <button onClick={handleRejection} disabled={isReviewActionLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50">
                                {isReviewActionLoading ? <LoadingSpinner className="w-4 h-4"/> : <XMarkIcon className="w-4 h-4" />}
                                Reject
                            </button>
                             <button onClick={handleApproval} disabled={isReviewActionLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50">
                                {isReviewActionLoading ? <LoadingSpinner className="w-4 h-4"/> : <CheckIcon className="w-4 h-4" />}
                                Approve
                            </button>
                        </div>
                    ) : (
                         <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download
                        </button>
                    )}
                 </header>
                <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800">
                    <Allotment>
                         {(activeTab === 'code' && !isPreviewFullScreen) && (
                            <Allotment.Pane minSize={300}>
                                <Workspace 
                                    files={currentProject?.files || []}
                                    onFileSelect={setSelectedFile}
                                    selectedFile={selectedFile}
                                    onFileContentChange={handleFileContentChange}
                                    readOnly={false}
                                />
                            </Allotment.Pane>
                         )}
                         {(activeTab === 'preview' || isPreviewFullScreen) && (
                            <Allotment.Pane minSize={300}>
                                <Preview 
                                    files={currentProject?.files || []}
                                    currentPath={previewPath}
                                    iframeRef={iframeRef}
                                    refreshKey={previewRefreshKey}
                                    isMobile={isPreviewMobile}
                                />
                             </Allotment.Pane>
                         )}
                    </Allotment>
                </div>
            </div>
        </main>
    );
};

export default AdminProjectViewer;