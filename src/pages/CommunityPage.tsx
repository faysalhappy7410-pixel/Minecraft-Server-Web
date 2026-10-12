import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Hash,
  Maximize2,
  MessageSquare,
  Newspaper,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  User as UserIcon,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  GalleryItem,
  LeaderboardCategory,
  NewsArticleItem,
  PublicPlayerProfile,
} from '../types/cms';
import { ResilientImage } from '../components/ResilientImage';
import { MinecraftAvatar } from '../components/MinecraftAvatar';
import { CommunityEventsCalendar } from '../components/CommunityEventsCalendar';

const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  'PvP Master',
  'Master Builder',
  'Minigame Champion',
  'Play Time Legend',
  'Community Helper',
  'Event Winner',
];

export const CommunityPage: React.FC = () => {
  const {
    siteSettings,
    socialLinks,
    userProfile,
    leaderboards,
    staff,
    gallery,
    testimonials,
    events,
    news,
    rules,
  } = useApp();

  const connectedDiscordUrl =
    socialLinks
      .find(
        (link) =>
          link.published !== false &&
          (link.platform?.toLowerCase() === 'discord' || link.isPrimary) &&
          link.url?.trim() &&
          link.url.trim() !== '#'
      )
      ?.url.trim() ||
    siteSettings.discordUrl?.trim() ||
    '';

  const [activeLeaderboardTab, setActiveLeaderboardTab] =
    useState<LeaderboardCategory>('PvP Master');
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('All');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [activeArticle, setActiveArticle] = useState<NewsArticleItem | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
        setActiveArticle(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const currentLeaderboardEntries = leaderboards
    .filter((entry) => entry.category === activeLeaderboardTab)
    .sort((a, b) => a.rank - b.rank);

  const topThreePlayers = currentLeaderboardEntries.slice(0, 3);

  const galleryCategories = [
    'All',
    ...Array.from(new Set(gallery.map((g) => g.category).filter(Boolean))),
  ];

  const filteredGallery =
    selectedGalleryCategory === 'All'
      ? gallery
      : gallery.filter((g) => g.category === selectedGalleryCategory);

  const upcomingEvents = events.filter((e) => !e.isPast);
  const pastEvents = events.filter((e) => e.isPast);

  // Highlighted rules for the Community Rules & Events Showcase
  const highlightedRules = rules.slice(0, 4);

  // Build safe public player profiles dynamically from live Firestore data (current user, staff, and leaderboard players)
  // Strictly excludes private email addresses and internal role fields!
  const featuredPublicProfiles: PublicPlayerProfile[] = [
    ...(userProfile
      ? [
          {
            uid: userProfile.uid,
            minecraftUsername: userProfile.minecraftUsername,
            avatarUrl: userProfile.avatarUrl,
            bio:
              userProfile.bio ||
              'Active PRO PLAYERS community member exploring Java & Bedrock realms.',
            discordUsername: userProfile.discordUsername,
            instagramUrl: userProfile.instagramUrl,
            facebookUrl: userProfile.facebookUrl,
            badges: ['Verified Player', 'Community Member'],
          },
        ]
      : []),
    ...staff
      .filter((s) => s.minecraftUsername !== userProfile?.minecraftUsername)
      .slice(0, 3)
      .map((member) => ({
        uid: `staff_${member.id}`,
        minecraftUsername: member.minecraftUsername,
        avatarUrl: member.avatarUrl,
        bio: member.bio,
        discordUsername: member.discordHandle,
        badges: [member.roleTitle, 'Official Staff'],
      })),
    ...leaderboards
      .filter(
        (entry) =>
          entry.minecraftUsername !== userProfile?.minecraftUsername &&
          !staff.some((s) => s.minecraftUsername === entry.minecraftUsername)
      )
      .slice(0, 3)
      .map((entry) => ({
        uid: `lb_${entry.id}`,
        minecraftUsername: entry.minecraftUsername,
        bio: `${entry.category} Rank #${entry.rank} (${entry.statValue} ${entry.statLabel})`,
        badges: [`${entry.category} #${entry.rank}`],
      })),
  ].slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      {/* Gaming-Themed Community Hero Banner */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-10 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono uppercase tracking-widest text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Announcements, Champions, Staff &amp; Discord Hub</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white">
            PRO PLAYERS Community Hub
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Stay ahead with official server announcements, celebrate our top leaderboard champions
            and staff team, connect on Discord, and participate in weekly crossplay events.
          </p>
        </div>

        {/* Quick Community Highlights Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
            <div className="font-mono text-xl font-extrabold text-emerald-400">{news.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Announcements</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
            <div className="font-mono text-xl font-extrabold text-amber-400">
              {leaderboards.length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Ranked Legends</div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
            <div className="font-mono text-xl font-extrabold text-cyan-400">{staff.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Active Staff</div>
          </div>
        </div>
      </div>

      {/* 1. Recent Announcements Visual Highlight Cards */}
      <section aria-labelledby="announcements-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              01. Official Broadcasts
            </p>
            <h2
              id="announcements-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Recent Announcements &amp; Patch Notes
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click any card to read the full announcement</span>
          </span>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
            No announcements published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((article, idx) => (
              <article
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-emerald-500/45 overflow-hidden flex flex-col justify-between transition-all cursor-pointer group shadow-lg"
              >
                <div>
                  {article.imageUrl && (
                    <div className="aspect-video relative overflow-hidden bg-slate-950">
                      <ResilientImage
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-400 text-slate-950">
                          {article.category}
                        </span>
                        {idx === 0 && (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/40 backdrop-blur-sm">
                            FEATURED
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="p-6 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>{article.publishDate}</span>
                      <span>By {article.authorName}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">PRO PLAYERS Dispatch</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 group-hover:text-emerald-300">
                    <Newspaper className="w-3.5 h-3.5" />
                    <span>Read Full Update &rarr;</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 2. Top Players Podium & Staff Members Visual Highlight Section */}
      <section aria-labelledby="leaderboards-heading" className="space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              02. Hall of Fame &amp; Server Leadership
            </p>
            <h2
              id="leaderboards-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Top Players &amp; Staff Showcase
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Season champions verified by the PRO PLAYERS team across PvP, building, and survival.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Leaderboard Categories"
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            {LEADERBOARD_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeLeaderboardTab === category}
                onClick={() => setActiveLeaderboardTab(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeLeaderboardTab === category
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Podium Visual Highlight Cards for Top 3 Players */}
        {topThreePlayers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topThreePlayers.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl p-6 flex flex-col justify-between space-y-5 border transition-colors ${
                    isFirst
                      ? 'bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900/90 border-amber-400/50 shadow-xl'
                      : isSecond
                        ? 'bg-slate-900/85 border-slate-600/60'
                        : 'bg-slate-900/85 border-amber-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <MinecraftAvatar username={entry.minecraftUsername} size="lg" />
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                            isFirst
                              ? 'bg-amber-400 text-slate-950'
                              : isSecond
                                ? 'bg-slate-300 text-slate-950'
                                : 'bg-amber-700 text-white'
                          }`}
                        >
                          <Crown className="w-3 h-3" />
                          <span>RANK #{entry.rank}</span>
                        </span>
                        <h3 className="font-display text-xl font-extrabold text-white mt-1.5">
                          {entry.minecraftUsername}
                        </h3>
                        <p className="text-xs text-slate-400">{entry.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/85 border border-slate-800/90 flex items-center justify-between font-mono">
                    <span className="text-xs text-slate-400 font-sans">{entry.statLabel}</span>
                    <span className="text-base font-bold text-emerald-300 tabular-nums">
                      {entry.statValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Leaderboard Table or Stylish Placeholder Layout */}
        {currentLeaderboardEntries.length === 0 ? (
          <div className="space-y-6">
            {/* Podium Layout Preview Slots so users can see the Leaderboard structure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((slotRank) => {
                const isFirst = slotRank === 1;
                const isSecond = slotRank === 2;
                return (
                  <div
                    key={slotRank}
                    className={`rounded-2xl p-6 flex flex-col justify-between space-y-5 border border-dashed ${
                      isFirst
                        ? 'bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-900/80 border-amber-400/40'
                        : isSecond
                          ? 'bg-slate-900/75 border-slate-700'
                          : 'bg-slate-900/75 border-amber-700/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <Trophy
                          className={`w-6 h-6 ${
                            isFirst
                              ? 'text-amber-400/80'
                              : isSecond
                                ? 'text-slate-300/80'
                                : 'text-amber-600/80'
                          }`}
                        />
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                            isFirst
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : isSecond
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-400/30'
                                : 'bg-amber-700/25 text-amber-400 border border-amber-600/30'
                          }`}
                        >
                          <Crown className="w-3 h-3" />
                          <span>RANK #{slotRank} SLOT</span>
                        </span>
                        <h3 className="font-display text-lg font-bold text-slate-300 mt-1.5">
                          Awaiting Champion
                        </h3>
                        <p className="text-xs text-slate-500">{activeLeaderboardTab}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-500 font-sans">Season Score</span>
                      <span className="text-slate-400 font-bold">---</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stylish Status Placeholder Banner */}
            <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-8 text-center space-y-3 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Leaderboard updating soon</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                No leaderboard stats available yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Season IV rankings for <strong className="text-white">{activeLeaderboardTab}</strong>{' '}
                are currently being tracked. Top player scores and statistics will appear in the
                podium slots above as matches and community milestones are verified.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden">
            <div className="divide-y divide-slate-800/80">
              {currentLeaderboardEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg font-mono font-bold text-sm flex items-center justify-center shrink-0 tabular-nums ${
                        entry.rank === 1
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : entry.rank === 2
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                            : entry.rank === 3
                              ? 'bg-amber-700/25 text-amber-400 border border-amber-600/40'
                              : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{entry.rank}
                    </div>

                    <MinecraftAvatar username={entry.minecraftUsername} size="sm" />

                    <div className="min-w-0">
                      <div className="font-display font-bold text-white truncate flex items-center gap-2">
                        <span>{entry.minecraftUsername}</span>
                        {entry.rank === 1 && (
                          <Crown
                            className="w-4 h-4 text-amber-400 shrink-0"
                            aria-label="Rank 1 Champion"
                          />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{entry.category}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-emerald-300">{entry.statValue}</div>
                    <div className="text-[11px] text-slate-400 font-sans">{entry.statLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Team Cards */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>PRO PLAYERS Staff &amp; Moderation Team</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated administrators, builders, and moderators keeping the realm fair and lag-free.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-emerald-500/40 p-6 flex flex-col justify-between space-y-4 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <MinecraftAvatar
                      username={member.minecraftUsername}
                      customAvatarUrl={member.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="font-display text-lg font-bold text-white truncate">
                        {member.minecraftUsername}
                      </h4>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 font-semibold mt-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{member.roleTitle}</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{member.bio}</p>
                </div>

                {member.discordHandle && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Discord Handle</span>
                    <span className="text-slate-200 font-semibold">{member.discordHandle}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Discord Integration Preview Widget */}
      <section aria-labelledby="discord-preview-heading" className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#1E1F29]/95 via-slate-900/95 to-slate-950/95 border border-[#5865F2]/40 p-6 sm:p-8 lg:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Discord Community Info & Perks */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 text-xs font-mono uppercase tracking-widest text-indigo-300">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Official Discord Server Integration</span>
              </div>

              <h2
                id="discord-preview-heading"
                className="font-display text-2xl sm:text-4xl font-extrabold text-white"
              >
                Connect with PRO PLAYERS on Discord
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Our Discord server is the command center for tournament brackets, live server status
                alerts, staff support tickets, town recruitment, and crossplay voice chat for Java
                and Bedrock squads.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant Tournament &amp; Event Alerts</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24/7 Staff Support &amp; Claim Help</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Java &amp; Bedrock Squad Voice Lounges</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Player Marketplace &amp; Build Showcases</span>
                </div>
              </div>

              {connectedDiscordUrl && (
                <div className="pt-2">
                  <a
                    href={connectedDiscordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition-colors shadow-lg"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Join Official PRO PLAYERS Discord</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Right: Interactive Discord Channels Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#111218] border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <ResilientImage
                      src={siteSettings.officialLogoUrl}
                      alt="PRO PLAYERS Discord Icon"
                      className="w-10 h-10 object-contain"
                    />
                    <div>
                      <div className="font-display font-bold text-white text-sm">
                        PRO PLAYERS Official
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Community Hub Active</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#5865F2]/20 text-indigo-300 font-mono text-[11px] font-semibold">
                    DISCORD
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 pb-1">
                    Text Channels
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/90 text-emerald-300 border border-slate-800/80">
                    <span className="inline-flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-emerald-400" />
                      <span>announcements</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      NEW
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-900/60">
                    <span className="inline-flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span>general-crossplay-chat</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Active</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-900/60">
                    <span className="inline-flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span>pvp-tournaments</span>
                    </span>
                    <span className="text-[10px] text-amber-400">Saturday Cup</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-900/60">
                    <span className="inline-flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      <span>build-showcase</span>
                    </span>
                    <span className="text-[10px] text-cyan-400">Screenshots</span>
                  </div>

                  <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 pt-2 pb-1">
                    Voice Channels
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/60 text-slate-200 border border-slate-800/60">
                    <span className="inline-flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>SMP Squad Lounge #1</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                      <Users className="w-3 h-3" />
                      <span>Live</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Community Events Calendar & Fair-Play Rules Showcase */}
      <section aria-labelledby="events-heading" className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              03. Interactive Event Schedule &amp; Code of Honor
            </p>
            <h2
              id="events-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 flex items-center gap-2.5"
            >
              <Calendar className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>Community Events Calendar</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Explore upcoming server tournaments, build battles, and seasonal events by date.
              Synced live via Firestore.
            </p>
          </div>
          <Link
            to="/information"
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            View Complete Server Rulebook &rarr;
          </Link>
        </div>

        {/* Interactive Calendar + Real-Time Firestore Event Schedule & Admin Publisher */}
        <CommunityEventsCalendar />

        {/* Core Community Pillars & Past Winner Highlights */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Core Community Pillars &amp; Tournament Fair-Play</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Every tournament and survival season on PRO PLAYERS is governed by strict fair-play
                standards ({upcomingEvents.length} upcoming · {pastEvents.length} completed recaps):
              </p>
            </div>
            <Link
              to="/information"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Read All Rules &amp; Guidelines</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {highlightedRules.map((rule, idx) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1.5"
              >
                <div className="text-[11px] font-mono text-emerald-400">
                  0{idx + 1} · {rule.category}
                </div>
                <div className="font-display text-sm font-bold text-white">{rule.title}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Build Gallery with Accessible Lightbox */}
      <section aria-labelledby="gallery-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              04. Architectural Showcase
            </p>
            <h2
              id="gallery-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              PRO PLAYERS Build Gallery
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedGalleryCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedGalleryCategory === cat
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredGallery.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
            No builds found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setLightboxItem(item)}
                    className="w-full aspect-[4/3] relative overflow-hidden bg-slate-950 block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    aria-label={`Open full-size image of ${item.title}`}
                  >
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-200 group-hover:text-emerald-300">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </button>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span>{item.completionDate}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Built by <strong className="text-emerald-300">{item.builderCredit}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxItem(item)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Player Testimonials */}
      <section aria-labelledby="testimonials-heading" className="space-y-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            05. Player Voices
          </p>
          <h2
            id="testimonials-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
          >
            Player Testimonials
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div
                  className="flex items-center gap-1 text-amber-400"
                  aria-label={`${t.rating} out of 5 stars`}
                >
                  {Array.from({ length: Math.min(5, Math.max(1, t.rating)) }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
                <MinecraftAvatar username={t.minecraftUsername} size="sm" />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    {t.minecraftUsername}
                  </div>
                  <div className="text-xs text-slate-400">Playing since {t.playingSince}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Public Player Profile Cards (Strictly Safe Public Fields Only — Zero Private Emails) */}
      <section aria-labelledby="public-profiles-heading" className="space-y-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            06. Community Spotlight
          </p>
          <h2
            id="public-profiles-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
          >
            Public Player Profile Cards
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displays public Minecraft identity, bio, optional social links, and public badges.
            Private account emails are never exposed publicly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredPublicProfiles.map((player) => (
            <div
              key={player.uid}
              className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MinecraftAvatar
                    username={player.minecraftUsername}
                    customAvatarUrl={player.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-white truncate">
                      {player.minecraftUsername}
                    </h3>
                    {player.badges && player.badges.length > 0 && (
                      <div className="text-xs text-emerald-400 truncate">
                        {player.badges.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{player.bio}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                {player.discordUsername && (
                  <div className="flex items-center justify-between">
                    <span>Discord:</span>
                    <span className="font-mono text-slate-200">{player.discordUsername}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  {player.instagramUrl && (
                    <a
                      href={player.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <span>Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {player.facebookUrl && (
                    <a
                      href={player.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                      <span>Facebook</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!player.instagramUrl && !player.facebookUrl && !player.discordUsername && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <UserIcon className="w-3 h-3" />
                      <span>PRO PLAYERS Member</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accessible Image Lightbox Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="max-w-4xl w-full rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div>
                <h3 id="lightbox-title" className="font-display text-lg font-bold text-white">
                  {lightboxItem.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {lightboxItem.category} · Built by {lightboxItem.builderCredit} ·{' '}
                  {lightboxItem.completionDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                aria-label="Close lightbox"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden bg-slate-950 flex items-center justify-center">
              <ResilientImage
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="p-5 text-sm text-slate-300 leading-relaxed">
              {lightboxItem.description}
            </div>
          </div>
        </div>
      )}

      {/* Accessible Full News Article Modal */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="text-xs text-emerald-400 font-mono">
                {activeArticle.category} · {activeArticle.publishDate}
              </div>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="Close article"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <h3
                id="article-modal-title"
                className="font-display text-2xl font-bold text-white"
              >
                {activeArticle.title}
              </h3>
              <div className="text-xs text-slate-400">Posted by {activeArticle.authorName}</div>
              {activeArticle.imageUrl && (
                <div className="rounded-xl overflow-hidden aspect-video bg-slate-950">
                  <ResilientImage
                    src={activeArticle.imageUrl}
                    alt={activeArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {activeArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
