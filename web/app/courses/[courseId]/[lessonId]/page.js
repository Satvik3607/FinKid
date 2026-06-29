'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Check, Lightbulb, Trophy, AlertCircle, Star, ArrowRight } from 'lucide-react';
import coursesData from '@/data/courses.json';
import gamificationData from '@/data/gamification.json';
import LessonContent from '@/components/LessonContent';
import BadgeToast from '@/components/BadgeToast';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  
  const courseId = params.courseId;
  const lessonId = params.lessonId;
  
  const course = coursesData.courses.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === lessonId);
  const quiz = gamificationData.lesson_quizzes[lessonId];
  
  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lesson not found</h2>
          <Link href="/courses" className="text-brand-600 hover:underline">Return to Courses</Link>
        </div>
      </div>
    );
  }

  // Find next lesson to navigate to after completion
  const currentIndex = course.lessons.findIndex(l => l.id === lessonId);
  const nextLesson = currentIndex >= 0 && currentIndex < course.lessons.length - 1 ? course.lessons[currentIndex + 1] : null;

  const handleSubmitQuiz = async () => {
    if (quiz) {
      if (quiz.type === 'mc' && quizAnswer === null) {
        setError('Please select an answer.');
        return;
      }
      if (quiz.type === 'reflection' && (!quizAnswer || quizAnswer.trim() === '')) {
        setError('Please write a short reflection.');
        return;
      }
    }
    
    setSaving(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to save your progress.');
      }

      const payload = {
        course_id: courseId,
        lesson_id: lessonId,
        quiz_answer_idx: quiz?.type === 'mc' ? parseInt(quizAnswer) : null,
        quiz_answer_text: quiz?.type === 'reflection' ? quizAnswer : null
      };

      const res = await fetch('http://localhost:8000/api/gamification/complete-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to complete lesson');

      setQuizResult(data);
      
      // We will handle navigation in a separate 'Continue' button after they see their score
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (nextLesson) {
      router.push(`/courses/${courseId}/${nextLesson.id}`);
    } else {
      router.push(`/courses/${courseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 sm:px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`} className="text-gray-400 hover:text-brand-600 transition-colors p-1 -ml-1">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{course.title}</span>
            <span className="font-heading font-extrabold text-sm text-gray-800">Lesson {currentIndex + 1} of {course.lessons.length}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-gray-900 mb-8">{lesson.title}</h1>
            <LessonContent content={lesson.content} />
          </div>
          
          {!quizResult && (
            <div className="bg-brand-50 p-6 sm:p-10 border-t border-brand-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mt-1">
                  <Lightbulb size={20} />
                </div>
                <div className="w-full">
                  <h3 className="font-heading font-bold text-lg text-gray-800 mb-2">
                    {quiz ? "Knowledge Check" : "Think About It"}
                  </h3>
                  <p className="text-gray-700 font-medium mb-4">{quiz ? quiz.question : lesson.check_question}</p>
                  
                  {quiz?.type === 'mc' && (
                    <div className="space-y-3 mt-4">
                      {quiz.options.map((opt, i) => (
                        <label key={i} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${quizAnswer === i ? 'bg-white border-brand-500 ring-2 ring-brand-200' : 'bg-white border-gray-200 hover:border-brand-300'}`}>
                          <input 
                            type="radio" 
                            name="quiz" 
                            className="w-5 h-5 text-brand-600 border-gray-300 focus:ring-brand-500" 
                            checked={quizAnswer === i}
                            onChange={() => setQuizAnswer(i)}
                          />
                          <span className="ml-3 text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {quiz?.type === 'reflection' && (
                    <div className="mt-4">
                      <textarea 
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white min-h-[120px] resize-y"
                        placeholder="Type your reflection here..."
                        value={quizAnswer || ''}
                        onChange={(e) => setQuizAnswer(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {quizResult && (
            <div className={`p-6 sm:p-10 border-t ${quizResult.is_correct ? 'bg-green-50 border-green-100' : 'bg-brand-50 border-brand-100'}`}>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${quizResult.is_correct ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-600'}`}>
                  {quizResult.is_correct ? <Check size={32} /> : <Star size={32} />}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Lesson Complete!
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  You earned <span className="font-bold text-brand-600">+{quizResult.points_earned} points</span>!
                </p>
                {quizResult.quiz_feedback && (
                  <div className="bg-white/60 rounded-lg p-4 inline-block max-w-lg mx-auto text-left mb-6 border border-black/5">
                    <p className="text-gray-800">{quizResult.quiz_feedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 text-coral-600 rounded-xl text-sm font-medium border border-coral-100 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex justify-center pb-12">
          {!quizResult ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={20} />
              )}
              {saving ? 'Submitting...' : 'Submit & Complete Lesson'}
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              {nextLesson ? 'Continue to Next Lesson' : 'Return to Course'}
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </main>

      {/* Render the badge toast if they earned new badges */}
      {quizResult?.newly_earned_badges?.length > 0 && (
        <BadgeToast 
          badges={quizResult.newly_earned_badges} 
          onClose={() => setQuizResult({ ...quizResult, newly_earned_badges: [] })} 
        />
      )}
    </div>
  );
}
