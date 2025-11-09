// components/Login.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ModelIcon } from './icons';
import { AuthResponse } from '../services/authService';
import PasswordResetChatModal from './PasswordResetChatModal';
import { useLanguage } from '../App';

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

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
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
                    <button type="button" onClick={() => setIsResetModalOpen(true)} className="text-xs text-blue-500 dark:text-blue-400 hover:underline">{t('auth.forgotPassword')}</button>
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
        </form>
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
