'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, ArrowLeft, BookOpen, CheckCircle, Trophy } from 'lucide-react';
import coursesData from '@/data/courses.json';
import { getAvatar } from '@/lib/avatars';

export default function CoursesPage() {
  const router = useRouter();
  const [progress, setProgress] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const courses = coursesData.courses;

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setUsername(session.user?.user_metadata?.username || 'Friend');
      
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      setUserStats(statsData || {
        total_points: 0,
        current_level: 'Money Newbie',
      });
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (userProfile) {
        setUserData(userProfile);
      }

      const { data, error } = await supabase
        .from('course_progress')
        .select('course_id, lesson_id')
        .eq('user_id', session.user.id);

      if (!error && data) {
        setProgress(data);
      }
      setLoading(false);
    };

    fetchProgress();
  }, []);

  const getCourseProgress = (courseId, totalLessons) => {
    const completed = progress.filter(p => p.course_id === courseId).length;
    return { completed, total: totalLessons };
  };

  return (
    <div className="min-h-screen bg-gradient-chat flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <span className="font-heading font-extrabold text-xl text-brand-600 tracking-tight">FinKid Courses</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/chat" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 px-3 py-1.5 rounded-full transition-colors">
            <ArrowLeft size={16} />
            Back to Chat
          </Link>
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-full transition-colors border border-yellow-200"
          >
            <Trophy size={16} />
            {userStats ? `Lvl ${userStats.current_level} (${userStats.total_points}pt)` : 'Profile'}
          </Link>
          <div className="hidden md:flex items-center gap-2 ml-2">
            <span className="text-sm text-gray-500">
              Hi, <span className="font-bold text-gray-800">{userData?.display_name || username}</span>!
            </span>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatar(userData?.avatar_id).bgColor} flex items-center justify-center text-white shadow-sm`}>
              {(() => {
                const Icon = getAvatar(userData?.avatar_id).icon;
                return <Icon size={16} />;
              })()}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-gray-800 mb-2">Learning Roadmap</h1>
          <p className="text-gray-500 max-w-2xl">Complete courses to unlock your financial superpower. Start from the basics and work your way up!</p>
        </div>

        {loading ? (
          <div className="animate-pulse flex gap-4 flex-wrap">
            <div className="h-48 w-full sm:w-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-48 w-full sm:w-80 bg-gray-200 rounded-2xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const { completed, total } = getCourseProgress(course.id, course.lessons.length);
              const isCompleted = completed === total && total > 0;
              
              return (
                <Link key={course.id} href={`/courses/${course.id}`} className="group block">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 h-full flex flex-col relative overflow-hidden">
                    {/* Level badge */}
                    <div className="absolute top-0 right-0 bg-brand-50 text-brand-600 text-[11px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-brand-100 uppercase tracking-wider">
                      {course.level}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-brand-50 text-brand-500'}`}>
                        {isCompleted ? <CheckCircle size={20} /> : <BookOpen size={20} />}
                      </div>
                      <h2 className="font-heading font-bold text-xl text-gray-800 group-hover:text-brand-600 transition-colors">{course.title}</h2>
                    </div>

                    <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
                      {course.description}
                    </p>

                    <div className="mt-auto">
                      <div className="flex justify-between items-center text-xs font-medium text-gray-500 mb-2">
                        <span>{completed} of {total} lessons completed</span>
                        <span>{Math.round((completed / total) * 100) || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-brand-500'}`} 
                          style={{ width: `${(completed / total) * 100 || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
