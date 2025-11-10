// components/AnalyticsDashboard.tsx
import * as React from 'react';
import { getAdminAnalyticsData } from '../services/firebaseService';
import { AdminAnalyticsData, ChartDataPoint, TopProjectInfo } from '../types';
import { LoadingSpinner, UsersIcon, FolderIcon, StarIcon, ArrowDownTrayIcon } from './icons';

const BarChart: React.FC<{ title: string, data: ChartDataPoint[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 h-full">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
            <div className="flex gap-2 items-end h-48">
                {data.length > 0 ? data.map(point => (
                    <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                            className="w-full bg-blue-500 rounded-t-sm"
                            style={{ height: `${maxValue > 0 ? (point.value / maxValue) * 100 : 0}%` }}
                            title={`${point.label}: ${point.value}`}
                        ></div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{point.label}</span>
                    </div>
                )) : <p className="text-sm text-gray-400 w-full text-center">No data available.</p>}
            </div>
        </div>
    );
};

const TopProjectsList: React.FC<{ title: string, projects: TopProjectInfo[], icon: React.ReactNode }> = ({ title, projects, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
        <ul className="space-y-3">
            {projects.length > 0 ? projects.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.creatorEmail}</p>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                        {icon}
                        <span>{p.value}</span>
                    </div>
                </li>
            )) : <p className="text-sm text-gray-400 text-center py-4">No projects to show.</p>}
        </ul>
    </div>
);


const AnalyticsDashboard: React.FC = () => {
    const [data, setData] = React.useState<AdminAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [rangeDays, setRangeDays] = React.useState<number>(180);

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const analyticsData = await getAdminAnalyticsData();
                setData(analyticsData);
            } catch (err) {
                console.error("Failed to load analytics", err);
                setError("Could not load analytics data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md">{error}</div>;
    }

    if (!data) {
        return <div className="text-center text-gray-500">No data available.</div>;
    }

    const filterByRange = (series: ChartDataPoint[]) => {
        // Supports labels YYYY-MM or YYYY-MM-DD
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - rangeDays);
        return series.filter(d => {
            const parts = d.label.split('-').map(Number);
            const y = parts[0];
            const m = (parts[1] || 1) - 1;
            const day = parts.length > 2 ? parts[2] : 1;
            const dt = new Date(y, m, day);
            return dt >= cutoff;
        });
    };

    const userGrowth = filterByRange(data.userGrowth);
    const projectGrowth = filterByRange(data.projectGrowth);
    const reportedReviewsMonthly = filterByRange(data.reportedReviewsMonthly);
    const resetRequestsMonthly = filterByRange(data.resetRequestsMonthly);
    const visitorDaily = filterByRange(data.visitorDaily);
    
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.kpis.map(k => (
                    <div key={k.label} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-end">
                <label className="text-sm mr-2 text-gray-600 dark:text-gray-300">Range:</label>
                <select value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-1 text-sm">
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart title="New Users per Month" data={userGrowth} />
                <BarChart title="New Marketplace Projects per Month" data={projectGrowth} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BarChart title="Reported Reviews per Month" data={reportedReviewsMonthly} />
                <BarChart title="Password Reset Requests per Month" data={resetRequestsMonthly} />
                <BarChart title="Unique Visitors per Day" data={visitorDaily} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                     <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Projects by Category</h3>
                     <div className="flex flex-wrap gap-4">
                        {data.categoryDistribution.map(cat => (
                            <div key={cat.label} className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-md text-center">
                                <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">{cat.value}</p>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{cat.label}</p>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TopProjectsList title="Top Rated" projects={data.topRatedProjects} icon={<StarIcon className="w-4 h-4 text-yellow-400"/>} />
                <TopProjectsList title="Top Downloaded" projects={data.topDownloadedProjects} icon={<ArrowDownTrayIcon className="w-4 h-4 text-green-500"/>} />
                <TopProjectsList title="Top Cloned" projects={data.topClonedProjects} icon={<FolderIcon className="w-4 h-4 text-blue-500"/>} />
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
