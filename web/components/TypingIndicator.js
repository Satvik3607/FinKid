'use client';

import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 message-enter">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white shadow-sm flex items-center justify-center text-sm">
          <Sparkles size={16} />
        </div>

        {/* Typing bubble */}
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-5 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 mr-1">FinKid is thinking</span>
            <span
              className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce-dots"
              style={{ animationDelay: '0s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce-dots"
              style={{ animationDelay: '0.16s' }}
            />
            <span
              className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce-dots"
              style={{ animationDelay: '0.32s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
