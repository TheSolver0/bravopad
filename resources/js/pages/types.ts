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
  is_following?: boolean;
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

export interface Story {
  id: number;
  user_id: number;
  type: 'text' | 'image' | 'video' | 'audio';
  content: string | null;
  media_url: string | null;
  background_color: string;
  font_style: 'normal' | 'bold' | 'italic';
  text_align: 'left' | 'center' | 'right';
  views_count: number;
  expires_at: string;
  created_at: string;
  seen: boolean;
  user: { id: number; name: string; avatar?: string | null; role: string; department?: string | null };
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

export type MessengerUser = {
    id: number;
    name: string;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
    last_seen_at?: string | null;
};

export type MessengerMessage = {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    created_at: string;
    edited_at?: string | null;
    deleted_at?: string | null;
    is_edited?: boolean;
    is_deleted?: boolean;
    sender: MessengerUser;
};

export type MessengerConversation = {
    id: number;
    type: 'direct' | 'group';
    name?: string | null;
    is_creator?: boolean;
    other_user: MessengerUser | null;
    participants: MessengerUser[];
    last_message: MessengerMessage | null;
    last_message_at: string | null;
    unread_count: number;
    read_at_by_user?: Record<string, string | null>;
};

export type ConversationsResponse = {
    conversations: MessengerConversation[];
    unread_total: number;
};

export type UsersResponse = {
    users: MessengerUser[];
};

export type MessageSentPayload = {
    message: MessengerMessage;
    conversation?: Partial<MessengerConversation> & { id: number };
};

export type MessageUpdatedPayload = {
    action: 'edited' | 'deleted';
    message: MessengerMessage;
};

export type ConversationReadPayload = {
    conversation_id: number;
    user_id: number;
    read_at: string;
};

export type TypingPayload = {
    user_id: number;
    name: string;
    is_typing: boolean;
};

export type InboxUpdatedPayload = {
    conversation_id: number;
    unread_total: number;
    conversation?: Partial<MessengerConversation> & { id: number };
};

export type MessengerCall = {
    id: number;
    conversation_id: number;
    started_by: number;
    callee_id: number | null;
    type: 'audio' | 'video';
    status: 'ringing' | 'accepted' | 'declined' | 'ended';
    room_key?: string | null;
    joined_count?: number | null;
    max_participants?: number | null;
    accepted_at?: string | null;
    ended_at?: string | null;
    created_at?: string | null;
    starter: MessengerUser;
    callee: MessengerUser | null;
    participants?: Record<string, MessengerCallParticipant>;
};

export type MessengerCallParticipant = {
    user_id: number;
    status: 'invited' | 'joined' | 'declined' | 'left';
    joined_at?: string | null;
    left_at?: string | null;
    user: MessengerUser | null;
};

export type CallUpdatedPayload = {
    call: MessengerCall;
};

export type WebRtcSessionPayload = {
    from: number;
    target?: number;
    sdp: RTCSessionDescriptionInit;
};

export type WebRtcIcePayload = {
    from: number;
    target?: number;
    candidate: RTCIceCandidateInit;
};

export type MeshReadyPayload = {
    from: number;
    target?: number;
};

export type CallIceServer = {
    urls: string | string[];
    username?: string | null;
    credential?: string | null;
};

export type PageProps = {
    auth?: {
        user?: MessengerUser;
    };
    messenger?: {
        call_ice_servers?: CallIceServer[];
    };
};

export type DesktopNotificationPermission = NotificationPermission | 'unsupported';

export type MessageMenuState = {
    messageId: number;
    x: number;
    y: number;
};

export type MessengerWidgetProps = {
    variant?: 'floating' | 'fullscreen';
};
