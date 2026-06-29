'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle, Circle, Play } from 'lucide-react';
import coursesData from '@/data/courses.json';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const courseId = params.courseId;
  const course = coursesData.courses.find(c => c.id === courseId);

  useEffect(() => {
    if (!course) return;

    const fetchProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('course_progress')
        .select('lesson_id')
        .eq('user_id', session.user.id)
        .eq('course_id', courseId);

      if (!error && data) {
        setProgress(data.map(p => p.lesson_id));
      }
      setLoading(false);
    };

    fetchProgress();
  }, [courseId, course]);

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-chat flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Course not found</h2>
          <Link href="/courses" className="text-brand-600 hover:underline">Return to Courses</Link>
        </div>
      </div>
    );
  }

  const completedCount = progress.length;
  const totalCount = course.lessons.length;
  const percentComplete = Math.round((completedCount / totalCount) * 100) || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 sm:px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/courses" className="text-gray-400 hover:text-brand-600 transition-colors p-1 -ml-1">
          <ArrowLeft size={20} />
        </Link>
        <span className="font-heading font-extrabold text-lg text-gray-800 tracking-tight">FinKid Courses</span>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="inline-block bg-brand-50 text-brand-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            {course.level}
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-gray-800 mb-4">{course.title}</h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">{course.description}</p>
          
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                style={{ width: `${percentComplete}%` }}
              ></div>
            </div>
            <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{percentComplete}% Complete</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-gray-800 ml-2">Lessons</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl w-full"></div>
              ))}
            </div>
          ) : (
            course.lessons.map((lesson, idx) => {
              const isCompleted = progress.includes(lesson.id);
              
              return (
                <Link key={lesson.id} href={`/courses/${course.id}/${lesson.id}`} className="block group">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all">
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle size={28} className="text-green-500" />
                      ) : (
                        <Circle size={28} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-brand-600 mb-1">Lesson {idx + 1}</div>
                      <h3 className={`font-heading font-bold text-lg ${isCompleted ? 'text-gray-700' : 'text-gray-900'}`}>
                        {lesson.title}
                      </h3>
                    </div>

                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                      <Play size={18} className="ml-1" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
