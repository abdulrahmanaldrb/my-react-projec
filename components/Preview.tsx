// Fix: Changed React import to namespace import to resolve JSX type errors.
import * as React from 'react';
import { ProjectFile } from '../types';

interface PreviewProps {
  files: ProjectFile[];
  currentPath: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  refreshKey: number;
  isMobile: boolean;
}

const Preview: React.FC<PreviewProps> = ({ files, currentPath, iframeRef, refreshKey, isMobile }) => {
  const srcDoc = React.useMemo(() => {
    const htmlFile = files.find(f => f.name === currentPath);
    if (!htmlFile) {
      return '<div style="color: #9ca3af; padding: 1rem; font-family: sans-serif;">No HTML file is selected to preview.</div>';
    }

    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js'));

    const styles = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    const scripts = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');
    
    const navigationInterceptorScript = `
      <script>
        document.addEventListener('click', e => {
          let target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }

          if (target && target.tagName === 'A') {
            const href = target.getAttribute('href');
            // Simple check for relative paths, ignore hashes, mailto, etc.
            if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
              e.preventDefault();
              window.parent.postMessage({ type: 'navigate', path: href }, '*');
            }
          }
        }, true); // Use capture phase to catch event early
      </script>
    `;


    let htmlContent = htmlFile.content;

    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${styles}\n</head>`);
    } else {
      htmlContent = `<html><head>${styles}</head><body>${htmlContent}</body></html>`
    }

    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${navigationInterceptorScript}${scripts}\n</body>`);
    } else {
      htmlContent += navigationInterceptorScript + scripts;
    }

    return htmlContent;
  }, [files, currentPath]);

  if (isMobile) {
    return (
        <div className="h-full w-full bg-gray-900 flex items-center justify-center p-4 overflow-auto">
            <div className="w-[375px] h-[667px] bg-white rounded-2xl border-4 border-gray-900 shadow-2xl overflow-hidden flex-shrink-0 my-auto">
                 <iframe
                    key={refreshKey}
                    ref={iframeRef}
                    srcDoc={srcDoc}
                    title="preview"
                    sandbox="allow-scripts"
                    className="w-full h-full border-none"
                />
            </div>
        </div>
    )
  }

  return (
    <div className="h-full bg-white">
      <iframe
        key={refreshKey}
        ref={iframeRef}
        srcDoc={srcDoc}
        title="preview"
        sandbox="allow-scripts"
        className="w-full h-full border-none"
      />
    </div>
  );
};

export default Preview;