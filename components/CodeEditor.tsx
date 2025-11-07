// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';

interface CodeEditorProps {
  content: string;
  onSave: (newContent: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ content, onSave, readOnly = false }) => {
  const [editedContent, setEditedContent] = React.useState(content);
  const [isEditing, setIsEditing] = React.useState(false);

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

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col relative">
       {isEditing && !readOnly && (
        <div className="absolute top-2 right-4 z-20">
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
      <textarea
        value={editedContent}
        onChange={handleContentChange}
        readOnly={readOnly}
        spellCheck="false"
        className="w-full h-full bg-[#1e1e1e] text-gray-200 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none"
        style={{
           fontFamily: '"Fira Code", "Dank Mono", monospace',
           lineHeight: '1.5rem',
           fontSize: '14px',
        }}
      />
    </div>
  );
};

export default CodeEditor;