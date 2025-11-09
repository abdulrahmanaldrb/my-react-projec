// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ProjectFile } from '../types';
import { FileIcon, HtmlIcon, CssIcon, JsIcon, FolderIcon, ChevronRightIcon, ChevronDownIcon } from './icons';

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

// --- Tree data structure and builder ---
interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
  file?: ProjectFile;
}

const buildFileTree = (files: ProjectFile[]): TreeNode[] => {
  const fileTreeRoot: TreeNode = { name: 'root', path: '', children: [] };
  const nodes: { [path: string]: TreeNode } = { '': fileTreeRoot };

  files.forEach(file => {
      const parts = file.name.split('/');
      parts.forEach((part, index) => {
          const path = parts.slice(0, index + 1).join('/');
          if (!nodes[path]) {
              const parentPath = parts.slice(0, index).join('/');
              const parentNode = nodes[parentPath];
              const newNode: TreeNode = { name: part, path, children: [] };
              if (index === parts.length - 1) { // It's a file
                  newNode.file = file;
                  delete newNode.children;
              }
              nodes[path] = newNode;
              if (parentNode) {
                if (!parentNode.children) parentNode.children = [];
                parentNode.children.push(newNode);
              }
          }
      });
  });

  const sortNodes = (nodes: TreeNode[] | undefined): TreeNode[] | undefined => {
    if (!nodes) return undefined;
    return nodes.sort((a, b) => {
      // Sort folders before files
      if (!!a.file !== !!b.file) {
        return a.file ? 1 : -1;
      }
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  Object.values(nodes).forEach(node => {
      node.children = sortNodes(node.children);
  });
  
  return fileTreeRoot.children || [];
};


// --- Recursive Tree Rendering Component ---
const TreeNodeComponent: React.FC<{
  node: TreeNode;
  onSelectFile: (fileName: string) => void;
  selectedFile: string | null;
  level: number;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (path: string) => void;
}> = ({ node, onSelectFile, selectedFile, level, expandedFolders, toggleFolder }) => {
  const isFolder = !!node.children;
  const isExpanded = expandedFolders[node.path] ?? true;

  if (isFolder) {
    return (
      <li>
        <button
          onClick={() => toggleFolder(node.path)}
          className="w-full text-left px-2 py-1.5 rounded-md transition-colors text-sm flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {isExpanded ? <ChevronDownIcon className="w-4 h-4 mr-1 flex-shrink-0" /> : <ChevronRightIcon className="w-4 h-4 mr-1 flex-shrink-0" />}
          <FolderIcon className="w-5 h-5 mr-2 flex-shrink-0 text-yellow-500" />
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isExpanded && (
          <ul>
            {node.children!.map(child => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                onSelectFile={onSelectFile}
                selectedFile={selectedFile}
                level={level + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // It's a file
  return (
    <li>
      <button
        onClick={() => onSelectFile(node.file!.name)}
        className={`w-full text-left px-2 py-1.5 rounded-md transition-colors text-sm flex items-center ${
            selectedFile === node.file!.name
            ? 'bg-blue-600/20 text-blue-800 dark:text-white dark:bg-blue-600/30'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <FileTypeIcon language={node.file!.language} />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  const fileTree = React.useMemo(() => buildFileTree(files), [files]);
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !(prev[path] ?? true) }));
  };
  
  // Pre-expand all folders on initial load
  React.useEffect(() => {
    const defaultExpanded: Record<string, boolean> = {};
    const expandAll = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
            if(node.children) {
                defaultExpanded[node.path] = true;
                expandAll(node.children);
            }
        });
    };
    expandAll(fileTree);
    setExpandedFolders(defaultExpanded);
  }, [files]); // Re-expand when files change, ensures new folders are open

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-2 h-full overflow-y-auto">
      <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 px-2 tracking-wider uppercase">Explorer</h2>
      {files.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-500 text-sm px-2">No files yet. Start by giving a prompt!</p>
      ) : (
        <ul>
          {fileTree.map(node => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
              level={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileExplorer;