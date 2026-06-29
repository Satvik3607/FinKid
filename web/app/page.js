'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, LogIn, UserPlus, Wallet, BarChart3, Target, Bot, BookOpen, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/chat');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center">
        <div className="animate-pulse text-brand-500 text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-landing flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <span className="font-heading font-extrabold text-lg text-brand-600 tracking-tight leading-none">
            FinKid
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => router.push('/signup')}
            className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-xl btn-glow"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-2xl animate-fade-in">
          {/* Icon cluster */}
          <div className="flex justify-center gap-6 mb-8 text-brand-400">
            <Wallet size={48} strokeWidth={1.5} />
            <BarChart3 size={48} strokeWidth={1.5} />
            <Target size={48} strokeWidth={1.5} />
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl text-gray-900 leading-tight mb-4">
            Learn About Money
            <br />
            <span className="bg-gradient-to-r from-brand-500 via-coral-400 to-sunny-500 bg-clip-text text-transparent">
              The Fun Way!
            </span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Chat with your friendly AI money buddy. Ask questions about saving,
            investing, budgets, and more — explained just for you!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-500 text-white
                         font-semibold rounded-2xl text-base btn-glow"
            >
              <UserPlus size={20} />
              Create My Account
            </button>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-brand-600
                         font-semibold rounded-2xl text-base border-2 border-brand-200
                         hover:border-brand-400 hover:bg-brand-50 transition-all"
            >
              <LogIn size={20} />
              I Already Have One
            </button>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: <Bot size={32} className="text-brand-500" />,
                title: 'Smart AI Tutor',
                desc: 'Ask any money question and get a clear, friendly answer.',
              },
              {
                icon: <BookOpen size={32} className="text-brand-500" />,
                title: 'Real Knowledge',
                desc: 'Answers come from trusted financial literacy books.',
              },
              {
                icon: <Lock size={32} className="text-brand-500" />,
                title: 'Safe & Private',
                desc: 'Made for kids — your data stays safe and private.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50
                           hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="mb-4">{feat.icon}</div>
                <h3 className="font-heading font-semibold text-gray-900 mb-1">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        <div className="flex items-center justify-center gap-1">
          <Sparkles size={12} />
          <span>FinKid — Financial Literacy for the Next Generation</span>
        </div>
      </footer>
    </div>
  );
}
