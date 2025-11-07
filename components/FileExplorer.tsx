

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ProjectFile } from '../types';
import { FileIcon, HtmlIcon, CssIcon, JsIcon } from './icons';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (fileName: string) => void;
}

const FileTypeIcon = ({ language }: { language: string }) => {
  switch (language) {
    case 'html':
      return <HtmlIcon className="w-5 h-5 mr-2 flex-shrink-0 text-red-400" />;
    case 'css':
      return <CssIcon className="w-5 h-5 mr-2 flex-shrink-0 text-blue-400" />;
    case 'javascript':
      return <JsIcon className="w-5 h-5 mr-2 flex-shrink-0 text-yellow-400" />;
    default:
      return <FileIcon className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400 dark:text-gray-500" />;
  }
};


const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-2 h-full overflow-y-auto">
      <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 px-2 tracking-wider uppercase">Explorer</h2>
      {files.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-500 text-sm px-2">No files yet. Start by giving a prompt!</p>
      ) : (
        <ul>
            {files.map((file) => (
            <li key={file.name}>
                <button
                onClick={() => onSelectFile(file.name)}
                className={`w-full text-left px-2 py-1.5 rounded-md transition-colors text-sm flex items-center ${
                    selectedFile === file.name
                    ? 'bg-blue-600/20 text-blue-800 dark:text-white dark:bg-blue-600/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                >
                <FileTypeIcon language={file.language} />
                <span className="truncate">{file.name}</span>
                </button>
            </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default FileExplorer;