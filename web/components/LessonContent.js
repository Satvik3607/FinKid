import React from 'react';

export default function LessonContent({ content }) {
  if (!content) return null;

  const renderParagraph = (text, pIdx) => {
    const regex = /\{\{term:([^|]+)\|([^}]+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    
    let match;
    let keyIdx = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<React.Fragment key={`text-${keyIdx++}`}>{text.substring(lastIndex, match.index)}</React.Fragment>);
      }
      
      const word = match[1];
      const definition = match[2];
      
      parts.push(
        <span key={`term-${keyIdx++}`} className="group relative inline-block cursor-pointer">
          <span className="text-brand-600 font-medium underline decoration-brand-300 underline-offset-4 decoration-2 hover:bg-brand-50 rounded transition-colors px-0.5">
            {word}
          </span>
          <span className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-64 p-3 bg-gray-900 text-white text-sm leading-relaxed rounded-xl shadow-xl z-20 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
            {definition}
          </span>
        </span>
      );
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(<React.Fragment key={`text-${keyIdx++}`}>{text.substring(lastIndex)}</React.Fragment>);
    }
    
    return <p key={`p-${pIdx}`} className="mb-4 last:mb-0">{parts}</p>;
  };

  return (
    <div className="text-gray-700 text-lg leading-relaxed">
      {content.split('\n').map((paragraph, idx) => renderParagraph(paragraph, idx))}
    </div>
  );
}
