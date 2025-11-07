// components/PasswordResetChatModal.tsx
import * as React from 'react';
import { XMarkIcon, LoadingSpinner, SendIcon } from './icons';
// Fix: Import PasswordResetRequest from types.ts where it is defined, not from firebaseService.ts.
import { requestPasswordResetChat, onPasswordResetRequestSnapshot } from '../services/firebaseService';
import { PasswordResetRequest } from '../types';

interface PasswordResetChatModalProps {
    onClose: () => void;
}

const PasswordResetChatModal: React.FC<PasswordResetChatModalProps> = ({ onClose }) => {
    const [requestId, setRequestId] = React.useState<string | null>(localStorage.getItem('passwordResetRequestId'));
    const [requestData, setRequestData] = React.useState<PasswordResetRequest | null>(null);
    const [isLoading, setIsLoading] = React.useState(!!requestId);
    const [error, setError] = React.useState<string | null>(null);
    
    // Form state for new request
    const [email, setEmail] = React.useState('');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        if (!requestId) return;
        setIsLoading(true);

        const unsubscribe = onPasswordResetRequestSnapshot(requestId, (data, errorMsg) => {
            if (errorMsg) {
                setError(errorMsg);
                setRequestData(null);
            } else {
                setRequestData(data);
                setError(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [requestId]);

    const handleNewRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !message.trim()) {
            setError("Please fill in both your email and a message.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const newId = await requestPasswordResetChat(email, message);
            localStorage.setItem('passwordResetRequestId', newId);
            setRequestId(newId);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred. Please try again later.");
            setIsLoading(false);
        }
    };
    
    const handleClearRequest = () => {
        localStorage.removeItem('passwordResetRequestId');
        setRequestId(null);
        setRequestData(null);
        setEmail('');
        setMessage('');
    }

    const NewRequestForm = () => (
        <form onSubmit={handleNewRequestSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Please provide your account email and a brief message. An administrator will contact you here to help you regain access.
            </p>
             {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Account Email</label>
                <input type="email" id="reset-email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none"/>
            </div>
            <div>
                <label htmlFor="reset-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <textarea id="reset-message" value={message} onChange={e => setMessage(e.target.value)} rows={3} required className="mt-1 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex justify-end">
                <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
                    {isLoading && <LoadingSpinner className="w-4 h-4 mr-2" />}
                    {isLoading ? 'Submitting...' : 'Submit Request'}
                </button>
            </div>
        </form>
    );

    const ChatView = () => {
        const messagesEndRef = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [requestData?.messages]);

        return (
            <div className="flex flex-col h-[60vh]">
                 <p className="text-sm text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-200 dark:border-gray-700">
                    An admin will respond here. Please check back later. Your request ID is: <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">{requestId}</code>
                </p>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {requestData?.messages?.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'admin' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                                <p className="text-sm">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                 <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                     <p className="text-xs text-center text-gray-500">
                        To start a new request,{' '}
                        <button onClick={handleClearRequest} className="underline hover:text-blue-500">click here</button>.
                    </p>
                 </div>
            </div>
        )
    }
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
        }
        if (error) {
            return (
                <div className="text-center text-red-500 dark:text-red-400 bg-red-500/10 p-4 rounded-md h-48 flex flex-col justify-center">
                    <p className="font-semibold">An Error Occurred</p>
                    <p className="text-sm mt-2">{error}</p>
                </div>
            );
        }
        if (requestId && requestData) {
            return <ChatView />;
        }
        return <NewRequestForm />;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <div className="relative w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Recovery</h2>
                {renderContent()}
            </div>
        </div>
    );
};

export default PasswordResetChatModal;