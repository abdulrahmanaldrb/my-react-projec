// components/UserProfile.tsx
import * as React from 'react';
import { getProjectsByCreatorId, getUserProfile } from '../services/firebaseService';
import { MarketplaceProject, UserProfileData } from '../types';
import { LoadingSpinner, ArrowLeftIcon, FolderIcon, StarIcon, UserIcon, CheckBadgeIcon } from './icons';

interface UserProfileProps {
    userId: string;
    onViewProject: (project: MarketplaceProject) => void;
    onBack: () => void;
}

const StarRatingDisplay: React.FC<{ rating: number }> = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
        <div className="flex items-center">
            {[...Array(fullStars)].map((_, i) => (
                <StarIcon key={`full-${i}`} className="w-4 h-4 text-yellow-400" fill="currentColor" />
            ))}
            {[...Array(emptyStars + (halfStar ? 1 : 0))].map((_, i) => (
                 <StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            ))}
        </div>
    )
};

const UserProfile: React.FC<UserProfileProps> = ({ userId, onViewProject, onBack }) => {
    const [projects, setProjects] = React.useState<MarketplaceProject[]>([]);
    const [profileData, setProfileData] = React.useState<UserProfileData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [user, userProjects] = await Promise.all([
                    getUserProfile(userId),
                    getProjectsByCreatorId(userId),
                ]);
                setProfileData(user);
                setProjects(userProjects);
            } catch (err) {
                setError("Failed to load user profile.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const totalProjects = projects.length;
    const averageRating = React.useMemo(() => {
        const ratedProjects = projects.filter(p => p.reviewCount && p.reviewCount > 0 && p.averageRating);
        if (ratedProjects.length === 0) return 0;
        const totalRatingSum = ratedProjects.reduce((sum, p) => sum + (p.averageRating || 0), 0);
        return totalRatingSum / ratedProjects.length;
    }, [projects]);

    const joinDate = profileData?.createdAt?.toDate ? profileData.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A';

    const anonymizeEmail = (email: string) => {
        if (!email) return 'anonymous';
        const [user, domain] = email.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white flex flex-col">
            <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center sticky top-0 z-10">
                 <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Back to Marketplace</span>
                </button>
            </header>
            <main className="flex-1 p-4 md:p-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64"><LoadingSpinner className="w-8 h-8" /></div>
                ) : error ? (
                    <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md">{error}</div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center gap-6 border border-gray-200 dark:border-gray-700">
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                                <UserIcon className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profileData ? anonymizeEmail(profileData.email) : '...'}</h1>
                                    {profileData?.isVerified && <CheckBadgeIcon className="w-6 h-6 text-blue-500" title="Verified User" />}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Joined in {joinDate}</p>
                            </div>
                            <div className="flex gap-6 text-center border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 pt-4 sm:pt-0 sm:pl-6">
                                <div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalProjects}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
                                        <StarIcon className="w-6 h-6 text-yellow-400" fill="currentColor" />
                                        {averageRating.toFixed(1)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Rating</p>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Published Projects</h2>
                        {projects.length === 0 ? (
                            <div className="text-center text-gray-500 bg-white dark:bg-gray-800 p-8 rounded-md border border-gray-200 dark:border-gray-700">This user has not published any projects yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {projects.map(project => (
                                     <div key={project.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col justify-between border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors">
                                        <div>
                                            <div className="flex items-start gap-3 mb-2">
                                                <FolderIcon className="w-6 h-6 text-green-500 dark:text-green-400 mt-1 flex-shrink-0"/>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{project.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 my-3">
                                                {project.reviewCount && project.reviewCount > 0 ? (
                                                    <>
                                                        <StarRatingDisplay rating={project.averageRating || 0} />
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">({project.reviewCount} reviews)</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-500">No reviews yet</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 h-10">{project.shareData?.description}</p>
                                            <span className="text-xs font-medium bg-purple-100 dark:bg-purple-600/50 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">{project.shareData?.category}</span>
                                        </div>
                                        <button 
                                            onClick={() => onViewProject(project)}
                                            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-semibold"
                                        >
                                            Explore Project
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default UserProfile;