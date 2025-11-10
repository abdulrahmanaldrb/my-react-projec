// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';

interface CodeEditorProps {
  content: string;
  onSave: (newContent: string) => void;
  readOnly?: boolean;
  fileName?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ content, onSave, readOnly = false, fileName }) => {
  const [editedContent, setEditedContent] = React.useState(content);
  const [isEditing, setIsEditing] = React.useState(false);
  const codeRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    onSave(editedContent);
    setIsEditing(false);
  };

  const languageFromFile = React.useMemo(() => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'html' || ext === 'htm') return 'xml';
    if (ext === 'css') return 'css';
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'javascript';
    if (ext === 'ts') return 'typescript';
    if (ext === 'json') return 'json';
    return '';
  }, [fileName]);

  const [hlReadyTick, setHlReadyTick] = React.useState(0);
  React.useEffect(() => {
    if ((window as any)?.hljs) return;
    const timer = setTimeout(() => {
      if ((window as any)?.hljs) setHlReadyTick(t => t + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const highlightedHtml = React.useMemo(() => {
    const hljs = (window as any)?.hljs;
    if (!hljs) return null;
    try {
      if (languageFromFile) {
        return hljs.highlight(editedContent, { language: languageFromFile }).value;
      }
      return hljs.highlightAuto(editedContent).value;
    } catch {
      return null;
    }
  }, [editedContent, languageFromFile, hlReadyTick]);

  // Decide view mode
  const showHighlighted = readOnly || !isEditing;

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col relative">
      <div className="absolute top-2 right-4 z-20 flex gap-2">
        {!readOnly && showHighlighted && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
          >
            Edit
          </button>
        )}
        {isEditing && !readOnly && (
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>

      {showHighlighted && highlightedHtml !== null ? (
        <pre dir="ltr" className="w-full h-full overflow-auto p-4 text-left"><code ref={codeRef} className={`hljs language-${languageFromFile} text-sm`} dangerouslySetInnerHTML={{ __html: highlightedHtml }} /></pre>
      ) : (
        <textarea
          value={editedContent}
          onChange={handleContentChange}
          readOnly={readOnly}
          spellCheck="false"
          dir="ltr"
          className="w-full h-full bg-[#1e1e1e] text-gray-200 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none text-left"
          style={{
            fontFamily: '"Fira Code", "Dank Mono", monospace',
            lineHeight: '1.5rem',
            fontSize: '14px',
          }}
        />
      )}
    </div>
  );
};

export default CodeEditor;