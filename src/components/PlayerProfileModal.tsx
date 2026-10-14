import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Flame,
  Hammer,
  Medal,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Video,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GalleryItem, LeaderboardEntryItem, TestimonialItem } from '../types/cms';
import { normalizeLeaderboardCategory } from '../data/seedData';
import { CATEGORY_STYLES } from './LeaderboardSection';
import { useApp } from '../context/AppContext';
import { MinecraftAvatar } from './MinecraftAvatar';

interface PlayerProfileModalProps {
  entry: LeaderboardEntryItem | null;
  onClose: () => void;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1`;
    }
    if (parsed.hostname.includes('youtu.be')) {
      const v = parsed.pathname.replace(/^\//, '');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1`;
    }
  } catch {
    return null;
  }
  return null;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ entry, onClose }) => {
  const { leaderboards, staff, userProfile } = useApp();
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(Boolean(entry?.videoUrl));
  const [playerBuilds, setPlayerBuilds] = useState<GalleryItem[]>([]);
  const [playerQuotes, setPlayerQuotes] = useState<TestimonialItem[]>([]);
  const [dynamicBio, setDynamicBio] = useState<string>('');
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    if (entry?.videoUrl) {
      setIsPlayingVideo(true);
    } else {
      setIsPlayingVideo(false);
    }
  }, [entry]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Dynamically query Firestore for this player's contributions across server collections
  useEffect(() => {
    if (!entry) return;

    let isMounted = true;
    setLoadingExtra(true);

    async function fetchPlayerDetails() {
      try {
        const username = entry!.minecraftUsername.toLowerCase();

        // 1. Check if player has gallery builds
        const gallerySnap = await getDocs(collection(db, 'gallery'));
        const matchedBuilds: GalleryItem[] = [];
        gallerySnap.forEach((docSnap) => {
          const data = docSnap.data() as GalleryItem;
          if (
            data.published !== false &&
            data.builderCredit &&
            data.builderCredit.toLowerCase().includes(username)
          ) {
            matchedBuilds.push({ ...data, id: docSnap.id });
          }
        });

        // 2. Check if player has testimonials
        const testimonialsSnap = await getDocs(collection(db, 'testimonials'));
        const matchedQuotes: TestimonialItem[] = [];
        testimonialsSnap.forEach((docSnap) => {
          const data = docSnap.data() as TestimonialItem;
          if (
            data.published !== false &&
            data.minecraftUsername &&
            data.minecraftUsername.toLowerCase() === username
          ) {
            matchedQuotes.push({ ...data, id: docSnap.id });
          }
        });

        if (isMounted) {
          setPlayerBuilds(matchedBuilds);
          setPlayerQuotes(matchedQuotes);
        }
      } catch {
        // Fallback silently if offline
      } finally {
        if (isMounted) setLoadingExtra(false);
      }
    }

    fetchPlayerDetails();

    return () => {
      isMounted = false;
    };
  }, [entry]);

  if (!entry) return null;

  const canonicalCat = normalizeLeaderboardCategory(entry.category);
  const catStyle = CATEGORY_STYLES[canonicalCat];
  const isChallenger = canonicalCat === 'Challengers';
  const youtubeEmbedUrl = getYouTubeEmbedUrl(entry.videoUrl);

  // Collect all achievements and rankings for this player across all categories in Firestore
  const allPlayerEntries = leaderboards.filter(
    (item) => item.minecraftUsername.toLowerCase() === entry.minecraftUsername.toLowerCase()
  );

  // Check if player is a staff member
  const staffRecord = staff.find(
    (s) => s.minecraftUsername.toLowerCase() === entry.minecraftUsername.toLowerCase()
  );

  // Check if logged in user is this player
  const isSelf =
    userProfile?.minecraftUsername.toLowerCase() === entry.minecraftUsername.toLowerCase();

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(entry.minecraftUsername);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  // Generate authoritative bio
  const playerBio =
    (isSelf && userProfile?.bio) ||
    staffRecord?.bio ||
    (isChallenger
      ? entry.challengeDescription ||
        'Master of extreme server trials, speedruns, and survival gauntlets. Recognized across PRO PLAYERS network for verified challenge completions.'
      : canonicalCat === 'PvP Masters'
        ? 'Elite combat veteran dominating PvP arena matches, duels, and clan confrontations.'
        : canonicalCat === 'Builders'
          ? 'Master architectural artisan crafting grand citadels, realm hubs, and community landmarks.'
          : canonicalCat === 'Mini-Game Champions'
            ? 'High-tempo arcade speedrunner and parkour tournament champion.'
            : canonicalCat === 'Event Winners'
              ? 'Trophy holder and gold medalist in official seasonal server events.'
              : 'Community beta auditor and network testing pioneer on the PRO PLAYERS crossplay network.');

  const CategoryBadgeIcon = catStyle.badgeIcon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-profile-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`max-w-2xl w-full my-8 rounded-3xl overflow-hidden shadow-2xl transition-all border ${
          canonicalCat === 'PvP Masters'
            ? 'bg-gradient-to-b from-[#180a0a] via-[#100d14] to-[#070b10] border-red-500/50 shadow-red-500/15'
            : canonicalCat === 'Challengers'
              ? 'bg-gradient-to-b from-[#1b1029] via-[#0e121d] to-[#070b10] border-purple-500/50 shadow-purple-500/20'
              : canonicalCat === 'Builders'
                ? 'bg-gradient-to-b from-[#081820] via-[#0b121b] to-[#070b10] border-cyan-500/50 shadow-cyan-500/15'
                : canonicalCat === 'Mini-Game Champions'
                  ? 'bg-gradient-to-b from-[#181608] via-[#0f1118] to-[#070b10] border-yellow-500/50 shadow-yellow-500/15'
                  : canonicalCat === 'Event Winners'
                    ? 'bg-gradient-to-b from-[#181308] via-[#101018] to-[#070b10] border-amber-500/50 shadow-amber-500/15'
                    : 'bg-gradient-to-b from-[#081816] via-[#0a1218] to-[#070b10] border-teal-500/50 shadow-teal-500/15'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div
          className={`relative p-6 sm:p-8 flex items-start justify-between border-b ${
            canonicalCat === 'PvP Masters'
              ? 'bg-gradient-to-r from-red-600/30 via-orange-600/20 to-slate-900 border-red-500/35'
              : canonicalCat === 'Challengers'
                ? 'bg-gradient-to-r from-purple-600/35 via-amber-600/25 to-slate-900 border-purple-500/35'
                : canonicalCat === 'Builders'
                  ? 'bg-gradient-to-r from-cyan-600/30 via-sky-600/20 to-slate-900 border-cyan-500/35'
                  : canonicalCat === 'Mini-Game Champions'
                    ? 'bg-gradient-to-r from-yellow-600/30 via-amber-600/20 to-slate-900 border-yellow-500/35'
                    : canonicalCat === 'Event Winners'
                      ? 'bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-slate-900 border-amber-500/35'
                      : 'bg-gradient-to-r from-teal-600/30 via-emerald-600/20 to-slate-900 border-teal-500/35'
          }`}
        >
          {/* Subtle Background Glow Accent */}
          <div
            className={`absolute top-0 right-1/4 w-72 h-32 rounded-full blur-3xl pointer-events-none ${
              canonicalCat === 'PvP Masters'
                ? 'bg-red-500/25'
                : canonicalCat === 'Challengers'
                  ? 'bg-purple-500/30'
                  : canonicalCat === 'Builders'
                    ? 'bg-cyan-500/20'
                    : 'bg-amber-500/20'
            }`}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
            <div className="relative shrink-0">
              <MinecraftAvatar
                username={entry.minecraftUsername}
                customAvatarUrl={isSelf ? userProfile?.avatarUrl : staffRecord?.avatarUrl}
                size="lg"
              />
              {entry.rank === 1 && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wide uppercase ${catStyle.badgeStyle}`}
                >
                  <CategoryBadgeIcon className="w-3.5 h-3.5" />
                  <span>RANK #{entry.rank} · {catStyle.name}</span>
                </span>

                {staffRecord && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Shield className="w-3 h-3" />
                    <span>{staffRecord.roleTitle}</span>
                  </span>
                )}

                {isSelf && (
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                    You
                  </span>
                )}
              </div>

              <h2
                id="player-profile-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3 truncate"
              >
                <span>{entry.minecraftUsername}</span>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  title="Copy Minecraft username"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  {copiedUsername ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                {playerBio}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close player profile"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Challenger Highlight Card (If Challenger Category) */}
          {isChallenger && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-orange-950/20 to-slate-900 border border-amber-500/40 p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Verified Challenger Achievement</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-mono">
                  {entry.statValue}
                </span>
              </div>

              {entry.challengeTitle ? (
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {entry.challengeTitle}
                  </h3>
                  {entry.challengeDescription && (
                    <p className="text-xs sm:text-sm text-amber-100/80 mt-1 leading-relaxed">
                      {entry.challengeDescription}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    {entry.statLabel}: {entry.statValue}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Completed extreme server challenge recorded by the moderation team.
                  </p>
                </div>
              )}

              {/* Video Proof Section */}
              {entry.videoUrl && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{isPlayingVideo ? 'Hide Video Proof' : 'Watch Proof Video'}</span>
                  </button>

                  <a
                    href={entry.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-slate-950/60 border border-amber-500/30 transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5 text-rose-400" />
                    <span>Open External Proof</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Video Player Embed (If playing video and valid URL) */}
          {isPlayingVideo && entry.videoUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 space-y-2 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                <span className="font-mono text-slate-300 flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  <span>Challenge Proof Player</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {youtubeEmbedUrl ? (
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="Challenge Completion Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    Video proof hosted externally:
                  </p>
                  <a
                    href={entry.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  >
                    <span>Launch Video Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Standard Video Link Button if not Challenger category but videoUrl is set */}
          {!isChallenger && entry.videoUrl && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Player Video / Clip Attached</div>
                  <div className="text-[11px] text-slate-400">Match footage or build showcase</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-rose-300" />
                  <span>{isPlayingVideo ? 'Hide' : 'Play Video'}</span>
                </button>
                <a
                  href={entry.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Open video in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Season Verified Stats</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 font-sans">{entry.statLabel}</div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {entry.statValue}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 font-sans">Leaderboard Placement</div>
                <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
                  <span>Rank #{entry.rank}</span>
                  <span className="text-xs font-sans text-slate-400 font-normal">
                    in {entry.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Other Category Rankings for this Player */}
          {allPlayerEntries.length > 1 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Medal className="w-3.5 h-3.5 text-cyan-400" />
                <span>All Leaderboard Records ({allPlayerEntries.length})</span>
              </h4>

              <div className="space-y-2">
                {allPlayerEntries.map((record) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                      record.id === entry.id
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold">#{record.rank}</span>
                      <span className="font-sans font-semibold text-white">{record.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">{record.statValue}</span>
                      <span className="text-slate-400 text-[11px] font-sans ml-1.5">
                        ({record.statLabel})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Builds Showcase (dynamically fetched from Firestore) */}
          {playerBuilds.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                <span>Verified Community Builds ({playerBuilds.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playerBuilds.map((build) => (
                  <div
                    key={build.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1"
                  >
                    <div className="font-display text-sm font-bold text-white truncate">
                      {build.title}
                    </div>
                    <div className="text-xs text-slate-400">{build.category} · {build.completionDate}</div>
                    <p className="text-xs text-slate-300 line-clamp-2">{build.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player Testimonial Quote (dynamically fetched from Firestore) */}
          {playerQuotes.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Player Testimonial</span>
              </h4>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                  &ldquo;{playerQuotes[0].quote}&rdquo;
                </p>
                <div className="text-[11px] text-slate-400">
                  Playing on server since {playerQuotes[0].playingSince}
                </div>
              </div>
            </div>
          )}

          {/* Badges & Accolades */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Player Badges &amp; Accolades</span>
            </h4>

            <div className="flex flex-wrap gap-2">
              {entry.rank === 1 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Reigning Champion</span>
                </span>
              )}
              {entry.rank <= 3 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Podium Finisher</span>
                </span>
              )}
              {isChallenger && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Trial Conqueror</span>
                </span>
              )}
              {entry.videoUrl && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                  <Video className="w-3.5 h-3.5" />
                  <span>Proof Verified</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <Swords className="w-3.5 h-3.5" />
                <span>Verified Combatant</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Season IV Active</span>
              </span>
              {playerBuilds.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold">
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Master Architect</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="font-mono">
            In-game message:{' '}
            <code className="text-emerald-300">/msg {entry.minecraftUsername}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
