// components/DeveloperIntroModal.tsx
// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { XMarkIcon } from './icons';

interface DeveloperIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const DeveloperIntroModal: React.FC<DeveloperIntroModalProps> = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;
  
  const developerImageUrl = "https://drive.google.com/uc?id=1183TF0xa-mgDnOOWrSpz8qBnWA3h9NRw";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 bg-black/60">
      <div 
        dir="rtl"
        className="relative w-full max-w-lg p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 left-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" 
          title="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
            <img 
              src={developerImageUrl} 
              alt="المبرمج عبدالرحمن سلطان الدرب" 
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-blue-500 shadow-lg"
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">مرحباً بك، {userName}!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">رسالة من مطور المنصة</p>

            <div className="text-right text-gray-700 dark:text-gray-300 space-y-3 text-base">
                <p>
                    <strong>المبرمج عبدالرحمن سلطان الدرب،</strong> طالب في جامعة القلم – المستوى الرابع، شغوف بعالم التقنية وتطوير البرمجيات، ويُعرف بحبه للابتكار والبحث عن الحلول الذكية التي تُسهم في تسهيل حياة المبرمجين.
                </p>
                <p>
                    قام بتطوير هذا الموقع بطريقة فريدة ومبسطة تهدف إلى مساعدة المبرمجين على إنشاء تطبيقات الويب بسهولة، وذلك من خلال إدخال فكرة المشروع فقط، ليقوم النظام بتوليد التطبيق بشكل كامل حتى مراحله النهائية، دون الحاجة للتعامل مع التفاصيل البرمجية المعقدة.
                </p>
                <p>
                    يهدف عبدالرحمن من خلال هذا العمل إلى تمكين المبرمجين والمبدعين من تحويل أفكارهم إلى واقع عملي بسرعة وكفاءة، وجعل تطوير الويب تجربة ممتعة وسهلة للجميع.
                </p>
            </div>
        </div>

        <div className="mt-8 text-center">
            <button 
                onClick={onClose}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition-colors"
            >
                ابدأ الآن
            </button>
        </div>
      </div>
       <style>{`
            @keyframes fade-in-scale {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in-scale {
                animation: fade-in-scale 0.3s ease-out forwards;
            }
       `}</style>
    </div>
  );
};

export default DeveloperIntroModal;