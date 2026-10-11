import React from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Compass,
  Copy,
  Cpu,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  Globe,
  Hammer,
  Heart,
  HelpCircle,
  Layers,
  Lock,
  MessageSquare,
  Pickaxe,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Terminal,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  Swords,
  Hammer,
  Gamepad2,
  Trophy,
  ShieldCheck,
  Globe,
  Lock,
  Pickaxe,
  Shield,
  Crown,
  Flame,
  Zap,
  Users,
  Star,
  Award,
  Terminal,
  Cpu,
  Layers,
  BookOpen,
  Calendar,
  MessageSquare,
  HelpCircle,
  Heart,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
};

interface DynamicIconProps {
  name: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = 'w-5 h-5' }) => {
  const IconComponent = ICON_MAP[name] || Compass;
  return <IconComponent className={className} />;
};
