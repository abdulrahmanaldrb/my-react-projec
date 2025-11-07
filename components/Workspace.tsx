// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import { ProjectFile } from '../types';

interface WorkspaceProps {
  files: ProjectFile[];
  onFileSelect: (fileName: string) => void;
  selectedFile: string | null;
  onFileContentChange: (fileName: string, newContent: string) => void;
  readOnly?: boolean;
}

const Workspace: React.FC<WorkspaceProps> = ({ files, onFileSelect, selectedFile, onFileContentChange, readOnly = false }) => {
  const [explorerWidth, setExplorerWidth] = React.useState(250);
  const isResizing = React.useRef(false);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  const activeFile = files.find(f => f.name === selectedFile);

  const handleSave = (newContent: string) => {
    if (activeFile) {
      onFileContentChange(activeFile.name, newContent);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !workspaceRef.current) return;
      
      const parentRect = workspaceRef.current.getBoundingClientRect();
      const newWidth = e.clientX - parentRect.left;

      // Constrain the width
      const constrainedWidth = Math.max(200, Math.min(newWidth, parentRect.width - 400));
      setExplorerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);


  return (
    <div ref={workspaceRef} className="flex h-full w-full">
      <div style={{ width: `${explorerWidth}px` }} className="h-full flex-shrink-0">
        <FileExplorer files={files} selectedFile={selectedFile} onSelectFile={onFileSelect} />
      </div>
      <div 
        onMouseDown={handleMouseDown}
        className="w-1.5 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-blue-600 transition-colors flex-shrink-0"
      ></div>
      <div className="flex-1 h-full min-w-0">
        {activeFile ? (
          <CodeEditor 
            content={activeFile.content} 
            onSave={handleSave}
            readOnly={readOnly}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 bg-[#1e1e1e]">
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;