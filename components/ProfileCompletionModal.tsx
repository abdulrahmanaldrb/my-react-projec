// components/ProfileCompletionModal.tsx
import * as React from 'react';
import { uploadFileToLocalServer, getPublicUrl, isUploadServerAvailable } from '../services/uploadService';

interface Props {
  onSave: (data: { displayName?: string; firstName?: string; lastName?: string; phone?: string; address?: string; photoURL?: string; }) => Promise<void>;
  onClose: () => void;
  defaultValues?: Partial<{ displayName: string; firstName: string; lastName: string; phone: string; address: string; photoURL: string; }>;
}

const ProfileCompletionModal: React.FC<Props> = ({ onSave, onClose, defaultValues }) => {
  const [displayName, setDisplayName] = React.useState(defaultValues?.displayName || '');
  const [firstName, setFirstName] = React.useState(defaultValues?.firstName || '');
  const [lastName, setLastName] = React.useState(defaultValues?.lastName || '');
  const [phone, setPhone] = React.useState(defaultValues?.phone || '');
  const [address, setAddress] = React.useState(defaultValues?.address || '');
  const [photoURL, setPhotoURL] = React.useState(defaultValues?.photoURL || '');
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let finalPhoto = photoURL;
      if (file) {
        const serverOnline = await isUploadServerAvailable();
        if (!serverOnline) {
          setWarning('تعذّر رفع الصورة: خادم الرفع غير متاح حالياً. تم حفظ باقي الحقول ويمكنك إعادة المحاولة لاحقاً.');
        } else {
          try {
            const res = await uploadFileToLocalServer(file);
            if (!res.ok || !res.path) throw new Error(res.error || 'Upload failed');
            finalPhoto = getPublicUrl(res.path);
          } catch (e: any) {
            // Upload server may be offline; continue saving other fields
            setWarning('تعذّر رفع الصورة: خادم الرفع غير متاح حالياً. تم حفظ باقي الحقول ويمكنك إعادة المحاولة لاحقاً.');
          }
        }
      }
      await onSave({ displayName, firstName, lastName, phone, address, photoURL: finalPhoto || undefined });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">اكتمال الملف الشخصي</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">يرجى تزويدنا ببعض المعلومات الأساسية لإكمال ملفك.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <div className="text-red-600 text-sm bg-red-500/10 p-2 rounded">{error}</div>}
          {warning && <div className="text-yellow-700 text-sm bg-yellow-500/10 p-2 rounded">{warning}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">الاسم الظاهر</label>
              <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm mb-1">الاسم الأول</label>
              <input value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm mb-1">الاسم الأخير</label>
              <input value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الهاتف</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">العنوان</label>
              <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm mb-1">رابط الصورة (اختياري)</label>
              <input value={photoURL} onChange={e=>setPhotoURL(e.target.value)} placeholder="http://localhost:4001/uploads/images/..." className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm mb-1">أو اختر صورة للرفع</label>
              <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm">إلغاء</button>
            <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
