// components/Login.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ModelIcon } from './icons';
import { AuthResponse, requestPasswordResetEmail, signInWithGoogle } from '../services/authService';
import PasswordResetChatModal from './PasswordResetChatModal';
import { useLanguage } from '../App';
import { updateUserProfile } from '../services/firebaseService';
import { auth } from '../firebaseConfig';

type AuthMode = 'signin' | 'signup';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<AuthResponse>;
  onSignUp: (email: string, pass: string) => Promise<AuthResponse>;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignUp }) => {
  const { t } = useLanguage();
  const [mode, setMode] = React.useState<AuthMode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [resetStatus, setResetStatus] = React.useState<string | null>(null);
  // Extra profile fields for signup
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [photoURL, setPhotoURL] = React.useState('');

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
  };

  const handleSendResetEmail = async () => {
    setResetStatus(null);
    if (!email.trim()) {
      setError(t('auth.emailLabel') + ' ' + t('common.required'));
      return;
    }
    setIsSendingReset(true);
    const res = await requestPasswordResetEmail(email.trim());
    setIsSendingReset(false);
    if (!res.success) {
      setError(res.message || t('common.error'));
    } else {
      setError(null);
      setResetStatus(res.message || 'Password reset email sent.');
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    clearForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(t('auth.emptyFields'));
      return;
    }
    setError(null);
    setIsLoading(true);

    let response: AuthResponse;
    if (mode === 'signin') {
        response = await onLogin(email, password);
    } else {
        response = await onSignUp(email, password);
        // After successful email/password signup, persist extra fields if provided
        if (response.success) {
          try {
            const uid = auth.currentUser?.uid;
            if (uid) {
              await updateUserProfile(uid, {
                displayName: [firstName, lastName].filter(Boolean).join(' ') || undefined,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                phone: phone || undefined,
                address: address || undefined,
                photoURL: photoURL || undefined,
              });
            }
          } catch (e) {
            console.warn('Failed to persist extra signup profile fields', e);
          }
        }
    }
    
    if (!response.success) {
        setError(response.message || t('common.error'));
    }

    setIsLoading(false);
  };
  
  const title = mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount');
  const buttonText = mode === 'signin' ? t('auth.signIn') : t('auth.signUp');
  const switchText = mode === 'signin' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount');
  const switchLinkText = mode === 'signin' ? t('auth.signUp') : t('auth.signIn');

  return (
    <>
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
             <ModelIcon className="w-10 h-10 text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md mb-4 text-center">{error}</p>}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-500"
              required
              autoComplete="email"
            />
          </div>
           <div className="mb-4">
             <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('auth.passwordLabel')}
              </label>
              {mode === 'signin' && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setIsResetModalOpen(true)} className="text-xs text-blue-500 dark:text-blue-400 hover:underline">{t('auth.forgotPassword')}</button>
                      <button type="button" onClick={handleSendResetEmail} className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50" disabled={isSendingReset}>
                        {isSendingReset ? t('auth.processing') : 'Send reset email'}
                      </button>
                    </div>
              )}
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-500"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center mt-6"
            disabled={isLoading}
          >
            {isLoading ? t('auth.processing') : buttonText}
          </button>
          {resetStatus && (
            <p className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs p-2 rounded mb-2 text-center">{resetStatus}</p>
          )}
        </form>
        <div className="mt-3">
          <button
            type="button"
            onClick={async () => {
              const res = await signInWithGoogle();
              if (!res.success) setError(res.message || t('common.error'));
            }}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 font-medium py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <img alt="Google" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
        </div>
         <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
            {switchText}{' '}
            <button onClick={toggleMode} className="font-medium text-blue-500 dark:text-blue-400 hover:underline">
                {switchLinkText}
            </button>
        </p>
      </div>
    </div>
    {isResetModalOpen && <PasswordResetChatModal onClose={() => setIsResetModalOpen(false)} />}
    </>
  );
};

export default Login;
