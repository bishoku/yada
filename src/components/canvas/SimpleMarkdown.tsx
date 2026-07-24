import React from 'react';

interface Props {
  text: string;
  className?: string;
}

export const SimpleMarkdown: React.FC<Props> = ({ text = '', className = '' }) => {
  const safeText = typeof text === 'string' ? text : String(text || '');
  // Pre-process text to replace LaTeX arrows and math symbols with clean Unicode
  const sanitizedText = safeText
    .replace(/\\(?:rightarrow|to)/g, '→')
    .replace(/\$\s*→\s*\$/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\$\s*←\s*\$/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\$\s*⇒\s*\$/g, '⇒')
    .replace(/\\Leftarrow/g, '⇐')
    .replace(/\$\s*⇐\s*\$/g, '⇐')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\$\s*↔\s*\$/g, '↔')
    .replace(/\\Leftrightarrow/g, '⇔')
    .replace(/\$\s*⇔\s*\$/g, '⇔')
    .replace(/\$([^\$]+)\$/g, '$1'); // Strip remaining single inline dollar signs


  const renderLine = (line: string, index: number) => {
    if (!line.trim()) {
      return <div key={`br-${index}`} className="h-2" />;
    }

    let currentText = line;
    let keyCount = 0;

    // Check for headers (#, ##, ###)
    if (currentText.startsWith('# ')) {
      return <h3 key={index} className="font-bold text-sm my-1">{currentText.substring(2)}</h3>;
    }
    if (currentText.startsWith('## ')) {
      return <h4 key={index} className="font-bold text-xs my-1">{currentText.substring(3)}</h4>;
    }
    if (currentText.startsWith('### ')) {
      return <h5 key={index} className="font-semibold text-xs my-0.5">{currentText.substring(4)}</h5>;
    }

    // Check for list item
    const isListItem = currentText.startsWith('- ') || currentText.startsWith('* ') || /^\d+\.\s/.test(currentText);
    const listPrefixMatch = currentText.match(/^(\d+\.|-|\*)\s/);
    let listMarker = '•';
    if (isListItem && listPrefixMatch) {
      listMarker = listPrefixMatch[1].endsWith('.') ? listPrefixMatch[1] : '•';
      currentText = currentText.substring(listPrefixMatch[0].length);
    }

    // Regex approach for inline code (`code`), bold (**text**), and italic (*text*)
    let parsedLine: React.ReactNode[] = [];
    const tokenRegex = /(`.*?`|\*\*.*?\*\*|\*.*?\*)/g;
    const parts = currentText.split(tokenRegex);

    parts.forEach((part) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        parsedLine.push(
          <code key={keyCount++} className="bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      } else if (part.startsWith('**') && part.endsWith('**')) {
        parsedLine.push(<strong key={keyCount++} className="font-semibold">{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('*') && part.endsWith('*')) {
        parsedLine.push(<em key={keyCount++}>{part.slice(1, -1)}</em>);
      } else {
        parsedLine.push(<span key={keyCount++}>{part}</span>);
      }
    });

    if (isListItem) {
      return (
        <div key={index} className="flex gap-1.5 my-0.5">
          <span className="select-none font-semibold shrink-0 text-indigo-500 dark:text-indigo-400">{listMarker}</span>
          <div>{parsedLine}</div>
        </div>
      );
    }

    return <div key={index}>{parsedLine}</div>;
  };

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {sanitizedText.split('\n').map(renderLine)}
    </div>
  );
};

