'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trophy, Star, Shield, Award, Flame, LogOut, Loader2, Edit2, Check, X } from 'lucide-react';
import gamificationData from '@/data/gamification.json';
import { AVATARS, getAvatar } from '@/lib/avatars';

const iconMap = {
  first_step: Star,
  course_crusher: Shield,
  quiz_master: Trophy,
  all_rounder: Award,
  streak_starter: Flame
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState('');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarId, setEditAvatarId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }
      
      const usernameStr = session.user.email.split('@')[0];
      setUsername(usernameStr);

      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      setUserStats(statsData || {
        total_points: 0,
        current_level: 'Money Newbie',
        badges_earned: [],
        quiz_correct_count: 0
      });
      
      const { data: userDataObj } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      setUserData(userDataObj || { display_name: usernameStr, avatar_id: 'avatar_1' });
      setEditName(userDataObj?.display_name || usernameStr);
      setEditAvatarId(userDataObj?.avatar_id || 'avatar_1');
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await supabase
        .from('users')
        .update({
          display_name: editName.trim(),
          avatar_id: editAvatarId
        })
        .eq('id', session.user.id);
        
      setUserData(prev => ({ ...prev, display_name: editName.trim(), avatar_id: editAvatarId }));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Calculate progress to next level
  let currentLevelIdx = gamificationData.levels.findIndex(l => l.name === userStats.current_level);
  if (currentLevelIdx === -1) currentLevelIdx = 0;
  
  const currentLevelObj = gamificationData.levels[currentLevelIdx];
  const nextLevelObj = currentLevelIdx < gamificationData.levels.length - 1 
    ? gamificationData.levels[currentLevelIdx + 1] 
    : null;

  const pointsInCurrentLevel = userStats.total_points - currentLevelObj.min_points;
  const pointsNeededForNext = nextLevelObj 
    ? nextLevelObj.min_points - currentLevelObj.min_points 
    : 1; // Prevent divide by zero if max level
  
  const progressPercent = nextLevelObj 
    ? Math.min(100, Math.max(0, (pointsInCurrentLevel / pointsNeededForNext) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-12">
      <header className="px-4 sm:px-6 py-4 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/chat" className="text-gray-400 hover:text-brand-600 transition-colors p-1 -ml-1">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-heading font-extrabold text-xl text-gray-800">My Profile</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-coral-500 font-medium transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Header Card */}
        {!isEditing ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-8 text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/3" />
            
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
              title="Edit Profile"
            >
              <Edit2 size={18} />
            </button>
            
            <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getAvatar(userData?.avatar_id).bgColor} flex items-center justify-center shadow-lg shadow-brand-500/20 text-white shrink-0`}>
              {(() => {
                const Icon = getAvatar(userData?.avatar_id).icon;
                return <Icon size={40} className="drop-shadow-sm" />;
              })()}
            </div>
            
            <div className="flex-1 w-full">
              <h2 className="text-3xl font-heading font-extrabold text-gray-900 mb-1 truncate">
                {userData?.display_name || username}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-sm font-bold border border-brand-100 mb-4">
                <Trophy size={14} />
                {userStats.current_level}
              </div>
              
              <div className="w-full max-w-md bg-gray-100 h-3 rounded-full overflow-hidden mb-2 mx-auto md:mx-0">
                <div 
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' }} />
                </div>
              </div>
              
              <div className="flex justify-between text-sm max-w-md mx-auto md:mx-0 text-gray-500 font-medium">
                <span>{userStats.total_points} XP</span>
                <span>{nextLevelObj ? `${nextLevelObj.min_points} XP to ${nextLevelObj.name}` : 'Max Level!'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-brand-200 mb-8 relative">
            <h3 className="font-heading font-bold text-xl text-gray-900 mb-6">Edit Profile</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
              <input 
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="What should we call you?"
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-3">Choose Avatar</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {AVATARS.map((avatar) => {
                  const Icon = avatar.icon;
                  const isSelected = editAvatarId === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setEditAvatarId(avatar.id)}
                      className={`relative aspect-square rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'ring-4 ring-brand-500 ring-offset-2 scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'} bg-gradient-to-tr ${avatar.bgColor} text-white shadow-md`}
                    >
                      <Icon size={24} />
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(userData?.display_name || username);
                  setEditAvatarId(userData?.avatar_id || 'avatar_1');
                }}
                className="px-5 py-2.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="px-5 py-2.5 rounded-full font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl font-heading font-black text-gray-900 mb-1">{userStats.total_points}</div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Points</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl font-heading font-black text-gray-900 mb-1">{userStats.quiz_correct_count}</div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Perfect Quizzes</div>
          </div>
        </div>

        {/* Badges Cabinet */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h3 className="text-xl font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Award className="text-yellow-500" />
            Badge Cabinet
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gamificationData.badges.map(badge => {
              const isEarned = userStats.badges_earned.includes(badge.id);
              const IconComponent = iconMap[badge.id] || Star;
              
              return (
                <div 
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all ${isEarned ? 'bg-yellow-50/50 border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-200 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isEarned ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                    <IconComponent size={24} />
                  </div>
                  <h4 className={`font-bold text-sm mb-1 ${isEarned ? 'text-gray-900' : 'text-gray-600'}`}>{badge.name}</h4>
                  <p className="text-xs text-gray-500 leading-snug">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
