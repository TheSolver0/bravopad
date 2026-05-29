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

export interface AppSetting {
  id: number;
  key: string;
  value: string;
  cast: string;
  description: string | null;
}

export type Permission = 'admin' | 'manager' | 'employee';

export interface User {
  location: string;
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
  cover_image: string | null;
  category: string;
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

export interface ChallengeMedia {
  id: number;
  url: string;
  file_type: 'image' | 'video';
  caption: string | null;
  uploader_name: string;
  created_at: string;
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

export interface PostComment {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  user: { id: number; name: string; avatar?: string | null };
}
export interface PostMedia {
  id: number;
  url: string;
  type: 'image' | 'video';
  mime_type: string;
  order: number;
}
export interface Post {
  id: number;
  user_id: number;
  content: string;
  type: 'post' | 'announcement';
  media_url: string | null;
  media?: PostMedia[];    
  original_post?: {
    id: number;
    user_id: number;
    content: string;
    type: 'post' | 'announcement';
    media_url: string | null;
    media?: PostMedia[];
    is_pinned: boolean;
    likes_count: number;
    comments_count: number;
    created_at: string;
    user: { id: number; name: string; avatar?: string | null; role: string; department?: string | null };
  } | null;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string; avatar?: string | null; role: string; department?: string | null };
  comments?: PostComment[];
}

export interface EventContributionPayment {
  id: number;
  amount: number | null;
  payment_method: 'orange_money' | 'mtn_money' | 'cash';
  is_manual: boolean;
  contributor_user_id: number | null;
  contributor_name: string;
  paid_at: string | null;
}

export type EventContributionStatus = 'pending' | 'partial' | 'complete';
export type EventContributionCollectionStatus = 'pending' | 'in_progress' | 'completed' | 'closed';

export interface EventContributionParticipant {
  user_id: number;
  name: string;
  target_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  progress_percent: number | null;
  is_fully_paid: boolean;
  contribution_status: EventContributionStatus | null;
}

export interface EventContribution {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  goal_amount: number | null;
  amount_mode: 'global' | 'per_participant';
  amount_per_participant: number | null;
  deadline_at: string | null;
  banner_url: string | null;
  visibility: 'public' | 'private';
  viewer_role: 'creator' | 'invitee' | 'viewer';
  payment_methods: ('orange_money' | 'mtn_money' | 'cash')[];
  creator: { id: number; name: string };
  stats: {
    total_collected: number | null;
    participants_count: number | null;
    pot_amount: number | null;
    collection_progress_percent: number | null;
    contribution_status: EventContributionCollectionStatus | null;
    goal_progress_percent: number | null;
  };
  invitees: { user_id: number; name?: string; status: 'pending' | 'accepted' | 'declined' }[];
  participants: EventContributionParticipant[];
  payments: EventContributionPayment[];
  can_record_manual: boolean;
  can_contribute: boolean;
  can_edit: boolean;
  can_delete: boolean;
}
