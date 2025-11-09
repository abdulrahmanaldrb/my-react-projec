// components/SettingsPage.tsx
import * as React from 'react';
import { ArrowLeftIcon, ExclamationTriangleIcon, KeyIcon, LightBulbIcon, LoadingSpinner, GlobeAltIcon } from './icons';
import { changeUserPassword, deleteUserAccount } from '../services/authService';
import { submitFeedback } from '../services/firebaseService';
import { useLanguage } from '../App';

interface SettingsPageProps {
  onBack: () => void;
  showToast: (message: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, showToast }) => {
    const { t, language, setLanguage } = useLanguage();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isChangingPassword, setIsChangingPassword] = React.useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

    const [oldPassword, setOldPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');

    const [feedbackType, setFeedbackType] = React.useState<'Bug Report' | 'Feature Request' | 'General Feedback'>('General Feedback');
    const [feedbackMessage, setFeedbackMessage] = React.useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast(t('settings.passwordsDoNotMatch'));
            return;
        }
        if (newPassword.length < 6) {
            showToast(t('settings.passwordTooShort'));
            return;
        }

        setIsChangingPassword(true);
        const response = await changeUserPassword(oldPassword, newPassword);
        if (response.success) {
            showToast(t('settings.passwordChangedSuccess'));
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            showToast(response.message || t('settings.passwordChangedError'));
        }
        setIsChangingPassword(false);
    };
    
    const handleDeleteAccount = async () => {
        if (!window.confirm(t('settings.deleteAccountConfirm'))) {
            return;
        }
        setIsDeleting(true);
        const response = await deleteUserAccount();
        if (response.success) {
            showToast(t('settings.accountDeletedSuccess'));
            // The onAuthChange listener in App.tsx will handle logging out.
        } else {
            showToast(response.message || t('settings.accountDeletedError'));
        }
        setIsDeleting(false);
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) {
            showToast(t('settings.feedbackMessageRequired'));
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            await submitFeedback(feedbackType, feedbackMessage);
            showToast(t('settings.feedbackSubmittedSuccess'));
            setFeedbackMessage('');
            setFeedbackType('General Feedback');
        } catch (error) {
            showToast(t('settings.feedbackSubmittedError'));
        } finally {
            setIsSubmittingFeedback(false);
        }
    };
    
    return (
         <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
            <header className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
                 <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>{t('common.backToEditor')}</span>
                </button>
                <h1 className="text-xl font-bold">{t('settings.title')}</h1>
                <div className="w-[130px]"></div> {/* Spacer */}
            </header>
            <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
                 {/* Language Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                        <GlobeAltIcon className="w-6 h-6 text-blue-500"/>
                        <h2 className="text-lg font-semibold">{t('settings.languageTitle')}</h2>
                    </div>
                     <div className="flex gap-4">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-2 rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            English
                        </button>
                         <button 
                            onClick={() => setLanguage('ar')}
                            className={`flex-1 py-2 rounded-md transition-colors ${language === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            العربية
                        </button>
                    </div>
                </div>

                {/* Feedback Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                        <LightBulbIcon className="w-6 h-6 text-yellow-500"/>
                        <h2 className="text-lg font-semibold">{t('settings.feedbackTitle')}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('settings.feedbackDescription')}
                    </p>
                    <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                        <select
                            value={feedbackType}
                            onChange={(e) => setFeedbackType(e.target.value as any)}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                        >
                            <option value="General Feedback">{t('settings.feedbackTypeGeneral')}</option>
                            <option value="Feature Request">{t('settings.feedbackTypeFeature')}</option>
                            <option value="Bug Report">{t('settings.feedbackTypeBug')}</option>
                        </select>
                        <textarea
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            rows={4}
                            placeholder={t('settings.feedbackPlaceholder')}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                        />
                        <div className="text-end">
                             <button type="submit" disabled={isSubmittingFeedback} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center ms-auto">
                                {isSubmittingFeedback && <LoadingSpinner className="w-4 h-4 me-2" />}
                                {isSubmittingFeedback ? t('settings.submitting') : t('settings.submitFeedbackButton')}
                            </button>
                        </div>
                    </form>
                </div>

                 {/* Account Management Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                        <KeyIcon className="w-6 h-6 text-gray-500 dark:text-gray-400"/>
                        <h2 className="text-lg font-semibold">{t('settings.accountManagementTitle')}</h2>
                    </div>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.currentPassword')}</label>
                            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.newPassword')}</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.confirmNewPassword')}</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                        <div className="text-end">
                            <button type="submit" disabled={isChangingPassword} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center ms-auto">
                                {isChangingPassword && <LoadingSpinner className="w-4 h-4 me-2" />}
                                {isChangingPassword ? t('settings.saving') : t('settings.changePasswordButton')}
                            </button>
                        </div>
                    </form>

                    <div className="flex items-center justify-between pt-6">
                        <div>
                            <h3 className="font-medium text-red-600 dark:text-red-500">{t('settings.deleteAccountTitle')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.deleteAccountDescription')}</p>
                        </div>
                        <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600/10 text-red-600 dark:text-red-500 dark:bg-red-500/20 hover:bg-red-600/20 dark:hover:bg-red-500/30 rounded-md transition-colors disabled:opacity-50">
                            {isDeleting ? <LoadingSpinner className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                            <span>{t('settings.deleteButton')}</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
