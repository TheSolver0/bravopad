// Types correspondant au schéma réel de la base de données Laravel

export type View =
  | 'dashboard'
  | 'team'
  | 'history'
  | 'shop'
  | 'create'
  | 'stats'
  | 'challenges'
  | 'engagement'
  | 'hr-dashboard'
  | 'admin-config'
  | 'admin-users'
  | 'admin-roles'
  | 'notifications'
  | 'audit';

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
  is_active?: boolean;
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
  description?: string | null;
  color: string;
  icon?: string | null;
  multiplier: number;
  is_active: boolean;
}

export interface BravoComment {
  id: number;
  content: string;
  created_at: string;
  user: { id: number; name: string; avatar?: string | null };
}

export interface Bravo {
  id: number;
  batch_id?: string | null;
  sender_id: number;
  receiver_id: number;
  badge?: 'good_job' | 'excellent' | 'impressive';
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
  receivers?: User[];
  values?: { id: number; name: string; color?: string }[];
  comments?: BravoComment[];
}

export interface UserBadge {
  id: number;
  badge_type: string;
  earned_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface Celebration {
  type: 'birthday' | 'anniversary';
  name: string;
  years: number | null;
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
