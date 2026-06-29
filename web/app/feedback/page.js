'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Send, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FeedbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    };
    getSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a message before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: dbError } = await supabase.from('feedback').insert([
        {
          user_id: userId,
          message: message.trim(),
          rating: rating > 0 ? rating : null
        }
      ]);

      if (dbError) throw dbError;
      
      setSuccess(true);
      setMessage('');
      setRating(0);
      
      // Auto redirect after a short delay
      setTimeout(() => {
        router.push('/chat');
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/chat" className="flex items-center text-brand-600 hover:text-brand-800 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Back to Chat
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <span className="font-heading font-extrabold text-xl text-brand-600">FinKid</span>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Send Feedback</h1>
          <p className="text-gray-500 mb-8">We'd love to hear what you think about FinKid! How can we make it better?</p>
          
          {success ? (
            <div className="bg-mint-50 border border-mint-200 text-mint-700 p-6 rounded-xl text-center">
              <h3 className="font-bold text-lg mb-2">Thank you!</h3>
              <p>Your feedback helps us make FinKid better for everyone. Redirecting to chat...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate your experience? (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        size={32} 
                        className={`${
                          (hoverRating || rating) >= star 
                            ? 'fill-sunny-400 text-sunny-400' 
                            : 'text-gray-300'
                        } transition-colors duration-200`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Thoughts
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                  placeholder="Tell us what you like, what's confusing, or what you'd like to see next..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="text-coral-500 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                {submitting ? 'Sending...' : 'Send Feedback'}
                {!submitting && <Send size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
