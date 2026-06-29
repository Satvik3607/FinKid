import { Rocket, Star, Sun, Heart, Zap, Gem, Feather, Ghost } from 'lucide-react';

export const AVATARS = [
  {
    id: 'avatar_1',
    name: 'Rocket',
    icon: Rocket,
    bgColor: 'from-blue-400 to-indigo-500'
  },
  {
    id: 'avatar_2',
    name: 'Star',
    icon: Star,
    bgColor: 'from-yellow-400 to-amber-500'
  },
  {
    id: 'avatar_3',
    name: 'Sun',
    icon: Sun,
    bgColor: 'from-orange-400 to-red-500'
  },
  {
    id: 'avatar_4',
    name: 'Heart',
    icon: Heart,
    bgColor: 'from-pink-400 to-rose-500'
  },
  {
    id: 'avatar_5',
    name: 'Zap',
    icon: Zap,
    bgColor: 'from-yellow-300 to-yellow-500'
  },
  {
    id: 'avatar_6',
    name: 'Gem',
    icon: Gem,
    bgColor: 'from-teal-400 to-emerald-500'
  },
  {
    id: 'avatar_7',
    name: 'Feather',
    icon: Feather,
    bgColor: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'avatar_8',
    name: 'Ghost',
    icon: Ghost,
    bgColor: 'from-purple-400 to-fuchsia-500'
  }
];

export const getAvatar = (id) => {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
};
