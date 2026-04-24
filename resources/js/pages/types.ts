// Types correspondant au schéma réel de la base de données Laravel

// Conservé pour compatibilité avec les layouts
export type View = 'dashboard' | 'team' | 'history' | 'shop' | 'create' | 'stats' | 'challenges';

// Récompenses (boutique — données statiques)
export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  image: string;
  category: 'vouchers' | 'tickets' | 'experiences' | 'equipment';
}

export type Permission = 'admin' | 'manager' | 'employee';

export interface User {
  id: number;
  name: string;
  email?: string;
  role: string;
  permission: Permission;
  department: string | null;
  avatar: string;
  points_total: number;
  monthly_points_allowance?: number;
  monthly_points_remaining?: number;
}

export interface BravoValue {
  id: number;
  name: string;
  color: string;
  multiplier: number;
}

export interface Bravo {
  id: number;
  sender_id: number;
  receiver_id: number;
  badge?: 'good_job' | 'excellent' | 'impressive';
  value_id?: number | null;
  challenge_id?: number;
  message: string;
  points: number;
  likes_count: number;
  created_at: string;
  sender?: User;
  receiver?: User;
  values?: { id: number; name: string; color?: string }[];
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  points_bonus: number;
  status: 'active' | 'finished';
  for_all: boolean;
  days_left: number;
  bravos_count: number;
  participants_count: number;
  is_participating: boolean;
}

export interface WeeklyData {
  name: string;
  bravos: number;
}

export interface ValueStat {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export interface BadgeStat {
  key: string;
  label: string;
  emoji: string;
  color: string;
  count: number;
}

export interface TopUser {
  id: number;
  name: string;
  avatar: string;
  department: string | null;
  count: number;
}

export interface Department {
  id: number;
  name: string;
}
