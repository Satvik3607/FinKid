'use client';

import { useState, useEffect } from 'react';
import { BookOpen, User, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ role, content, sources, followUpQuestions, chart, onFollowUpClick }) {
  const isUser = role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
    
    // Cleanup if component unmounts while this message is playing
    return () => {
      if (isPlaying && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Stop any other currently playing speeches globally
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'en-US';
    
    // Select a voice that sounds friendlier/warmer
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    
    // Search priorities for kid-friendly/natural/clear voices
    // We prefer Edge Natural, Google Natural/Standard, macOS Samantha, or general friendly voices
    const priorityKeywords = ['natural', 'google', 'samantha', 'zira', 'hazel', 'karen', 'daniel', 'david'];
    let selectedVoice = null;
    for (const kw of priorityKeywords) {
      selectedVoice = enVoices.find(v => v.name.toLowerCase().includes(kw));
      if (selectedVoice) break;
    }
    
    // Fallback to first English voice
    if (!selectedVoice && enVoices.length > 0) {
      selectedVoice = enVoices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Slightly adjust pitch (warmer/clearer for kids) and rate (slightly slower for clarity)
    utterance.pitch = 1.1; // Range: 0 to 2, Default: 1
    utterance.rate = 0.9;  // Range: 0.1 to 10, Default: 1

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex gap-3 max-w-full lg:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1 ${
            isUser
              ? 'bg-brand-600 text-white'
              : 'bg-brand-500 text-white shadow-sm'
          }`}
        >
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        {/* Bubble */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-x-auto ${
              isUser
                ? 'bg-brand-500 text-white rounded-tr-md shadow-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md shadow-sm'
            }`}
          >
            {/* Render content with ReactMarkdown for Assistant, plain text for User */}
            {isUser ? (
              content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))
            ) : (
              <div className="prose prose-sm prose-brand max-w-none text-gray-800 
                prose-p:leading-relaxed prose-p:my-2 
                prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 
                prose-headings:text-gray-900 prose-headings:font-bold prose-headings:mb-2
                prose-table:border-collapse prose-table:w-auto prose-table:min-w-[50%] prose-table:my-4
                prose-th:bg-brand-50 prose-th:p-2 prose-th:border prose-th:border-gray-200 prose-th:text-left
                prose-td:p-2 prose-td:border prose-td:border-gray-200
                prose-strong:text-gray-900 prose-strong:font-bold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
            
            {/* Render Chart if available */}
            {!isUser && chart && chart.data && chart.labels && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm w-full min-w-[280px] sm:min-w-[400px]">
                {chart.title && <h4 className="text-sm font-bold text-gray-700 mb-4 text-center">{chart.title}</h4>}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'pie' ? (
                      <PieChart>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Pie 
                          data={chart.labels.map((l, i) => ({name: l, value: chart.data[i]}))} 
                          cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chart.labels.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'][index % 6]} />
                          ))}
                        </Pie>
                      </PieChart>
                    ) : chart.type === 'line' ? (
                      <LineChart data={chart.labels.map((l, i) => ({name: l, value: chart.data[i]}))} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    ) : (
                      <BarChart data={chart.labels.map((l, i) => ({name: l, value: chart.data[i]}))} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons and Source attribution for assistant messages */}
          {!isUser && (
            <div className="flex flex-col gap-2 mt-2 ml-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Text-to-speech button */}
                {speechSupported && (
                  <button
                    onClick={toggleSpeech}
                    className="p-1 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-md transition-colors"
                    title={isPlaying ? "Stop reading aloud" : "Read aloud"}
                  >
                    {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                )}

                {sources && sources.length > 0 && (
                  /* Deduplicate sources by name */
                  [...new Set(sources.map((s) => s.source))].map((sourceName) => (
                    <span
                      key={sourceName}
                      className="inline-flex items-center gap-1 text-[11px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full"
                    >
                      <BookOpen size={10} />
                      {sourceName.replace(/_/g, ' ')}
                    </span>
                  ))
                )}
              </div>

              {/* Follow-up Questions */}
              {followUpQuestions && followUpQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {followUpQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onFollowUpClick && onFollowUpClick(q)}
                      className="px-3 py-1.5 text-[13px] bg-white rounded-full border border-brand-200 text-brand-600 hover:bg-brand-50 hover:border-brand-400 transition-all shadow-sm font-medium"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
