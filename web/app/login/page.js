'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      return setError('Please enter your email and password.');
    }

    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.session) {
        router.push('/chat');
      }
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError("Hmm, that doesn't match. Check your email and password!");
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please confirm your email first — check your inbox!');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-brand-100/50 p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
                <Sparkles size={16} />
              </div>
              <span className="font-heading font-extrabold text-xl text-brand-600 tracking-tight leading-none">
                FinKid
              </span>
            </div>
            <h1 className="font-heading font-bold text-2xl text-gray-900">Welcome Back!</h1>
            <p className="text-sm text-gray-500 mt-1">Log in to keep learning about money.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Your password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl btn-glow
                         flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Logging in...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  Log In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-brand-500 font-medium hover:text-brand-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
