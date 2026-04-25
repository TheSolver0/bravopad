// Types correspondant au schéma réel de la base de données Laravel

export type View = 'dashboard' | 'team' | 'history' | 'shop' | 'create' | 'stats' | 'challenges' | 'hr-dashboard' | 'admin-config';

// Récompenses (boutique — persistées en DB)
export interface Reward {
  id: number;
  name: string;
  description: string | null;
  category: 'vouchers' | 'tickets' | 'experiences' | 'equipment';
  cost_points: number;
  image_url: string | null;
  stock: number | null;
  has_stock: boolean;
  affordable: boolean;
}

export interface Redemption {
  id: number;
  reward_name: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  created_at: string;
}

export interface BravoComment {
  id: number;
  content: string;
  created_at: string;
  user: { id: number; name: string; avatar: string } | null;
}

export interface AppSetting {
  id: number;
  key: string;
  value: string;
  cast: string;
  description: string | null;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  role: string;
  department: string;
  avatar: string;
  points_total: number;
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
  value_id?: number | null;
  challenge_id?: number;
  message: string;
  points: number;
  likes_count: number;
  user_has_liked?: boolean;
  comments_count?: number;
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
  days_left: number;
  bravos_count: number;
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
