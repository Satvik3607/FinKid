'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, ArrowLeft, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    ageRange: '',
    parentEmail: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!form.username.trim()) return setError('Please pick a username!');
    if (!form.email.trim()) return setError('We need your email address.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (!form.ageRange) return setError('Please select your age group.');

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            username: form.username,
            age_range: form.ageRange,
            parent_email: form.parentEmail || null,
          },
        },
      });

      if (signupError) throw signupError;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccess('Account created! Check your email to confirm, then log in.');
      } else if (data.session) {
        // Auto-confirmed — redirect to chat
        router.push('/chat');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
            <h1 className="font-heading font-bold text-2xl text-gray-900">Create Your Account</h1>
            <p className="text-sm text-gray-500 mt-1">Join FinKid and start learning about money!</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-mint-50 text-mint-500 text-sm px-4 py-3 rounded-xl mb-4">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="Pick a cool name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
              <select
                value={form.ageRange}
                onChange={(e) => updateField('ageRange', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-sm
                           focus:border-brand-400 focus:bg-white transition-colors"
              >
                <option value="">Select your age group</option>
                <option value="8-10">8 – 10 years old</option>
                <option value="11-13">11 – 13 years old</option>
                <option value="14-16">14 – 16 years old</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent&apos;s Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={form.parentEmail}
                onChange={(e) => updateField('parentEmail', e.target.value)}
                placeholder="parent@email.com"
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
                <span className="animate-pulse">Creating account...</span>
              ) : (
                <>
                  <UserPlus size={18} />
                  Sign Up
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-500 font-medium hover:text-brand-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
