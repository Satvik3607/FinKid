import { Trophy, Star, Shield, Award, Flame, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const iconMap = {
  first_step: Star,
  course_crusher: Shield,
  quiz_master: Trophy,
  all_rounder: Award,
  streak_starter: Flame
};

export default function BadgeToast({ badges, onClose }) {
  const [visibleBadges, setVisibleBadges] = useState([]);

  useEffect(() => {
    if (badges && badges.length > 0) {
      // Show them all, or one by one. For simplicity, just show them all in a stack.
      setVisibleBadges(badges);
      
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [badges, onClose]);

  if (!visibleBadges.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {visibleBadges.map((badge) => {
        const IconComponent = iconMap[badge.id] || Award;
        
        return (
          <div 
            key={badge.id}
            className="bg-white rounded-2xl shadow-xl shadow-brand-500/10 border border-brand-100 p-4 flex items-start gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
            <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-yellow-400 to-brand-500 text-white flex items-center justify-center shadow-inner">
              <IconComponent size={24} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-0.5">Badge Unlocked!</p>
              <h4 className="font-heading font-extrabold text-gray-900 leading-tight">{badge.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
            </div>
            <button 
              onClick={() => {
                setVisibleBadges(prev => prev.filter(b => b.id !== badge.id));
                if (visibleBadges.length === 1) onClose();
              }}
              className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
