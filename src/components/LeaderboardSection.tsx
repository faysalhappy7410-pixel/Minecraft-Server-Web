import React, { useState } from 'react';
import {
  Award,
  Clock,
  Compass,
  Crown,
  ExternalLink,
  Flame,
  Hammer,
  Medal,
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Terminal,
  Trophy,
  Video,
  Zap,
} from 'lucide-react';
import { CanonicalLeaderboardCategory, LeaderboardEntryItem } from '../types/cms';
import { normalizeLeaderboardCategory } from '../data/seedData';
import { MinecraftAvatar } from './MinecraftAvatar';
import { scrollToTop } from './ScrollToTop';

export type LeaderboardFilter = 'All' | CanonicalLeaderboardCategory;

interface LeaderboardViewProps {
  entries: LeaderboardEntryItem[];
  onSelectPlayer: (entry: LeaderboardEntryItem) => void;
  defaultFilter?: LeaderboardFilter;
  title?: string;
  subtitle?: string;
}

interface CategoryStyleConfig {
  id: CanonicalLeaderboardCategory;
  name: string;
  shortLabel: string;
  vibeTag: string;
  description: string;
  icon: React.ElementType;
  primaryColor: string;
  badgeStyle: string;
  badgeIcon: React.ElementType;
  badgeLabel: string;
  tabActiveStyle: string;
  tabInactiveStyle: string;
  cardBorder: string;
  cardBg: string;
  cardGlow: string;
  accentText: string;
  blueprintGrid?: boolean;
  fieryGlow?: boolean;
  neonPurpleGold?: boolean;
}

export const CATEGORY_STYLES: Record<CanonicalLeaderboardCategory, CategoryStyleConfig> = {
  'PvP Masters': {
    id: 'PvP Masters',
    name: 'PvP Masters',
    shortLabel: 'PvP',
    vibeTag: 'Combat Arena Division',
    description: 'Undefeated duelists, arena combatants, and tournament gladiators competing in ranked combat.',
    icon: Swords,
    primaryColor: '#ef4444',
    badgeStyle: 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-md shadow-red-600/30 border border-red-400/50',
    badgeIcon: Swords,
    badgeLabel: 'COMBAT MASTER',
    tabActiveStyle: 'bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold shadow-lg shadow-red-600/25',
    tabInactiveStyle: 'text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/40 border border-red-500/30',
    cardBorder: 'border-red-500/45 hover:border-orange-400 shadow-xl shadow-red-500/10',
    cardBg: 'bg-gradient-to-b from-red-950/30 via-slate-900/90 to-slate-900/95',
    cardGlow: 'from-red-600/20 via-orange-600/15 to-transparent',
    accentText: 'text-orange-400',
    fieryGlow: true,
  },
  'Builders': {
    id: 'Builders',
    name: 'Builders',
    shortLabel: 'Builders',
    vibeTag: 'Architectural Blueprint Hub',
    description: 'Master architects crafting grand realm citadels, mega-structures, and creative community wonders.',
    icon: Hammer,
    primaryColor: '#06b6d4',
    badgeStyle: 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25 border border-cyan-300/60',
    badgeIcon: Hammer,
    badgeLabel: 'BLUEPRINT ARTISAN',
    tabActiveStyle: 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25',
    tabInactiveStyle: 'text-cyan-300 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30',
    cardBorder: 'border-cyan-500/45 hover:border-sky-300 shadow-xl shadow-cyan-500/10',
    cardBg: 'bg-gradient-to-b from-cyan-950/25 via-slate-900/90 to-slate-900/95',
    cardGlow: 'from-cyan-500/20 via-sky-500/10 to-transparent',
    accentText: 'text-cyan-300',
    blueprintGrid: true,
  },
  'Challengers': {
    id: 'Challengers',
    name: 'Challengers',
    shortLabel: 'Challengers',
    vibeTag: 'Verified Hardcore Gauntlet',
    description: 'Elite trial conquerors completing extreme solo hardcore challenges, flawless runs, and survival gauntlets with video evidence.',
    icon: Flame,
    primaryColor: '#d946ef',
    badgeStyle: 'bg-gradient-to-r from-amber-400 via-purple-400 to-amber-300 text-slate-950 font-extrabold shadow-lg shadow-purple-500/25 border border-amber-300',
    badgeIcon: ShieldCheck,
    badgeLabel: 'VERIFIED CHALLENGER',
    tabActiveStyle: 'bg-gradient-to-r from-amber-400 via-purple-500 to-amber-300 text-slate-950 font-extrabold shadow-lg shadow-purple-500/30',
    tabInactiveStyle: 'text-amber-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40',
    cardBorder: 'border-purple-500/55 hover:border-amber-400 shadow-2xl shadow-purple-500/15',
    cardBg: 'bg-gradient-to-b from-[#1b1029] via-[#0e121d] to-[#070b10]',
    cardGlow: 'from-purple-600/30 via-amber-500/20 to-transparent',
    accentText: 'text-amber-300',
    neonPurpleGold: true,
  },
  'Mini-Game Champions': {
    id: 'Mini-Game Champions',
    name: 'Mini-Game Champions',
    shortLabel: 'Mini-Games',
    vibeTag: 'Arcade Arena League',
    description: 'Speedrun, Parkour, TNT Run, and Spleef champions dominating high-tempo crossplay minigame arenas.',
    icon: Zap,
    primaryColor: '#eab308',
    badgeStyle: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 font-bold shadow-md shadow-yellow-500/25 border border-yellow-300',
    badgeIcon: Zap,
    badgeLabel: 'ARCADE CHAMPION',
    tabActiveStyle: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-bold shadow-lg shadow-yellow-500/25',
    tabInactiveStyle: 'text-yellow-400 hover:text-white bg-yellow-950/30 hover:bg-yellow-900/40 border border-yellow-500/30',
    cardBorder: 'border-yellow-500/45 hover:border-amber-300 shadow-xl shadow-yellow-500/10',
    cardBg: 'bg-gradient-to-b from-yellow-950/20 via-slate-900/90 to-slate-900/95',
    cardGlow: 'from-yellow-500/20 via-amber-500/10 to-transparent',
    accentText: 'text-yellow-300',
  },
  'Event Winners': {
    id: 'Event Winners',
    name: 'Event Winners',
    shortLabel: 'Event Winners',
    vibeTag: 'Seasonal Tournament Laurels',
    description: 'Trophy holders and champions of official weekend tournaments, Ender Dragon cups, and seasonal festivals.',
    icon: Trophy,
    primaryColor: '#f59e0b',
    badgeStyle: 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 text-slate-950 font-bold shadow-md shadow-amber-500/25 border border-amber-300',
    badgeIcon: Medal,
    badgeLabel: 'TOURNAMENT VICTOR',
    tabActiveStyle: 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25',
    tabInactiveStyle: 'text-amber-400 hover:text-white bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30',
    cardBorder: 'border-amber-500/45 hover:border-yellow-400 shadow-xl shadow-amber-500/10',
    cardBg: 'bg-gradient-to-b from-amber-950/25 via-slate-900/90 to-slate-900/95',
    cardGlow: 'from-amber-500/20 via-orange-500/10 to-transparent',
    accentText: 'text-amber-300',
  },
  'Community Beta': {
    id: 'Community Beta',
    name: 'Community Beta',
    shortLabel: 'Community Beta',
    vibeTag: 'Futuristic Pioneer Circle',
    description: 'Top beta auditors, test network pioneers, and long-standing citizens shaping server balance and community health.',
    icon: Terminal,
    primaryColor: '#14b8a6',
    badgeStyle: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold shadow-md shadow-teal-500/25 border border-teal-300',
    badgeIcon: Sparkles,
    badgeLabel: 'BETA PIONEER',
    tabActiveStyle: 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold shadow-lg shadow-teal-500/25',
    tabInactiveStyle: 'text-teal-300 hover:text-white bg-teal-950/30 hover:bg-teal-900/40 border border-teal-500/30',
    cardBorder: 'border-teal-500/45 hover:border-emerald-300 shadow-xl shadow-teal-500/10',
    cardBg: 'bg-gradient-to-b from-teal-950/25 via-slate-900/90 to-slate-900/95',
    cardGlow: 'from-teal-500/20 via-emerald-500/10 to-transparent',
    accentText: 'text-teal-300',
  },
};

// Explicit order requested:
// 1. PvP Masters
// 2. Builders
// 3. Challengers (in the middle!)
// 4. Mini-Game Champions
// 5. Event Winners
// 6. Community Beta
export const ORDERED_CATEGORIES: CanonicalLeaderboardCategory[] = [
  'PvP Masters',
  'Builders',
  'Challengers',
  'Mini-Game Champions',
  'Event Winners',
  'Community Beta',
];

export const LeaderboardSection: React.FC<LeaderboardViewProps> = ({
  entries,
  onSelectPlayer,
  defaultFilter = 'All',
  title = 'Competitive Hall of Fame',
  subtitle = 'Official seasonal rankings, verified challenge conquerors, and crossplay champions.',
}) => {
  const [activeFilter, setActiveFilter] = useState<LeaderboardFilter>(defaultFilter);

  // Group all entries by canonical category
  const groupedEntries: Record<CanonicalLeaderboardCategory, LeaderboardEntryItem[]> = {
    'PvP Masters': [],
    'Builders': [],
    'Challengers': [],
    'Mini-Game Champions': [],
    'Event Winners': [],
    'Community Beta': [],
  };

  entries.forEach((item) => {
    if (item.published === false) return;
    const cat = normalizeLeaderboardCategory(item.category);
    groupedEntries[cat].push(item);
  });

  // Sort each group by rank ascending
  Object.keys(groupedEntries).forEach((catKey) => {
    groupedEntries[catKey as CanonicalLeaderboardCategory].sort(
      (a, b) => (Number(a.rank) || 1) - (Number(b.rank) || 1)
    );
  });

  const categoriesToRender: CanonicalLeaderboardCategory[] =
    activeFilter === 'All' ? ORDERED_CATEGORIES : [activeFilter];

  return (
    <div className="space-y-8">
      {/* Header and Filter Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Crossplay Season IV Rankings</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Clean Filter Navigation Bar */}
        <div
          role="tablist"
          aria-label="Leaderboard Category Filter"
          className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shrink-0 shadow-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'All'}
            onClick={() => {
              setActiveFilter('All');
              scrollToTop(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'All'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>All Categories ({entries.length})</span>
          </button>

          {ORDERED_CATEGORIES.map((cat) => {
            const style = CATEGORY_STYLES[cat];
            const isSelected = activeFilter === cat;
            const count = groupedEntries[cat].length;
            const Icon = style.icon;

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveFilter(cat);
                  scrollToTop(true);
                }}
                className={`px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected ? style.tabActiveStyle : style.tabInactiveStyle
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{style.shortLabel}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-black/20' : 'bg-slate-950/60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Stacked Categories (or Single Category) */}
      <div className="space-y-16">
        {categoriesToRender.map((cat) => {
          const style = CATEGORY_STYLES[cat];
          const items = groupedEntries[cat];
          const topThree = items.slice(0, 3);
          const remainingItems = items.slice(3);
          const CategoryIcon = style.icon;
          const BadgeIcon = style.badgeIcon;

          return (
            <section
              key={cat}
              aria-labelledby={`category-heading-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              className="space-y-6"
            >
              {/* Category Showcase Header Banner */}
              <div
                className={`rounded-2xl p-6 sm:p-7 border relative overflow-hidden transition-all shadow-xl ${
                  style.cardBorder
                } ${style.cardBg}`}
              >
                {/* Blueprint grid effect for Builders */}
                {style.blueprintGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                )}

                {/* Fiery ambient aura for PvP Masters */}
                {style.fieryGlow && (
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
                )}

                {/* Golden/Neon-Purple aura for Challengers */}
                {style.neonPurpleGold && (
                  <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs tracking-wider uppercase ${style.badgeStyle}`}>
                        <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{style.badgeLabel}</span>
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        {style.vibeTag}
                      </span>
                    </div>

                    <h3
                      id={`category-heading-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                      className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3"
                    >
                      <CategoryIcon className={`w-7 h-7 ${style.accentText}`} />
                      <span>{style.name}</span>
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {style.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono font-bold text-slate-200">
                      {items.length} {items.length === 1 ? 'Contender' : 'Contenders'} Ranked
                    </span>

                    {activeFilter !== cat && (
                      <button
                        type="button"
                        onClick={() => setActiveFilter(cat)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Focus View &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Podium & Player Content */}
              {items.length === 0 ? (
                /* Empty / Awaiting Champion Placeholder */
                <div className="space-y-6">
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
                            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                              {isFirst ? (
                                <Crown className="w-6 h-6 text-amber-400/80" />
                              ) : isSecond ? (
                                <Medal className="w-6 h-6 text-slate-300/80" />
                              ) : (
                                <Trophy className="w-6 h-6 text-amber-600/80" />
                              )}
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
                                {isFirst ? 'GOLD #1' : isSecond ? 'SILVER #2' : 'BRONZE #3'}
                              </span>
                              <h4 className="font-display text-lg font-bold text-slate-300 mt-1">
                                Awaiting Contender
                              </h4>
                              <p className="text-xs text-slate-500">{style.name}</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between font-mono text-xs">
                            <span className="text-slate-500 font-sans">Official Record</span>
                            <span className="text-slate-400 font-bold">Unclaimed Slot</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-7 text-center space-y-2.5 shadow-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Season IV Tournament Ongoing</span>
                    </div>
                    <h4 className="font-display text-xl font-bold text-white">
                      No verified scores registered yet for {style.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                      Match records and qualifying submissions are verified regularly by the moderation team.
                    </p>
                  </div>
                </div>
              ) : (
                /* Podium Cards & Player Rows */
                <div className="space-y-6">
                  {/* Top 3 Gamified Metallic Podium Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {topThree.map((player) => {
                      const isFirst = player.rank === 1;
                      const isSecond = player.rank === 2;
                      const isThird = player.rank === 3;
                      const isChallengerCategory = cat === 'Challengers';

                      return (
                        <div
                          key={player.id}
                          onClick={() => onSelectPlayer(player)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectPlayer(player);
                            }
                          }}
                          className={`relative rounded-3xl p-6 flex flex-col justify-between space-y-5 border-2 transition-all cursor-pointer group overflow-hidden ${
                            isFirst
                              ? 'border-amber-400/90 shadow-2xl shadow-amber-500/20 bg-gradient-to-b from-amber-500/20 via-slate-900/95 to-slate-900/95 hover:border-amber-300'
                              : isSecond
                                ? 'border-slate-300/80 shadow-xl shadow-slate-300/15 bg-gradient-to-b from-slate-300/15 via-slate-900/95 to-slate-900/95 hover:border-white'
                                : 'border-amber-700/80 shadow-xl shadow-amber-700/15 bg-gradient-to-b from-amber-800/15 via-slate-900/95 to-slate-900/95 hover:border-amber-600'
                          }`}
                        >
                          {/* Gamified Metallic Frame Shine */}
                          <div
                            className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
                              isFirst
                                ? 'bg-amber-400/20'
                                : isSecond
                                  ? 'bg-slate-300/15'
                                  : 'bg-amber-700/15'
                            }`}
                          />

                          {/* Blueprint grid effect for Builders card */}
                          {style.blueprintGrid && (
                            <div
                              className="absolute inset-0 pointer-events-none opacity-10"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                                backgroundSize: '16px 16px',
                              }}
                            />
                          )}

                          <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <div className="relative shrink-0">
                                <MinecraftAvatar username={player.minecraftUsername} size="lg" />
                                <div
                                  className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                                    isFirst
                                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                      : isSecond
                                        ? 'bg-slate-200 text-slate-950 ring-2 ring-slate-100'
                                        : 'bg-amber-700 text-amber-100 ring-2 ring-amber-600'
                                  }`}
                                >
                                  {isFirst ? (
                                    <Crown className="w-4 h-4 fill-slate-950" />
                                  ) : isSecond ? (
                                    <Medal className="w-4 h-4" />
                                  ) : (
                                    <Trophy className="w-4 h-4" />
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-extrabold tracking-wide uppercase ${
                                    isFirst
                                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                                      : isSecond
                                        ? 'bg-slate-200 text-slate-950 shadow-sm'
                                        : 'bg-amber-700 text-amber-100 shadow-sm'
                                  }`}
                                >
                                  {isFirst ? 'GOLD #1' : isSecond ? 'SILVER #2' : 'BRONZE #3'}
                                </span>

                                <h4 className="font-display text-xl font-extrabold text-white mt-1 group-hover:text-emerald-300 transition-colors truncate">
                                  {player.minecraftUsername}
                                </h4>

                                {isChallengerCategory && player.challengeTitle ? (
                                  <p className="text-xs text-amber-200/90 line-clamp-1 mt-0.5 font-medium">
                                    {player.challengeTitle}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400">{style.name}</p>
                                )}
                              </div>
                            </div>

                            {/* Watch Proof / Video Badge on Podium */}
                            {player.videoUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPlayer(player);
                                }}
                                className={`p-2.5 rounded-xl border text-xs shrink-0 cursor-pointer shadow-md transition-transform hover:scale-105 ${
                                  isChallengerCategory
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                }`}
                                title="Watch Verified Proof / Video Clip"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )}
                          </div>

                          {/* Stat Badge Block */}
                          <div className="relative p-3.5 rounded-2xl bg-slate-950/85 border border-slate-800 flex items-center justify-between font-mono">
                            <span className="text-xs text-slate-400 font-sans truncate mr-2">
                              {player.statLabel}
                            </span>
                            <span className={`text-base font-extrabold tabular-nums shrink-0 ${style.accentText}`}>
                              {player.statValue}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Remaining Ranked Contenders Table (Rank 4+) or Full List */}
                  {remainingItems.length > 0 && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
                      <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                        <span>Ranked Contenders (Rank #4+)</span>
                        <span>Click row to view profile &amp; verified stats</span>
                      </div>
                      <div className="divide-y divide-slate-800/80">
                        {remainingItems.map((player) => (
                          <div
                            key={player.id}
                            onClick={() => onSelectPlayer(player)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectPlayer(player);
                              }
                            }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/45 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                #{player.rank}
                              </div>

                              <MinecraftAvatar username={player.minecraftUsername} size="sm" />

                              <div className="min-w-0">
                                <div className="font-display font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                                  {player.minecraftUsername}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  {cat === 'Challengers' && player.challengeTitle
                                    ? player.challengeTitle
                                    : style.name}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              {player.videoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPlayer(player);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35 hover:bg-rose-500/25 transition-colors cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Watch Proof</span>
                                </button>
                              )}

                              <div className="text-right font-mono tabular-nums">
                                <div className={`text-sm font-bold ${style.accentText}`}>
                                  {player.statValue}
                                </div>
                                <div className="text-[11px] text-slate-400 font-sans">
                                  {player.statLabel}
                                </div>
                              </div>

                              <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-xs font-sans pl-2">
                                &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
