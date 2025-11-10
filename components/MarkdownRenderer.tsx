// components/MarkdownRenderer.tsx

// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { CheckIcon, ClipboardIcon } from './icons';

// Regex to capture inline markdown formats: links, bold, italic, and code.
const inlineRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^\*]+)\*\*|\*([^\*]+)\*|`([^`]+)`/g;

/**
 * Parses a line of text for inline markdown and returns an array of strings and React elements.
 * @param text The string to parse.
 * @returns An array of nodes for rendering.
 */
const parseInline = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = inlineRegex.exec(text)) !== null) {
    // Push the text segment before the current match
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }
    
    const [fullMatch, linkText, linkUrl, boldText, italicText, codeText] = match;

    if (linkText && linkUrl) {
      elements.push(<a key={match.index} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{linkText}</a>);
    } else if (boldText) {
      elements.push(<strong key={match.index} className="font-bold">{boldText}</strong>);
    } else if (italicText) {
      elements.push(<em key={match.index} className="italic">{italicText}</em>);
    } else if (codeText) {
      elements.push(<code key={match.index} className="bg-gray-900 rounded-md px-1.5 py-0.5 text-sm font-mono text-red-300">{codeText}</code>);
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Push any remaining text after the last match
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  return elements;
};


// Fix: Defined props interface and used React.FC to correctly type the CodeBlock component.
interface CodeBlockProps {
    code: string;
    language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
    const [copied, setCopied] = React.useState(false);
    const codeRef = React.useRef<HTMLElement | null>(null);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const hljsLang = React.useMemo(() => {
        const lang = (language || '').toLowerCase();
        if (lang === 'html') return 'xml';
        if (lang === 'js') return 'javascript';
        return lang || '';
    }, [language]);

    const [hlReadyTick, setHlReadyTick] = React.useState(0);

    // When highlight.js finishes loading after initial render, trigger a recompute once
    React.useEffect(() => {
        if ((window as any)?.hljs) return; // already available
        const timer = setTimeout(() => {
            if ((window as any)?.hljs) setHlReadyTick(t => t + 1);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const highlighted = React.useMemo(() => {
        const hljs = (window as any)?.hljs;
        if (!hljs) return null;
        try {
            if (hljsLang) {
                return hljs.highlight(code, { language: hljsLang }).value;
            }
            return hljs.highlightAuto(code).value;
        } catch {
            return null;
        }
    }, [code, hljsLang, hlReadyTick]);

    return (
        <div className="bg-gray-900/70 rounded-md my-2 relative group text-left">
            <div className="text-xs text-gray-400 px-4 py-1.5 border-b border-gray-700/50 flex justify-between items-center">
                <span>{language || 'code'}</span>
                 <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 p-1 bg-gray-700 rounded-md text-gray-300 transition-colors hover:bg-gray-600"
                >
                    {copied ? (
                        <>
                            <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs">Copied!</span>
                        </>
                    ) : (
                        <>
                           <ClipboardIcon className="w-3.5 h-3.5" />
                           <span className="text-xs">Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre dir="ltr" className="p-4 overflow-x-auto text-left">
                {highlighted ? (
                    <code ref={codeRef} className={`hljs text-sm`} dangerouslySetInnerHTML={{ __html: highlighted }} />
                ) : (
                    <code ref={codeRef} className={`${hljsLang ? `language-${hljsLang}` : ''} hljs text-sm`}>{code}</code>
                )}
            </pre>
        </div>
    );
};


/**
 * A lightweight component to render markdown content into styled React components.
 */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const blocks = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="text-sm space-y-3 prose-p:my-0">
            {blocks.map((block, index) => {
                if (!block) return null;
                const codeBlockMatch = block.match(/^```(\w*)\n?([\s\S]*?)```$/);
                if (codeBlockMatch) {
                    const [, language, code] = codeBlockMatch;
                    return <CodeBlock key={index} language={language} code={code} />;
                }

                // Not a code block, so parse other markdown elements
                const elements: React.ReactNode[] = [];
                const lines = block.split('\n');
                let currentListType: 'ul' | 'ol' | null = null;
                let listItems: React.ReactNode[] = [];

                const closeCurrentList = () => {
                    if (currentListType && listItems.length > 0) {
                        const listKey = `list-${index}-${elements.length}`;
                        if (currentListType === 'ul') {
                            elements.push(<ul key={listKey} className="list-disc list-inside space-y-1 my-2 pl-2">{listItems}</ul>);
                        } else {
                            elements.push(<ol key={listKey} className="list-decimal list-inside space-y-1 my-2 pl-2">{listItems}</ol>);
                        }
                    }
                    currentListType = null;
                    listItems = [];
                };

                lines.forEach((line, lineIndex) => {
                    const lineKey = `line-${index}-${lineIndex}`;
                    if (line.startsWith('# ')) { closeCurrentList(); elements.push(<h1 key={lineKey} className="text-xl font-bold mt-4 mb-2 pb-1 border-b border-gray-600">{parseInline(line.substring(2))}</h1>); return; }
                    if (line.startsWith('## ')) { closeCurrentList(); elements.push(<h2 key={lineKey} className="text-lg font-bold mt-3 mb-1.5">{parseInline(line.substring(3))}</h2>); return; }
                    if (line.startsWith('### ')) { closeCurrentList(); elements.push(<h3 key={lineKey} className="text-base font-bold mt-2 mb-1">{parseInline(line.substring(4))}</h3>); return; }
                    if (line.match(/^(\s*---\s*)$/)) { closeCurrentList(); elements.push(<hr key={lineKey} className="my-4 border-gray-600" />); return; }
                    if (line.startsWith('> ')) { closeCurrentList(); elements.push(<blockquote key={lineKey} className="pl-4 border-l-4 border-gray-500 italic text-gray-400">{parseInline(line.substring(2))}</blockquote>); return; }

                    const ulMatch = line.match(/^(\s*-\s+)(.*)/);
                    if (ulMatch) {
                        if (currentListType !== 'ul') { closeCurrentList(); currentListType = 'ul'; }
                        listItems.push(<li key={lineKey}>{parseInline(ulMatch[2])}</li>); return;
                    }

                    const olMatch = line.match(/^(\s*\d+\.\s+)(.*)/);
                    if (olMatch) {
                        if (currentListType !== 'ol') { closeCurrentList(); currentListType = 'ol'; }
                        listItems.push(<li key={lineKey}>{parseInline(olMatch[2])}</li>); return;
                    }

                    closeCurrentList();
                    if (line.trim() !== '') {
                        elements.push(<p key={lineKey}>{parseInline(line)}</p>);
                    }
                });

                closeCurrentList();
                return <React.Fragment key={index}>{elements}</React.Fragment>;
            })}
        </div>
    );
};

export default MarkdownRenderer;