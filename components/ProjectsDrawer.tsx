// components/ProjectsDrawer.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { Project, UserCredentials } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, ShareIcon, ClockIcon, CheckBadgeIcon, UserIcon, SunIcon, MoonIcon, Cog6ToothIcon, UsersIcon } from './icons';

interface ProjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onShareProject: (project: Project) => void;
  onViewMyProfile: () => void;
  currentTheme: 'light' | 'dark';
  onSetTheme: (theme: 'light' | 'dark') => void;
  onViewSettings: () => void;
  currentUser: UserCredentials;
}

const ProjectStatusIcon = ({ status }: { status: 'pending' | 'approved' | 'rejected' | 'none' }) => {
    switch(status) {
        case 'pending':
            return <ClockIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" title="Pending Review"/>
        case 'approved':
            return <CheckBadgeIcon className="w-4 h-4 text-green-500 dark:text-green-400" title="Live in Marketplace"/>
        case 'rejected':
            return <XMarkIcon className="w-4 h-4 text-red-500 dark:text-red-400" title="Submission Rejected"/>
        default:
            return null;
    }
}

const ProjectsDrawer: React.FC<ProjectsDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  onShareProject,
  onViewMyProfile,
  currentTheme,
  onSetTheme,
  onViewSettings,
  currentUser,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleRenameClick = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };
  
  React.useEffect(() => {
    if (editingId && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [editingId]);

  const handleRenameSubmit = () => {
    if (editingId && editingName.trim()) {
      onRenameProject(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

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
        className={`relative flex flex-col h-full w-80 bg-gray-50 dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
            <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" title="Close">
                <XMarkIcon className="w-5 h-5" />
            </button>
        </header>
        
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={onNewProject}
                className="w-full flex items-center justify-center gap-2 p-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
             >
                 <PlusIcon className="w-4 h-4" />
                 New Project
             </button>
        </div>

        <div className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
                {projects.map((project) => {
                    const isOwner = project.ownerId === currentUser.uid;
                    const ownerEmail = project.collaborators[project.ownerId]?.email || '...';
                    return (
                        <div key={project.id} className={`group w-full text-left p-1 rounded-md text-sm flex items-center justify-between ${
                                activeProjectId === project.id ? 'bg-blue-600/20 text-blue-800 dark:text-white dark:bg-blue-600/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}>
                                {editingId === project.id ? (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={handleRenameSubmit}
                                        onKeyDown={handleKeyDown}
                                        className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                ) : (
                                    <button onClick={() => onSelectProject(project.id)} className="flex-grow text-left truncate px-1 flex flex-col">
                                        <div className="flex items-center gap-2">
                                            {project.shareData?.status !== 'none' && <ProjectStatusIcon status={project.shareData?.status || 'none'} />}
                                            <span className="font-medium truncate">{project.name}</span>
                                        </div>
                                        {!isOwner && <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">Shared by {ownerEmail}</span>}
                                    </button>
                                )}

                                <div className="flex items-center flex-shrink-0">
                                    {editingId === project.id ? (
                                        <button onClick={handleRenameSubmit} className="p-1 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"><CheckIcon className="w-4 h-4" /></button>
                                    ) : (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                            <button onClick={() => onShareProject(project)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors" title="Collaborate"><UsersIcon className="w-4 h-4" /></button>
                                            {isOwner && <button onClick={() => handleRenameClick(project)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Rename"><PencilIcon className="w-4 h-4" /></button>}
                                            {isOwner && <button 
                                                onClick={() => onDeleteProject(project.id)} 
                                                disabled={projects.length <= 1}
                                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                                title={projects.length > 1 ? "Delete" : "Cannot delete the only project"}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>}
                                    </div>
                                    )}
                                </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Settings Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50">
             <div className="space-y-1.5">
                <button onClick={onViewMyProfile} className="w-full flex items-center gap-3 text-left p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">My Profile</span>
                </button>
                <button 
                    onClick={() => onSetTheme(currentTheme === 'light' ? 'dark' : 'light')} 
                    className="w-full flex items-center justify-between gap-3 text-left p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {currentTheme === 'dark' ? <MoonIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/> : <SunIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/>}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Theme</span>
                    </div>
                    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 w-[44px]">
                        <div className={`p-1 rounded-full transition-transform duration-300 ${currentTheme === 'dark' ? 'translate-x-full' : ''}`}>
                             {currentTheme === 'light' ? <SunIcon className="w-4 h-4 text-gray-700 bg-white rounded-full p-0.5"/> : <MoonIcon className="w-4 h-4 text-white bg-gray-900 rounded-full p-0.5"/>}
                        </div>
                    </div>
                </button>
                <button onClick={onViewSettings} className="w-full flex items-center gap-3 text-left p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Settings</span>
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsDrawer;