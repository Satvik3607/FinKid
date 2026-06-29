'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LogOut, Sparkles, MessageCircle, AlertCircle, BookOpen, Trophy, Menu, Plus, MessageSquare, HelpCircle, ThumbsUp } from 'lucide-react';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import { getAvatar } from '@/lib/avatars';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const [session, setSession] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true); // auth check loading
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState('');

  // ── Auth guard ──
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        router.replace('/login');
        return;
      }

      setSession(currentSession);
      setUsername(currentSession.user?.user_metadata?.username || 'Friend');
      
      
      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();
        
      setUserStats(statsData || {
        total_points: 0,
        current_level: 'Money Newbie',
      });
      
      // Fetch user profile data
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();
        
      if (userProfile) {
        setUserData(userProfile);
      }

      // Fetch conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('updated_at', { ascending: false });
        
      if (convs) {
        setConversations(convs);
      }

      setLoading(false);
    };

    checkSession();

    // Listen for auth changes (e.g. token refresh, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.replace('/login');
      } else {
        setSession(newSession);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Logout ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  // ── Load Conversation ──
  const loadConversation = async (id) => {
    setLoading(true);
    setConversationId(id);
    setIsSidebarOpen(false);
    
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Parse sources correctly for compatibility with old chat state
      const formattedMsgs = (msgs || []).map(m => ({
        ...m,
        sources: typeof m.sources === 'string' ? JSON.parse(m.sources) : m.sources
      }));
      setMessages(formattedMsgs);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Could not load that conversation.');
    } finally {
      setLoading(false);
    }
  };

  // ── New Chat ──
  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  // ── Send message ──
  const handleSend = async (textOverride = null) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input;
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError('');
    setInput('');

    // Optimistically add user message
    const userMsg = { role: 'user', content: trimmed, sources: [] };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      // Get fresh token
      const {
        data: { session: freshSession },
      } = await supabase.auth.getSession();

      if (!freshSession) {
        setError('Your session has expired. Please log in again.');
        router.replace('/login');
        return;
      }

      console.log(`Sending to: ${BACKEND_URL}/api/chat`);
      console.log(`Token starts with: ${freshSession.access_token.substring(0, 20)}...`);
      
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession.access_token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const detail = errData.detail || `Server error (${res.status})`;

        if (res.status === 401) {
          setError('Your session has expired. Please log in again.');
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        throw new Error(detail);
      }

      const data = await res.json();

      // Update conversation ID for follow-up messages
      if (data.conversation_id) {
        if (!conversationId) {
          // Need to refresh conversations list to show the new one
          supabase
            .from('conversations')
            .select('*')
            .eq('user_id', freshSession.user.id)
            .order('updated_at', { ascending: false })
            .then(({ data: convs }) => {
              if (convs) setConversations(convs);
            });
        }
        setConversationId(data.conversation_id);
      }

      // Add assistant reply
      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        sources: data.sources || [],
        followUpQuestions: data.follow_up_questions || [],
        chart: data.chart || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', freshSession.user.id)
        .maybeSingle();
        
      if (statsData) {
        setUserStats(statsData);
      }
    } catch (err) {
      console.error('Chat error:', err);

      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError(
          "Oops! Can't reach the server right now. Make sure the backend is running and try again."
        );
      } else {
        setError(err.message || 'Something went wrong. Please try again!');
      }

      // Remove the optimistic user message on error so they can retry
      // (optional — keep it for context, but show the error)
    } finally {
      setSending(false);
    }
  };

  // ── Auth loading state ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-chat">
        <div className="animate-pulse text-brand-500 font-medium">Loading your chat...</div>
      </div>
    );
  }

  // ── Time-based greeting ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning! Ready to learn something new about money today?";
    if (hour >= 12 && hour < 17) return "Good afternoon! Let's explore some money topics.";
    if (hour >= 17 && hour < 21) return "Good evening! Got any money questions on your mind?";
    return "Up late? Let's squeeze in a quick money lesson.";
  };

  return (
    <div className="h-full flex overflow-hidden bg-gradient-chat">
      
      {/* ── Sidebar ── */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-heading font-extrabold text-lg text-brand-600">History</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-4">No past chats yet.</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 mb-1 transition-colors ${
                  conversationId === conv.id ? 'bg-brand-50 border border-brand-100' : 'hover:bg-gray-50'
                }`}
              >
                <MessageSquare size={16} className={`mt-0.5 flex-shrink-0 ${conversationId === conv.id ? 'text-brand-500' : 'text-gray-400'}`} />
                <div className="overflow-hidden min-w-0">
                  <p className={`text-sm truncate ${conversationId === conv.id ? 'font-semibold text-brand-700' : 'font-medium text-gray-700'}`}>
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* ── Header ── */}
        <header className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-brand-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-lg text-brand-600 tracking-tight leading-none">
                FinKid
              </span>
              <span className="text-[11px] text-gray-500 font-medium mt-1">Your money learning buddy</span>
            </div>
          </div>

        <div className="flex items-center gap-4">
          <Link
            href="/faq"
            className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HelpCircle size={16} /> FAQ
          </Link>
          <Link
            href="/feedback"
            className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ThumbsUp size={16} /> Feedback
          </Link>
          <Link
            href="/courses"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <BookOpen size={16} />
            Courses
          </Link>
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-full transition-colors border border-yellow-200"
          >
            <Trophy size={16} />
            {userStats ? `Lvl ${userStats.current_level} (${userStats.total_points}pt)` : 'Profile'}
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <span className="text-sm text-gray-500">
              Hey, <span className="font-bold text-gray-800">{userData?.display_name || username}</span>!
            </span>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatar(userData?.avatar_id).bgColor} flex items-center justify-center text-white shadow-sm`}>
              {(() => {
                const Icon = getAvatar(userData?.avatar_id).icon;
                return <Icon size={16} />;
              })()}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-coral-500 transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
        {messages.length === 0 && !sending ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-brand-500 text-white shadow-lg">
              <Sparkles size={32} />
            </div>
            <h2 className="font-heading font-semibold text-2xl text-gray-800 mb-8 max-w-md px-4 leading-snug">
              {getGreeting()}
            </h2>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                'What is a budget?',
                'How do credit cards work?',
                'What is compound interest?',
                'How can I save for a toy?',
                'How do banks work?'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="px-4 py-2 text-sm bg-white rounded-full border border-brand-200
                             text-brand-600 hover:bg-brand-50 hover:border-brand-400
                             transition-all shadow-sm font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
                followUpQuestions={msg.followUpQuestions}
                chart={msg.chart}
                onFollowUpClick={handleSend}
              />
            ))}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Error toast ── */}
      {error && (
        <div className="mx-4 mb-2 animate-slide-up">
          <div className="flex items-center gap-2 bg-coral-50 text-coral-600 text-sm px-4 py-3 rounded-xl border border-coral-100">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError('')}
              className="text-coral-400 hover:text-coral-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={sending}
      />
      </div>
    </div>
  );
}
