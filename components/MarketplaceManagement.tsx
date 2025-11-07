// components/MarketplaceManagement.tsx
import * as React from 'react';
import { adminGetMarketplaceProjects, adminUpdateMarketplaceProject, adminDeleteMarketplaceProject } from '../services/firebaseService';
import { MarketplaceProject } from '../types';
import { LoadingSpinner, TrashIcon, CheckBadgeIcon, StarIcon } from './icons';

const MarketplaceManagement: React.FC = () => {
    const [projects, setProjects] = React.useState<MarketplaceProject[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedProjects = await adminGetMarketplaceProjects();
            setProjects(fetchedProjects);
        } catch (err) {
            setError("Failed to load marketplace projects.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggle = async (projectId: string, field: 'isFeatured' | 'isListed', currentValue: boolean) => {
        try {
            await adminUpdateMarketplaceProject(projectId, { [field]: !currentValue });
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, [field]: !currentValue } : p));
        } catch {
            // Handle error, maybe show a toast
        }
    };

    const handleDelete = async (projectId: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this project from the marketplace? The user's original project will NOT be deleted.")) return;
        try {
            await adminDeleteMarketplaceProject(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch {
             // Handle error
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md">{error}</div>;
    }

    return (
        <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manage Marketplace Projects</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Project</th>
                                <th scope="col" className="px-6 py-3">Creator</th>
                                <th scope="col" className="px-6 py-3 text-center">Featured</th>
                                <th scope="col" className="px-6 py-3 text-center">Listed</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(p => (
                                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                    <td className="px-6 py-4 flex items-center gap-1">
                                        {p.creatorEmail}
                                        {p.creatorIsVerified && <CheckBadgeIcon className="w-4 h-4 text-blue-500" title="Verified Creator" />}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggle(p.id, 'isFeatured', !!p.isFeatured)}>
                                            {p.isFeatured ? <StarIcon className="w-5 h-5 text-yellow-400" /> : <StarIcon className="w-5 h-5 text-gray-400 dark:text-gray-600"/>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={!!p.isListed} onChange={() => handleToggle(p.id, 'isListed', !!p.isListed)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-500 hover:text-red-500" title="Delete from Marketplace">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MarketplaceManagement;
