// components/AdminPanel.tsx
// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
// Fix: Import PendingProject type from types.ts instead of firebaseService.ts.
// Fix: Removed AdminDashboardStats import from firebaseService as it is defined in types.ts.
import { getAdminDashboardStats, getPendingSubmissions, adminLoadUserProjects, getReportedReviews, adminDeleteReview, adminDismissReport, adminGetPasswordResetRequests, adminSendMessageInResetRequest, adminUpdateResetRequestStatus, adminUpdateUserProfile, getUserProfile, adminGetFeedback, adminUpdateFeedbackStatus, adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement, adminGetAIConfig, adminUpdateAIConfig, adminLog, adminGetLogs } from '../services/firebaseService';
// Fix: Imported ArrowLeftIcon to resolve missing component error.
import { LoadingSpinner, LogOutIcon, UsersIcon, FolderIcon, RefreshIcon, CheckBadgeIcon, XMarkIcon, StoreIcon, FlagIcon, TrashIcon, CheckIcon, KeyIcon, ArrowLeftIcon, LightBulbIcon } from './icons';
import { requestPasswordResetEmail } from '../services/authService';
// Fix: Imported AdminDashboardStats from types.ts where it is defined.
import { Project, PendingProject, ReportedReview, PasswordResetRequest, AdminUser, UserProfileData, AdminDashboardStats, Feedback, Announcement, AIConfig } from '../types';
import AdminProjectViewer from './AdminProjectViewer';
import ManageUserModal from './ManageUserModal';
import AnalyticsDashboard from './AnalyticsDashboard';
import MarketplaceManagement from './MarketplaceManagement';

type AdminView = 'dashboard' | 'user_projects' | 'project_viewer' | 'submissions' | 'reports' | 'password_requests' | 'analytics' | 'marketplace_mgmt' | 'feedback' | 'announcements' | 'ai_settings' | 'admin_logs';

interface AdminPanelProps {
  onLogout: () => void;
}

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const UserStatusBadge: React.FC<{ status: 'active' | 'suspended' | 'banned', isVerified: boolean }> = ({ status, isVerified }) => {
    const statusStyles = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        banned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return (
        <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {isVerified && (
                <span title="Verified User" className="text-blue-500 dark:text-blue-400">
                    <CheckBadgeIcon className="w-5 h-5" />
                </span>
            )}
        </div>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
    const [view, setView] = React.useState<AdminView>('dashboard');
    const [stats, setStats] = React.useState<AdminDashboardStats | null>(null);
    const [pending, setPending] = React.useState<PendingProject[]>([]);
    const [reports, setReports] = React.useState<ReportedReview[]>([]);
    const [passwordRequests, setPasswordRequests] = React.useState<PasswordResetRequest[]>([]);
    const [feedback, setFeedback] = React.useState<Feedback[]>([]);
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
    const [aiConfig, setAiConfig] = React.useState<AIConfig | null>(null);
    const [adminLogs, setAdminLogs] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [toast, setToast] = React.useState<{ message: string; type: 'success'|'error'|'info'} | null>(null);

    const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);
    const [userProjects, setUserProjects] = React.useState<Project[]>([]);

    const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
    // Fix: Corrected the type definition for useState. The `| null` was outside the generic angle brackets.
    const [selectedProjectContext, setSelectedProjectContext] = React.useState<{ userId: string; userEmail: string; isApproval: boolean; } | null>(null);

    const [selectedPasswordRequest, setSelectedPasswordRequest] = React.useState<PasswordResetRequest | null>(null);
    const [adminReply, setAdminReply] = React.useState('');
    const [isSendingReset, setIsSendingReset] = React.useState(false);
    const [resetEmailStatus, setResetEmailStatus] = React.useState<string | null>(null);
    
    const [managingUser, setManagingUser] = React.useState<AdminUser | null>(null);
    const [managingUserProfile, setManagingUserProfile] = React.useState<UserProfileData | null>(null);


    const fetchData = React.useCallback(async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        setError(null);
        try {
            const [statsData, pendingData, reportsData, passwordReqsData, feedbackData, announcementsData, aiConfigData] = await Promise.all([
                getAdminDashboardStats(),
                getPendingSubmissions(),
                getReportedReviews(),
                adminGetPasswordResetRequests(),
                adminGetFeedback(),
                adminGetAnnouncements(),
                adminGetAIConfig(),
            ]);
            setStats(statsData);
            setPending(pendingData);
            setReports(reportsData);
            setPasswordRequests(passwordReqsData);
            setFeedback(feedbackData);
            setAnnouncements(announcementsData);
            setAiConfig(aiConfigData);
            // Load recent logs lazily if needed
            try { const logs = await adminGetLogs(200); setAdminLogs(logs); } catch {}
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
            setError("Could not load dashboard data.");
        } finally {
            if (!isRefresh) setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    React.useEffect(() => {
        if (selectedPasswordRequest) {
            const updatedRequest = passwordRequests.find(r => r.id === selectedPasswordRequest.id);
            if (updatedRequest) {
                setSelectedPasswordRequest(updatedRequest);
            }
        }
    }, [passwordRequests, selectedPasswordRequest]);
    
    const handleViewSubmission = (p: PendingProject) => {
        setSelectedProject(p);
        setSelectedProjectContext({ userId: p.user.uid, userEmail: p.user.email, isApproval: true });
        setView('project_viewer');
    }

    const handleViewUserProjects = async (user: AdminUser) => {
        setIsLoading(true);
        setError(null);
        try {
            const projects = await adminLoadUserProjects(user.uid);
            setUserProjects(projects);
            setSelectedUser(user);
            setView('user_projects');
        } catch (err) {
            console.error("Failed to load user projects", err);
            setError("Could not load projects for this user.");
        } finally {
            setIsLoading(false);
            setManagingUser(null);
        }
    };
    
    const handleViewProject = (project: Project) => {
        if (!selectedUser) return;
        setSelectedProject(project);
        setSelectedProjectContext({ userId: selectedUser.uid, userEmail: selectedUser.email, isApproval: false });
        setView('project_viewer');
    };

    const handleDeleteReview = async (report: ReportedReview) => {
        if (!window.confirm("Are you sure you want to delete this review permanently? This cannot be undone.")) return;
        try {
            await adminDeleteReview(report.projectId, report.reviewId, report.id);
            await adminLog('delete_review', { projectId: report.projectId, reviewId: report.reviewId, reportId: report.id });
            setToast({ message: 'Review deleted.', type: 'success' });
            fetchData(true);
        } catch (e) {
            setToast({ message: 'Failed to delete review.', type: 'error' });
        }
    };

    const handleDismissReport = async (report: ReportedReview) => {
        try {
            await adminDismissReport(report.id, report.projectId, report.id);
            await adminLog('dismiss_report', { reportId: report.id, projectId: report.projectId });
            setToast({ message: 'Report dismissed.', type: 'success' });
            fetchData(true);
        } catch (e) {
            setToast({ message: 'Failed to dismiss report.', type: 'error' });
        }
    };

    const handleSendAdminReply = async () => {
        if (!adminReply.trim() || !selectedPasswordRequest) return;
        try {
            await adminSendMessageInResetRequest(selectedPasswordRequest.id, adminReply);
            await adminLog('password_request_reply', { requestId: selectedPasswordRequest.id });
            setAdminReply('');
            setToast({ message: 'Reply sent.', type: 'success' });
            fetchData(true);
        } catch (e) {
            setToast({ message: 'Failed to send reply.', type: 'error' });
        }
    };

    const handleUpdateRequestStatus = async (status: 'open' | 'closed') => {
        if (!selectedPasswordRequest) return;
        try {
            await adminUpdateResetRequestStatus(selectedPasswordRequest.id, status);
            await adminLog('password_request_status', { requestId: selectedPasswordRequest.id, status });
            setToast({ message: 'Request status updated.', type: 'success' });
            fetchData(true);
        } catch (e) {
            setToast({ message: 'Failed to update status.', type: 'error' });
        }
    };

    const handleSendResetEmail = async () => {
        if (!selectedPasswordRequest?.userEmail) return;
        setResetEmailStatus(null);
        setIsSendingReset(true);
        const res = await requestPasswordResetEmail(selectedPasswordRequest.userEmail);
        setIsSendingReset(false);
        setResetEmailStatus(res.message || (res.success ? 'Password reset email sent.' : 'Failed to send reset email.'));
    };

    const openManageModal = async (user: AdminUser) => {
        setManagingUser(user);
        const profile = await getUserProfile(user.uid);
        setManagingUserProfile(profile);
    };
    
    const handleCloseManageModal = () => {
        setManagingUser(null);
        setManagingUserProfile(null);
    };

    const handleSaveUser = async (userId: string, updates: Partial<UserProfileData>) => {
        try {
            await adminUpdateUserProfile(userId, updates);
            await adminLog('update_user_profile', { userId, updates });
            handleCloseManageModal();
            setToast({ message: 'User updated.', type: 'success' });
            fetchData(true);
        } catch (e) {
            setToast({ message: 'Failed to update user.', type: 'error' });
        }
    };

    const handleFeedbackStatusChange = async (feedbackId: string, status: Feedback['status']) => {
        try {
            await adminUpdateFeedbackStatus(feedbackId, status);
            setFeedback(prev => prev.map(f => f.id === feedbackId ? { ...f, status } : f));
        } catch (e) {
            console.error("Failed to update feedback status", e);
            setError("Could not update feedback status.");
        }
    };

    const AdminLogsView = () => (
        <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Admin Logs</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-4 py-3">Action</th>
                                <th scope="col" className="px-4 py-3">Admin</th>
                                <th scope="col" className="px-4 py-3">Timestamp</th>
                                <th scope="col" className="px-4 py-3">Payload</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-500">No logs found.</td>
                                </tr>
                            ) : (
                                adminLogs.map((log: any) => (
                                    <tr key={log.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.action}</td>
                                        <td className="px-4 py-3">{log.adminEmail || log.adminId}</td>
                                        <td className="px-4 py-3">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : ''}</td>
                                        <td className="px-4 py-3 max-w-[400px]"><pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">{JSON.stringify(log.payload, null, 2)}</pre></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    if (view === 'project_viewer' && selectedProject && selectedProjectContext) {
        return (
            <AdminProjectViewer
                project={selectedProject}
                userId={selectedProjectContext.userId}
                userEmail={selectedProjectContext.userEmail}
                isApprovalMode={selectedProjectContext.isApproval}
                onBack={() => {
                    setView(selectedProjectContext.isApproval ? 'submissions' : 'user_projects');
                    setSelectedProject(null);
                    setSelectedProjectContext(null);
                    fetchData(true); // Refresh data in case status changed
                }}
            />
        );
    }
    
    const formatJoinDate = (date: Date | null) => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };


    const MainDashboard = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={<UsersIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} />
                <StatCard title="Total Projects" value={stats?.totalProjects ?? 0} icon={<FolderIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} />
                 <StatCard title="New Feedback" value={feedback?.filter(f => f.status === 'new').length ?? 0} icon={<LightBulbIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400"/>} />
                <StatCard title="Reported Reviews" value={reports?.length ?? 0} icon={<FlagIcon className="w-6 h-6 text-red-500 dark:text-red-400"/>} />
                <StatCard title="Password Requests" value={passwordRequests?.filter(r => r.status === 'open').length ?? 0} icon={<KeyIcon className="w-6 h-6 text-orange-500 dark:text-orange-400"/>} />
            </div>
            
            <div>
               <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Users</h2>
               <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                   <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Email</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-center">Projects</th>
                                    <th scope="col" className="px-6 py-3">Joined Date</th>
                                    <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats && stats.users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-500">No users found.</td>
                                    </tr>
                                ) : (
                                    stats?.users.map(user => (
                                        <tr key={user.uid} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.email}</td>
                                            <td className="px-6 py-4"><UserStatusBadge status={user.status} isVerified={user.isVerified}/></td>
                                            <td className="px-6 py-4 text-center">{user.projectCount}</td>
                                            <td className="px-6 py-4">{formatJoinDate(user.createdAt)}</td>
                                             <td className="px-6 py-4 text-right">
                                                <button onClick={() => openManageModal(user)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                    Manage
                                                </button>
                                             </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                   </div>
               </div>
            </div>
        </div>
    );
    
    const UserProjectsView = () => (
        <div>
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Dashboard
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Projects for <span className="text-blue-500 dark:text-blue-400">{selectedUser?.email}</span></h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Project Name</th>
                                <th scope="col" className="px-6 py-3 text-center">Files</th>
                                <th scope="col" className="px-6 py-3">Marketplace Status</th>
                                <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {userProjects.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">This user has no projects.</td></tr>
                            ) : (
                                userProjects.map(p => (
                                    <tr key={p.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.name}</td>
                                        <td className="px-6 py-4 text-center">{p.files.length}</td>
                                        <td className="px-6 py-4 capitalize">{p.shareData?.status || 'None'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleViewProject(p)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                Open
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const SubmissionsView = () => (
        <div>
           <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">طلبات المتجر المعلقة (Pending Submissions)</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Project Name</th>
                                <th scope="col" className="px-6 py-3">Submitted By</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pending.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">No pending submissions.</td>
                                </tr>
                            ) : (
                                pending.map(p => (
                                    <tr key={p.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.name}</td>
                                        <td className="px-6 py-4">{p.user.email}</td>
                                        <td className="px-6 py-4">{p.shareData?.category}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleViewSubmission(p)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
    
    const ReportsView = () => (
         <div>
           <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Reported Reviews</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 w-1/3">Review Content</th>
                                <th scope="col" className="px-6 py-3">Project</th>
                                <th scope="col" className="px-6 py-3">Reported By</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">No reported reviews.</td>
                                </tr>
                            ) : (
                                reports.map(r => (
                                    <tr key={r.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 italic text-gray-500 dark:text-gray-400">"{r.reviewContent}"</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.projectName}</td>
                                        <td className="px-6 py-4">{r.reporterEmail}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleDismissReport(r)} className="font-medium text-green-600 dark:text-green-400 hover:underline">
                                                Dismiss
                                            </button>
                                            <button onClick={() => handleDeleteReview(r)} className="font-medium text-red-600 dark:text-red-400 hover:underline">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
    
    const PasswordRequestsView = () => (
         <div className="flex gap-6 h-[calc(100vh-150px)]">
            <div className="w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                <h2 className="text-lg font-semibold p-4 border-b border-gray-200 dark:border-gray-700">Open Requests</h2>
                <div className="flex-1 overflow-y-auto">
                    {passwordRequests.filter(r => r.status === 'open').length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">No open requests.</p>
                    ) : (
                        passwordRequests.filter(r => r.status === 'open').map(req => (
                            <button key={req.id} onClick={() => setSelectedPasswordRequest(req)} className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedPasswordRequest?.id === req.id ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                                <p className="font-semibold text-gray-900 dark:text-white">{req.userEmail}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(req.createdAt as any)?.toDate().toLocaleString()}</p>
                            </button>
                        ))
                    )}
                </div>
            </div>
            <div className="w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                {selectedPasswordRequest ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-lg">{selectedPasswordRequest.userEmail}</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={handleSendResetEmail} disabled={isSendingReset} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                    {isSendingReset ? 'Sending…' : 'Send reset email'}
                                </button>
                                <button onClick={() => handleUpdateRequestStatus('closed')} className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Mark as Resolved</button>
                            </div>
                        </div>
                        {resetEmailStatus && (
                            <div className="px-4 pt-2 text-xs text-blue-700 dark:text-blue-300">{resetEmailStatus}</div>
                        )}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {selectedPasswordRequest.messages?.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                <input type="text" value={adminReply} onChange={e => setAdminReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendAdminReply()} placeholder="Type your reply..." className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-300 dark:border-gray-600" />
                                <button onClick={handleSendAdminReply} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Send</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a request to view the conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
    
    const FeedbackView = () => {
        const [statusFilter, setStatusFilter] = React.useState('all');
        const [typeFilter, setTypeFilter] = React.useState('all');

        const filteredFeedback = feedback.filter(item => {
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            const typeMatch = typeFilter === 'all' || item.type === typeFilter;
            return statusMatch && typeMatch;
        });

        return (
            <div>
               <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">User Feedback</h2>
               <div className="flex gap-4 mb-4">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2">
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                     <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md p-2">
                        <option value="all">All Types</option>
                        <option value="General Feedback">General Feedback</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Bug Report">Bug Report</option>
                    </select>
               </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 w-1/2">Message</th>
                                    <th scope="col" className="px-6 py-3">User</th>
                                    <th scope="col" className="px-6 py-3">Type</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedback.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No matching feedback found.</td></tr>
                                ) : (
                                    filteredFeedback.map(item => (
                                        <tr key={item.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.message}</td>
                                            <td className="px-6 py-4">{item.userEmail}</td>
                                            <td className="px-6 py-4">{item.type}</td>
                                            <td className="px-6 py-4">
                                                 <select
                                                    value={item.status}
                                                    onChange={(e) => handleFeedbackStatusChange(item.id, e.target.value as Feedback['status'])}
                                                    className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="resolved">Resolved</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    };
    
    const AnnouncementsView = () => {
        const [newMessage, setNewMessage] = React.useState('');
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        const handleCreate = async () => {
            if (!newMessage.trim()) return;
            setIsSubmitting(true);
            await adminCreateAnnouncement(newMessage);
            await adminLog('create_announcement', { message: newMessage });
            setNewMessage('');
            setIsSubmitting(false);
            fetchData(true);
        };

        const handleToggle = async (id: string, current: boolean) => {
            await adminUpdateAnnouncement(id, { isActive: !current });
            await adminLog('toggle_announcement', { id, isActive: !current });
            fetchData(true);
        };
        
        const handleDelete = async (id: string) => {
            if (window.confirm("Delete this announcement?")) {
                await adminDeleteAnnouncement(id);
                await adminLog('delete_announcement', { id });
                fetchData(true);
            }
        };

        return (
            <div>
                 <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Announcements</h2>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6">
                     <h3 className="font-semibold mb-2">Create New Announcement</h3>
                     <div className="flex gap-2">
                         <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Enter announcement message..." className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none" />
                         <button onClick={handleCreate} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">{isSubmitting && <LoadingSpinner className="w-4 h-4 mr-2" />} Create</button>
                     </div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                     <table className="w-full text-sm">
                         <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                             <tr>
                                 <th className="px-6 py-3 text-left">Message</th>
                                 <th className="px-6 py-3 text-center">Status</th>
                                 <th className="px-6 py-3 text-right">Actions</th>
                             </tr>
                         </thead>
                         <tbody>
                             {announcements.map(a => (
                                 <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                     <td className="px-6 py-4">{a.message}</td>
                                     <td className="px-6 py-4 text-center">
                                         <button onClick={() => handleToggle(a.id, a.isActive)} className={`px-2 py-1 text-xs rounded-full ${a.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'}`}>
                                             {a.isActive ? 'Active' : 'Inactive'}
                                         </button>
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <button onClick={() => handleDelete(a.id)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        );
    };
    
    const AISettingsView = () => {
        const [prompt, setPrompt] = React.useState(aiConfig?.systemPrompt || '');
        const [isSaving, setIsSaving] = React.useState(false);

        const handleSave = async () => {
            setIsSaving(true);
            await adminUpdateAIConfig({ systemPrompt: prompt });
            fetchData(true);
            setIsSaving(false);
        };
        
        return (
             <div>
                 <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">AI Settings</h2>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                     <h3 className="font-semibold mb-2">System Prompt</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This instruction defines the AI's core behavior and personality. Changes will apply to all future conversations.</p>
                     <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={15} className="w-full font-mono text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none"/>
                     <div className="flex justify-end mt-4">
                          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">{isSaving && <LoadingSpinner className="w-4 h-4 mr-2" />} Save Prompt</button>
                     </div>
                 </div>
            </div>
        );
    };

    type TabItem = { id: AdminView; name: string; count?: number };
    const TABS: TabItem[] = [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'analytics', name: 'Analytics' },
        { id: 'marketplace_mgmt', name: 'Marketplace' },
        { id: 'submissions', name: 'Submissions', count: pending.length },
        { id: 'feedback', name: 'Feedback', count: feedback.filter(f => f.status === 'new').length },
        { id: 'reports', name: 'Reports', count: reports.length },
        { id: 'password_requests', name: 'Reset Requests', count: passwordRequests.filter(r => r.status === 'open').length },
        { id: 'announcements', name: 'Announcements' },
        { id: 'ai_settings', name: 'AI Settings' },
        { id: 'admin_logs', name: 'Admin Logs' },
    ];
    
    // Main Panel render
    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white flex flex-col">
            {managingUser && managingUserProfile && (
                <ManageUserModal
                    user={managingUser}
                    profile={managingUserProfile}
                    onClose={handleCloseManageModal}
                    onSave={handleSaveUser}
                    onViewProjects={() => handleViewUserProjects(managingUser)}
                />
            )}
            <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                     <button
                        onClick={() => fetchData(true)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                 <div className="absolute left-1/2 -translate-x-1/2">
                    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-sm">
                        {TABS.map(tab => (
                             <button 
                                key={tab.id} 
                                onClick={() => setView(tab.id as AdminView)} 
                                className={`px-3 py-1 rounded-md transition-colors relative ${view === tab.id || (view === 'user_projects' && tab.id === 'dashboard') ? 'bg-blue-600 text-white shadow' : 'text-gray-800 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                {tab.name}
                                {tab.count > 0 && (
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    title="Log Out"
                >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </header>

            <main className="flex-1 p-4 md:p-8">
                {isLoading && !stats ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner className="w-8 h-8" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md">
                        {error}
                    </div>
                ) : (
                    <>
                        {view === 'dashboard' && <MainDashboard />}
                        {view === 'analytics' && <AnalyticsDashboard />}
                        {view === 'admin_logs' && <AdminLogsView />}
                        {view === 'marketplace_mgmt' && <MarketplaceManagement />}
                        {view === 'submissions' && <SubmissionsView />}
                        {view === 'user_projects' && <UserProjectsView />}
                        {view === 'reports' && <ReportsView />}
                        {view === 'password_requests' && <PasswordRequestsView />}
                        {view === 'feedback' && <FeedbackView />}
                        {view === 'announcements' && <AnnouncementsView />}
                        {view === 'ai_settings' && <AISettingsView />}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;