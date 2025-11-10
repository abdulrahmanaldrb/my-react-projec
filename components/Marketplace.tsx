// components/Marketplace.tsx
import * as React from 'react';
import { getMarketplaceProjects, getUserProfile, getProjectsByCreatorId } from '../services/firebaseService';
import { auth } from '../firebaseConfig';
import { MarketplaceProject } from '../types';
import { LoadingSpinner, ArrowLeftIcon, FolderIcon, StarIcon, ArrowRightIcon, ArrowDownTrayIcon, CheckBadgeIcon } from './icons';
import { PROJECT_CATEGORIES } from '../constants';
import { useLanguage } from '../App';

interface MarketplaceProps {
    onViewProject: (project: MarketplaceProject) => void;
    onExit: () => void;
    onViewProfile: (userId: string) => void;
}

const anonymizeEmail = (email: string) => {
    if (!email) return 'anonymous';
    const [user, domain] = email.split('@');
    return `${user.substring(0, 2)}***@${domain}`;
};

type CreatorProfile = { displayName?: string; photoURL?: string; isVerified?: boolean };

const ProjectCard: React.FC<{project: MarketplaceProject, onViewProject: (p: MarketplaceProject) => void, onViewProfile: (id: string) => void, creator?: CreatorProfile}> = ({ project, onViewProject, onViewProfile, creator }) => {
    const { t } = useLanguage();
    const displayName = creator?.displayName || anonymizeEmail(project.creatorEmail);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col justify-between border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all duration-300 h-full transform hover:-translate-y-1 group overflow-hidden">
            {project.coverImage && (
              <div className="w-full bg-gray-200 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
                <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex flex-col flex-grow">
                <div>
                    <div className="flex items-start gap-3 mb-2">
                        <FolderIcon className="w-6 h-6 text-green-500 dark:text-green-400 mt-1 flex-shrink-0"/>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{project.name}</h3>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onViewProfile(project.creatorId); }} className="text-xs text-gray-500 dark:text-gray-500 mb-3 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-2">
                        {creator?.photoURL ? (
                            <img src={creator.photoURL} alt={displayName} className="w-5 h-5 rounded-full object-cover border border-gray-300 dark:border-gray-600" />
                        ) : null}
                        <span className="hover:underline">{displayName}</span>
                        {(project.creatorIsVerified || creator?.isVerified) && <CheckBadgeIcon className="w-4 h-4 text-blue-500" title={t('marketplace.verifiedCreator')} />}
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 h-10">{project.shareData?.description}</p>
                    <span className="text-xs font-medium bg-purple-100 dark:bg-purple-600/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">{project.shareData?.category}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
                    <div className="flex items-center gap-1" title={t('marketplace.ratingTitle')}>
                        <StarIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                        <span>{project.averageRating?.toFixed(1) || 'N/A'} ({project.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center gap-1" title={t('marketplace.downloadsTitle')}>
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>{project.downloads || 0}</span>
                    </div>
                </div>
            </div>
            <button 
                onClick={() => onViewProject(project)}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm bg-blue-600 text-white group-hover:bg-blue-700 rounded-t-none transition-colors font-semibold"
            >
                {t('marketplace.explore')}
            </button>
        </div>
    );
};


const ProjectCarousel: React.FC<{
    title: string;
    projects: MarketplaceProject[];
    onViewProject: (project: MarketplaceProject) => void;
    onViewProfile: (userId: string) => void;
    creators?: Record<string, CreatorProfile | undefined>;
}> = ({ title, projects, onViewProject, onViewProfile, creators }) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    if (projects.length === 0) return null;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    return (
        <div className="mb-12">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => scroll('left')} className="p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700" title={`Scroll ${title} left`}><ArrowLeftIcon className="w-5 h-5" /></button>
                    <button onClick={() => scroll('right')} className="p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700" title={`Scroll ${title} right`}><ArrowRightIcon className="w-5 h-5" /></button>
                </div>
            </div>
            <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                {projects.map(project => (
                     <div key={project.id} className="flex-shrink-0 w-80" style={{ scrollSnapAlign: 'start' }}>
                        <ProjectCard project={project} onViewProject={onViewProject} onViewProfile={onViewProfile} creator={creators?.[project.creatorId]} />
                    </div>
                ))}
            </div>
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};


const Marketplace: React.FC<MarketplaceProps> = ({ onViewProject, onExit, onViewProfile }) => {
    const { t } = useLanguage();
    const [projects, setProjects] = React.useState<MarketplaceProject[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('All');
    const [activeTab, setActiveTab] = React.useState<'discover' | 'browse' | 'my'>('discover');
    const [creators, setCreators] = React.useState<Record<string, CreatorProfile>>({});
    const [myProjects, setMyProjects] = React.useState<MarketplaceProject[]>([]);
    
    React.useEffect(() => {
        const fetchProjects = async () => {
            try {
                const fetchedProjects = await getMarketplaceProjects();
                setProjects(fetchedProjects);
                // Load unique creators' profiles
                const ids = Array.from(new Set(fetchedProjects.map(p => p.creatorId).filter(Boolean)));
                const entries = await Promise.all(ids.map(async id => {
                    try {
                        const prof = await getUserProfile(id);
                        return [id, { displayName: prof?.displayName || [prof?.firstName, prof?.lastName].filter(Boolean).join(' ') || '', photoURL: prof?.photoURL, isVerified: !!prof?.isVerified }] as const;
                    } catch { return [id, { }] as const; }
                }));
                setCreators(Object.fromEntries(entries));
            } catch (err) {
                setError("Failed to load marketplace projects.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // Load "My Store" projects for current user
    React.useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) { setMyProjects([]); return; }
        const loadMine = async () => {
            try {
                const mine = await getProjectsByCreatorId(uid);
                setMyProjects(mine);
            } catch (e) { /* ignore */ }
        };
        loadMine();
    }, [auth.currentUser?.uid]);
    
    const featuredProjects = React.useMemo(() => projects.filter(p => p.isFeatured), [projects]);

    const highestRated = React.useMemo(() => 
        [...projects].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 10), 
    [projects]);
    
    const mostRecent = React.useMemo(() => 
        [...projects].sort((a, b) => (b.approvedAt?.toMillis ? b.approvedAt.toMillis() : 0) - (a.approvedAt?.toMillis ? a.approvedAt.toMillis() : 0)).slice(0, 10),
    [projects]);

    const mostDownloaded = React.useMemo(() => 
        [...projects].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 10),
    [projects]);
    
    const filteredProjects = React.useMemo(() => {
        return projects.filter(p => {
            const matchesCategory = categoryFilter === 'All' || p.shareData?.category === categoryFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  p.shareData?.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [projects, searchTerm, categoryFilter]);

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white flex flex-col">
            <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>{t('marketplace.backToEditor')}</span>
                    </button>
                    <h1 className="text-xl font-bold">{t('marketplace.title')}</h1>
                </div>
                <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-sm">
                    <button onClick={() => setActiveTab('discover')} className={`px-4 py-1 rounded-md transition-colors ${activeTab === 'discover' ? 'bg-blue-600 text-white' : 'dark:text-gray-300'}`}>
                        {t('marketplace.discover')}
                    </button>
                    <button onClick={() => setActiveTab('browse')} className={`px-4 py-1 rounded-md transition-colors ${activeTab === 'browse' ? 'bg-blue-600 text-white' : 'dark:text-gray-300'}`}>
                        {t('marketplace.browseAll')}
                    </button>
                    <button onClick={() => setActiveTab('my')} className={`px-4 py-1 rounded-md transition-colors ${activeTab === 'my' ? 'bg-blue-600 text-white' : 'dark:text-gray-300'}`}>
                        {t('marketplace.myStore')}
                    </button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64"><LoadingSpinner className="w-8 h-8" /></div>
                ) : error ? (
                    <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md">{error}</div>
                ) : (
                    <>
                        {activeTab === 'discover' && (
                            <div>
                                <ProjectCarousel title={t('marketplace.featured')} projects={featuredProjects} onViewProject={onViewProject} onViewProfile={onViewProfile} creators={creators} />
                                <ProjectCarousel title={t('marketplace.highestRated')} projects={highestRated} onViewProject={onViewProject} onViewProfile={onViewProfile} creators={creators} />
                                <ProjectCarousel title={t('marketplace.mostDownloaded')} projects={mostDownloaded} onViewProject={onViewProject} onViewProfile={onViewProfile} creators={creators} />
                                <ProjectCarousel title={t('marketplace.mostRecent')} projects={mostRecent} onViewProject={onViewProject} onViewProfile={onViewProfile} creators={creators} />
                            </div>
                        )}

                        {activeTab === 'my' && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                                <h2 className="text-2xl font-bold mb-4">{t('marketplace.myPublished')}</h2>
                                {!auth.currentUser ? (
                                    <div className="text-center text-gray-500 bg-white dark:bg-gray-800 p-8 rounded-md border border-gray-200 dark:border-gray-700">{t('marketplace.loginToSee')}</div>
                                ) : myProjects.length === 0 ? (
                                    <div className="text-center text-gray-500 bg-white dark:bg-gray-800 p-8 rounded-md border border-gray-200 dark:border-gray-700">{t('marketplace.noPublished')}</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {myProjects.map(project => (
                                            <ProjectCard key={project.id} project={project} onViewProject={onViewProject} onViewProfile={onViewProfile} creator={creators[project.creatorId]} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'browse' && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                                <h2 className="text-2xl font-bold mb-4">{t('marketplace.allProjects')}</h2>
                                <div className="mb-6 flex flex-col md:flex-row gap-4">
                                    <input
                                        type="text"
                                        placeholder={t('marketplace.searchPlaceholder')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-grow bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-700"
                                    />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-700"
                                    >
                                        <option value="All">{t('marketplace.allCategories')}</option>
                                        {PROJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                {filteredProjects.length === 0 ? (
                                    <div className="text-center text-gray-500 bg-white dark:bg-gray-800 p-8 rounded-md border border-gray-200 dark:border-gray-700">{t('marketplace.noResults')}</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredProjects.map(project => (
                                            <ProjectCard key={project.id} project={project} onViewProject={onViewProject} onViewProfile={onViewProfile} creator={creators[project.creatorId]} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default Marketplace;