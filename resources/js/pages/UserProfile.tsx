import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  Heart,
  Link2,
  MessageCircle,
  MessageSquare,
  Star,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserLink } from '@/components/user-link';
import { BADGES } from './constants';

function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

interface ProfileUser {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
  department: string | null;
  points_total: number;
  hired_at: string | null;
  followers_count: number;
  following_count: number;
  mutual_count: number;
  bravos_received_count: number;
  bravos_sent_count: number;
  is_following: boolean;
  is_connected: boolean;
  is_own_profile: boolean;
}

interface NetworkUser {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
  is_following: boolean;
  is_me: boolean;
}

interface ProfileBravo {
  id: number;
  message: string;
  points: number;
  badge?: 'good_job' | 'excellent' | 'impressive';
  created_at: string;
  sender: { id: number; name: string; avatar: string | null; role: string } | null;
  values: { id: number; name: string; color?: string }[];
}

interface ProfilePost {
  id: number;
  content: string;
  type: string;
  media: { id: number; url: string; type: string }[];
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface EarnedBadge {
  id: number;
  name: string;
  slug: string;
  description: string;
  rarity: string;
  awarded_at: string;
}

interface UserProfileProps {
  profileUser: ProfileUser;
  receivedBravos: ProfileBravo[];
  posts: ProfilePost[];
  earnedBadges: EarnedBadge[];
  followers: NetworkUser[];
  following: NetworkUser[];
}

const RARITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  common:    { bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200' },
  rare:      { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  epic:      { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
  legendary: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
};

type TabKey = 'bravos' | 'publications' | 'badges' | 'abonnes' | 'abonnements';

function NetworkCard({
  user,
  isFollowing: initialFollowing,
}: {
  user: NetworkUser;
  isFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);

  function toggle() {
    setFollowing(f => !f);
    router.post(`/users/${user.id}/follow`, {}, { preserveScroll: true });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <Link href={`/users/${user.id}`} className="shrink-0">
        <img
          src={getAvatar(user)}
          alt={user.name}
          className="w-10 h-10 rounded-xl object-cover hover:opacity-90 transition-opacity"
          referrerPolicy="no-referrer"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/users/${user.id}`}>
          <p className="text-sm font-bold text-gray-900 hover:text-primary truncate transition-colors">{user.name}</p>
        </Link>
        <p className="text-xs text-gray-500 truncate">{user.role}</p>
      </div>
      {!user.is_me && (
        <button
          onClick={toggle}
          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            following
              ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
          }`}
        >
          {following ? <><UserCheck size={12} /> Suivi</> : <><UserPlus size={12} /> Suivre</>}
        </button>
      )}
    </div>
  );
}

export default function UserProfile({ profileUser, receivedBravos, posts, earnedBadges, followers, following }: UserProfileProps) {
  const [tab, setTab] = useState<TabKey>('bravos');
  const [isFollowing, setIsFollowing] = useState(profileUser.is_following);
  const [followersCount, setFollowersCount] = useState(profileUser.followers_count);

  const avatar = getAvatar({ name: profileUser.name, avatar: profileUser.avatar });

  function toggleFollow() {
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount(c => wasFollowing ? c - 1 : c + 1);
    router.post(`/users/${profileUser.id}/follow`, {}, { preserveScroll: true });
  }

  const hiredDate = profileUser.hired_at
    ? new Date(profileUser.hired_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'bravos',        label: 'Bravos reçus',   count: profileUser.bravos_received_count },
    { key: 'publications',  label: 'Publications',    count: posts.length },
    { key: 'badges',        label: 'Badges',          count: earnedBadges.length },
    { key: 'abonnes',       label: 'Abonnés',         count: followersCount },
    { key: 'abonnements',   label: 'Abonnements',     count: profileUser.following_count },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Back */}
      <div className="pb-4">
        <Link href="/team" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} />
          Retour
        </Link>
      </div>

      {/* ── Carte principale blanche ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Bandeau dégradé */}
        <div className="h-32 bg-gradient-to-br from-primary/80 via-primary to-secondary/70 relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + actions */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={avatar}
                alt={profileUser.name}
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2 pt-14">
              {!profileUser.is_own_profile && (
                <button
                  onClick={toggleFollow}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isFollowing
                    ? <><UserCheck size={15} /> {profileUser.is_connected ? 'Connexion' : 'Suivi'}</>
                    : <><UserPlus size={15} /> Suivre</>
                  }
                </button>
              )}
              {!profileUser.is_own_profile && (
                <Link
                  href={`/create?to=${profileUser.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all shadow-sm"
                >
                  <Star size={15} />
                  Bravo
                </Link>
              )}
              {profileUser.is_own_profile && (
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-all"
                >
                  Modifier le profil
                </Link>
              )}
            </div>
          </div>

          {/* Identité */}
          <div className="space-y-1 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{profileUser.name}</h1>
              {profileUser.is_connected && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  <Link2 size={10} />
                  Connexion
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">{profileUser.role}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1.5">
              {profileUser.department && (
                <span className="flex items-center gap-1">
                  <Building2 size={12} />
                  {profileUser.department}
                </span>
              )}
              {hiredDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  Depuis {hiredDate}
                </span>
              )}
              {!profileUser.is_own_profile && profileUser.mutual_count > 0 && (
                <span className="flex items-center gap-1 text-primary/80 font-medium">
                  <Users size={12} />
                  {profileUser.mutual_count} connexion{profileUser.mutual_count > 1 ? 's' : ''} en commun
                </span>
              )}
            </div>
          </div>

          {/* Stats — cliquables pour naviguer dans les onglets */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {([
              { icon: <Users size={14} />,     value: followersCount,                     label: 'Abonnés',         tab: 'abonnes' as TabKey },
              { icon: <UserCheck size={14} />, value: profileUser.following_count,         label: 'Abonnements',     tab: 'abonnements' as TabKey },
              { icon: <Trophy size={14} />,    value: profileUser.bravos_received_count,   label: 'Bravos reçus',    tab: 'bravos' as TabKey },
              { icon: <Star size={14} />,      value: profileUser.bravos_sent_count,       label: 'Bravos envoyés',  tab: null },
              { icon: <Zap size={14} />,       value: profileUser.points_total,            label: 'Points',          tab: null },
            ] as const).map(stat => (
              <button
                key={stat.label}
                onClick={() => stat.tab && setTab(stat.tab)}
                className={`flex flex-col items-center justify-center bg-gray-50 rounded-xl px-3 py-2.5 gap-0.5 transition-all border border-transparent ${
                  stat.tab ? 'hover:bg-primary/5 hover:border-primary/20 cursor-pointer' : 'cursor-default'
                } ${tab === stat.tab ? 'border-primary/20 bg-primary/5' : ''}`}
              >
                <span className="text-primary/70">{stat.icon}</span>
                <span className="text-base font-extrabold text-gray-900">{stat.value.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-medium">{stat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-t border-b border-gray-100">
          <div className="flex gap-1 px-4 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
                  tab === t.key
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-200'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu des onglets ───────────────────────────────────────── */}
        <div className="p-4 space-y-3">

        {/* ── Bravos reçus ─────────────────────────────────────────── */}
        {tab === 'bravos' && (
          <>
            {receivedBravos.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Trophy className="mx-auto mb-3 opacity-20" size={40} />
                <p className="font-bold">Aucun bravo reçu pour le moment</p>
              </div>
            ) : receivedBravos.map((bravo, i) => {
              const badgeInfo = BADGES.find(x => x.key === bravo.badge);
              return (
                <motion.div
                  key={bravo.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {bravo.sender && (
                        <Link href={`/users/${bravo.sender.id}`}>
                          <img
                            src={getAvatar(bravo.sender)}
                            alt={bravo.sender.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 hover:opacity-90 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                        </Link>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {bravo.sender && (
                              <UserLink userId={bravo.sender.id} className="text-sm font-bold text-gray-900">
                                {bravo.sender.name}
                              </UserLink>
                            )}
                            {badgeInfo && (
                              <span
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ backgroundColor: `${badgeInfo.color}18`, color: badgeInfo.color }}
                              >
                                <Star size={9} style={{ fill: badgeInfo.color, color: badgeInfo.color }} />
                                {badgeInfo.label}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-primary shrink-0">+{bravo.points} pts</span>
                        </div>
                        {bravo.message && (
                          <p className="text-sm text-gray-500 leading-relaxed">{bravo.message}</p>
                        )}
                        {bravo.values.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {bravo.values.map(v => (
                              <span
                                key={v.id}
                                className="px-2 py-0.5 rounded-full border text-[10px] font-medium bg-white"
                                style={v.color ? { borderColor: `${v.color}80`, color: v.color } : {}}
                              >
                                {v.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-500/60 mt-2">
                          {new Date(bravo.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </>
        )}

        {/* ── Publications ─────────────────────────────────────────── */}
        {tab === 'publications' && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <MessageSquare className="mx-auto mb-3 opacity-20" size={40} />
                <p className="font-bold">Aucune publication</p>
              </div>
            ) : posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  {post.type === 'announcement' && (
                    <Badge variant="secondary" className="mb-2 text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                      Annonce
                    </Badge>
                  )}
                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.media.length > 0 && (
                    <div className={`mt-3 grid gap-2 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.media.slice(0, 4).map(m => (
                        <div key={m.id} className="rounded-xl overflow-hidden aspect-video bg-gray-100">
                          {m.type === 'video'
                            ? <video src={m.url} className="w-full h-full object-cover" />
                            : <img src={m.url} alt="" className="w-full h-full object-cover" />
                          }
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {post.comments_count}
                    </span>
                    <span className="ml-auto">
                      {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </>
        )}

        {/* ── Badges ───────────────────────────────────────────────── */}
        {tab === 'badges' && (
          <>
            {earnedBadges.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Award className="mx-auto mb-3 opacity-20" size={40} />
                <p className="font-bold">Aucun badge obtenu</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {earnedBadges.map((badge, i) => {
                  const style = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className={`p-4 border ${style.border} ${style.bg} shadow-sm flex items-start gap-3`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
                          <BadgeCheck size={20} className={style.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold ${style.text}`}>{badge.name}</p>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${style.border} ${style.text} bg-white/60`}>
                              {badge.rarity}
                            </span>
                          </div>
                          {badge.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                          )}
                          {badge.awarded_at && (
                            <p className="text-[10px] text-gray-500/60 mt-1">
                              Obtenu le {new Date(badge.awarded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Abonnés ───────────────────────────────────────────────── */}
        {tab === 'abonnes' && (
          <Card className="border border-gray-100 shadow-sm divide-y divide-gray-100">
            {followers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="mx-auto mb-3 opacity-20" size={40} />
                <p className="font-bold">Aucun abonné pour le moment</p>
              </div>
            ) : followers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <NetworkCard user={user} isFollowing={user.is_following} />
              </motion.div>
            ))}
          </Card>
        )}

        {/* ── Abonnements ──────────────────────────────────────────── */}
        {tab === 'abonnements' && (
          <Card className="border border-gray-100 shadow-sm divide-y divide-gray-100">
            {following.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <UserCheck className="mx-auto mb-3 opacity-20" size={40} />
                <p className="font-bold">Aucun abonnement pour le moment</p>
              </div>
            ) : following.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <NetworkCard user={user} isFollowing={user.is_following} />
              </motion.div>
            ))}
          </Card>
        )}

        </div>
      </div>{/* end white card */}
    </div>
  );
}
