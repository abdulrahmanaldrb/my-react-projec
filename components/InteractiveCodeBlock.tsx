// components/InteractiveCodeBlock.tsx
import * as React from 'react';
import { ProjectFile } from '../types';
import { HtmlIcon, CssIcon, JsIcon, FileIcon, ClipboardIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface InteractiveCodeBlockProps {
  file: ProjectFile;
  onOpenFile: (fileName: string) => void;
}

const FileTypeIcon = ({ language }: { language: string }) => {
  switch (language) {
    case 'html': return <HtmlIcon className="w-5 h-5 mr-2 flex-shrink-0 text-red-400" />;
    case 'css': return <CssIcon className="w-5 h-5 mr-2 flex-shrink-0 text-blue-400" />;
    case 'javascript': return <JsIcon className="w-5 h-5 mr-2 flex-shrink-0 text-yellow-400" />;
    default: return <FileIcon className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />;
  }
};

const InteractiveCodeBlock: React.FC<InteractiveCodeBlockProps> = ({ file, onOpenFile }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const lineCount = (file.content || '').split('\n').length;
  const PREVIEW_LINES = 10;
  const showMoreButtonNeeded = lineCount > PREVIEW_LINES;
  const previewContent = (file.content || '').split('\n').slice(0, PREVIEW_LINES).join('\n');

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg my-2 text-sm">
      <header className="flex items-center justify-between p-2 border-b border-gray-700">
        <button onClick={() => onOpenFile(file.name)} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
          <FileTypeIcon language={file.language} />
          <span className="font-medium">{file.name}</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors" title="Copy code">
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
          </button>
          {showMoreButtonNeeded && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors" title={isExpanded ? 'Show less' : 'Show more'}>
              {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>
      <div className="relative">
        <pre className={`p-3 overflow-x-auto transition-all duration-300 ${isExpanded ? 'max-h-[500px]' : `max-h-52`}`}>
            <code className={`language-${file.language} text-gray-300 font-mono text-xs leading-relaxed`}>
                {isExpanded ? file.content : previewContent}
            </code>
        </pre>
        {!isExpanded && showMoreButtonNeeded && (
            <div 
                onClick={() => setIsExpanded(true)}
                className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-800 to-transparent flex items-end justify-center pb-2 cursor-pointer"
            >
                <span className="text-gray-400 text-xs bg-gray-700 px-2 py-1 rounded-full hover:bg-gray-600 transition-colors">
                    Show {lineCount - PREVIEW_LINES} more lines
                </span>
            </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveCodeBlock;