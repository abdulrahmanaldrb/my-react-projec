// components/ShareProjectModal.tsx -> Now functions as PublishModal
import * as React from 'react';
import { Project, ShareData } from '../types';
import { XMarkIcon, LoadingSpinner, CheckBadgeIcon, ClockIcon } from './icons';
import { PROJECT_CATEGORIES } from '../constants';
import { submitProjectForReview } from '../services/firebaseService';
import { uploadFileToLocalServer, getPublicUrl, isUploadServerAvailable } from '../services/uploadService';
import { useLanguage } from '../App';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  showToast: (message: string) => void;
}

const ShareProjectModal: React.FC<PublishModalProps> = ({ isOpen, onClose, project, showToast }) => {
  const [formData, setFormData] = React.useState<Omit<ShareData, 'status' | 'submittedAt' | 'reviewedAt'>>({
    description: project.shareData?.description || '',
    category: project.shareData?.category || 'Website',
    permissions: {
      allowDownload: project.shareData?.permissions.allowDownload || false,
      clonePermission: project.shareData?.permissions.clonePermission || 'none',
    },
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const coverPreview = React.useMemo(() => coverFile ? URL.createObjectURL(coverFile) : (project.shareData?.coverImage || ''), [coverFile, project.shareData?.coverImage]);
  const { t } = useLanguage();
  
  const cropToAspect = async (file: File, aspect = 16/9, maxWidth = 1280): Promise<Blob> => {
    const img = document.createElement('img');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    img.src = dataUrl;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });

    const iw = img.naturalWidth; const ih = img.naturalHeight; const imgAspect = iw / ih;
    // Determine crop box centered
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (imgAspect > aspect) {
      // too wide -> crop width
      sh = ih; sw = ih * aspect; sx = (iw - sw) / 2; sy = 0;
    } else {
      // too tall -> crop height
      sw = iw; sh = iw / aspect; sx = 0; sy = (ih - sh) / 2;
    }

    // Scale down if needed
    const outW = Math.min(maxWidth, sw);
    const scale = outW / sw;
    const outH = Math.round(sh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(outW);
    canvas.height = Math.round(outH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
  };

  const isSubmitted = project.shareData?.status === 'pending' || project.shareData?.status === 'approved';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'allowDownload') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, allowDownload: checked } }));
    } else if (name === 'clonePermission') {
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, clonePermission: value as any } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
        setError("Please provide a project description.");
        return;
    }
    setError('');
    setIsLoading(true);
    try {
        let coverImage: string | undefined = formData.coverImage || project.shareData?.coverImage;
        if (coverFile) {
          const online = await isUploadServerAvailable();
          if (online) {
            const blob = await cropToAspect(coverFile, 16/9, 1280);
            const croppedFile = new File([blob], coverFile.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '') + '_16x9.jpg', { type: 'image/jpeg' });
            const res = await uploadFileToLocalServer(croppedFile, { dir: 'images/web' });
            if (res.ok && res.path) coverImage = getPublicUrl(res.path);
          } else {
            setError(t('upload.serverOffline'));
          }
        }
        await submitProjectForReview(project, { ...formData, coverImage });
        showToast("Project submitted for review!");
        onClose();
    } catch (err: any) {
        setError(err.message || "Failed to submit project.");
        showToast(err.message || "Failed to submit project.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  
  const status = project.shareData?.status;
  
  const StatusBanner = () => {
    if (status === 'approved') {
        return <div className="mb-4 p-3 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-md text-sm flex items-center gap-2"><CheckBadgeIcon className="w-5 h-5"/> Your project is live in the marketplace!</div>
    }
    if (status === 'pending') {
        return <div className="mb-4 p-3 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-md text-sm flex items-center gap-2"><ClockIcon className="w-5 h-5"/> Your project is pending review.</div>
    }
    if (status === 'rejected') {
        return <div className="mb-4 p-3 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md text-sm">Your previous submission was not approved. You can make changes and submit again.</div>
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Publish "{project.name}"</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Configure your project's details and permissions before submitting it for review.</p>
        
        <StatusBanner />

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.publish.coverImageLabel')}</label>
                <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={(e)=>setCoverFile(e.target.files?.[0] || null)} disabled={isSubmitted} />
                    {coverPreview && (
                      <img src={coverPreview} alt="Cover Preview" className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600" />
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('modals.publish.coverHelp')}</p>
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe your project for the marketplace..."
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                    disabled={isSubmitted}
                    required
                />
            </div>
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select 
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                    disabled={isSubmitted}
                >
                    {PROJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            
            <fieldset className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <legend className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Permissions</legend>
                <div className="space-y-3">
                     <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id="allowDownload"
                                name="allowDownload"
                                type="checkbox"
                                checked={formData.permissions.allowDownload}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 text-blue-600 focus:ring-blue-500"
                                disabled={isSubmitted}
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor="allowDownload" className="font-medium text-gray-700 dark:text-gray-300">Allow Download</label>
                            <p className="text-gray-500 dark:text-gray-400">Permit users to download the project's source code as a .zip file.</p>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="clonePermission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cloning Permissions</label>
                        <select
                            id="clonePermission"
                            name="clonePermission"
                            value={formData.permissions.clonePermission}
                            onChange={handleChange}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600"
                            disabled={isSubmitted}
                        >
                            <option value="none">Cloning not allowed</option>
                            <option value="files_only">Allow cloning of files only</option>
                            <option value="files_and_chat">Allow cloning files and chat history</option>
                        </select>
                     </div>
                </div>
            </fieldset>

            {error && <p className="text-red-500 dark:text-red-400 text-sm text-center mt-2">{error}</p>}
            
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                    type="submit"
                    disabled={isLoading || isSubmitted}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
                >
                    {isLoading ? <LoadingSpinner className="w-5 h-5"/> : 
                     status === 'approved' ? 'Approved' :
                     status === 'pending' ? 'Pending Review' :
                     status === 'rejected' ? 'Re-submit for Review' :
                     'Submit for Review'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ShareProjectModal;