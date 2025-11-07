// components/MyProfile.tsx
import * as React from 'react';
import { getUserProfile, updateUserProfile, getProjectsByCreatorId } from '../services/firebaseService';
import { UserProfileData } from '../types';
import { ArrowLeftIcon, LoadingSpinner, UserIcon, PencilIcon, LinkIcon, GitHubIcon } from './icons';
import { auth } from '../firebaseConfig';

interface MyProfileProps {
    onBack: () => void;
    showToast: (message: string) => void;
}

// Moved outside the component to prevent re-declaration on every render, fixing the focus loss bug.
const InfoField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <div className="mt-1 text-base text-gray-800 dark:text-gray-200">{value || <span className="text-gray-400 dark:text-gray-500">Not set</span>}</div>
    </div>
);

// Moved outside the component to prevent re-declaration on every render, fixing the focus loss bug.
const EditField = ({ label, name, value, onChange, placeholder, type = 'text' }: { label: string, name: string, value: any, onChange: any, placeholder: string, type?: string }) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
        />
    </div>
);

const MyProfile: React.FC<MyProfileProps> = ({ onBack, showToast }) => {
    const [profile, setProfile] = React.useState<UserProfileData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [formData, setFormData] = React.useState<Partial<UserProfileData>>({});
    const [projectCount, setProjectCount] = React.useState(0);
    
    const userId = auth.currentUser?.uid;

    const fetchProfile = React.useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [profileData, projects] = await Promise.all([
                getUserProfile(userId),
                getProjectsByCreatorId(userId)
            ]);
            setProfile(profileData);
            setFormData(profileData || {});
            setProjectCount(projects.length);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            showToast("Could not load your profile data.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, showToast]);

    React.useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const skillsArray = e.target.value.split(',').map(skill => skill.trim()).filter(Boolean);
        setFormData({ ...formData, skills: skillsArray });
    };

    const handleSave = async () => {
        if (!userId) return;
        setIsSaving(true);
        try {
            await updateUserProfile(userId, formData);
            setProfile(prev => ({ ...(prev as UserProfileData), ...formData }));
            setIsEditing(false);
            showToast("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to save profile:", error);
            showToast("An error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancel = () => {
        setFormData(profile || {});
        setIsEditing(false);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900"><LoadingSpinner className="w-8 h-8" /></div>;
    }
    
    if (!profile) {
        return (
             <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white flex flex-col items-center justify-center">
                <h2 className="text-xl font-semibold mb-4">Could not load profile.</h2>
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Go Back</span>
                </button>
             </div>
        );
    }
    
    return (
         <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
            <header className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
                 <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Back to Editor</span>
                </button>
                <h1 className="text-xl font-bold">My Profile</h1>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit Profile</span>
                    </button>
                )}
            </header>
             <main className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center gap-6 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <UserIcon className="w-20 h-20 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        {isEditing ? (
                             <input
                                type="text"
                                name="displayName"
                                value={formData.displayName || ''}
                                onChange={handleInputChange}
                                placeholder="Your Name"
                                className="text-2xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none w-full"
                            />
                        ) : (
                             <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.displayName || profile.email.split('@')[0]}</h1>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Joined on {new Date(profile.createdAt?.toDate()).toLocaleDateString()}</p>
                    </div>
                     <div className="flex gap-6 text-center border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 pt-4 sm:pt-0 sm:pl-6">
                        <div>
                            <p className="text-3xl font-bold">{projectCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-500 dark:text-gray-400">Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    rows={3}
                                    value={formData.bio || ''}
                                    onChange={handleInputChange}
                                    placeholder="Tell everyone a little about yourself"
                                    className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                                />
                            </div>
                            <EditField label="Skills (comma-separated)" name="skills" value={(formData.skills || []).join(', ')} onChange={handleSkillsChange} placeholder="React, TypeScript, Firebase" />
                            <EditField label="Website URL" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://my-portfolio.com" />
                            <EditField label="GitHub URL" name="github" value={formData.github} onChange={handleInputChange} placeholder="https://github.com/username" />

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
                                    {isSaving && <LoadingSpinner className="w-4 h-4 mr-2" />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <InfoField label="Bio" value={<p className="whitespace-pre-wrap">{profile.bio}</p>} />
                            <InfoField label="Skills" value={
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills && profile.skills.length > 0 ? profile.skills.map(skill => (
                                        <span key={skill} className="bg-blue-100 dark:bg-blue-600/50 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                                    )) : <span className="text-gray-400 dark:text-gray-500">No skills listed.</span>}
                                </div>
                            }/>
                             <InfoField label="Links" value={
                                 <div className="flex items-center gap-4">
                                     {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:underline"><LinkIcon className="w-4 h-4"/> Website</a>}
                                     {profile.github && <a href={profile.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:underline"><GitHubIcon className="w-4 h-4"/> GitHub</a>}
                                     {!profile.website && !profile.github && <span className="text-gray-400 dark:text-gray-500">No links provided.</span>}
                                 </div>
                             } />
                        </div>
                    )}
                </div>

             </main>
        </div>
    );
};

export default MyProfile;
