'use client';

import { Send } from 'lucide-react';

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Waiting for reply...' : 'Ask me anything about money!'}
        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-base sm:text-sm
                   placeholder:text-gray-400 focus:border-brand-400 focus:bg-white
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        maxLength={500}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-500 text-white
                   flex items-center justify-center btn-glow
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                   disabled:transform-none transition-all"
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
