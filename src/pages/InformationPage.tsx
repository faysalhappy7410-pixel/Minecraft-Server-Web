import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  Compass,
  Copy,
  Edit3,
  Hammer,
  HelpCircle,
  MessageSquare,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Smartphone,
  Swords,
  Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CommandCategory } from '../types/cms';
import { normalizeRuleCategory } from '../data/seedData';
import { DynamicIcon } from '../components/DynamicIcon';
import { ResilientImage } from '../components/ResilientImage';

type StructuredRuleCategory =
  | 'General Rules'
  | 'Building/Griefing Rules'
  | 'Chat & Behavior Etiquette'
  | 'PvP/Fair Play';

const RULE_CATEGORY_CONFIG: {
  category: StructuredRuleCategory;
  subtitle: string;
  accentColor: string;
  badgeClass: string;
  icon: React.ReactNode;
}[] = [
  {
    category: 'General Rules',
    subtitle: 'Community conduct, account responsibility & crossplay fairness',
    accentColor: 'border-emerald-500/35',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: <Shield className="w-4 h-4 text-emerald-400" />,
  },
  {
    category: 'Building/Griefing Rules',
    subtitle: 'Land protection, neighbor buffers, CoreProtect & lag-free farms',
    accentColor: 'border-cyan-500/35',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    icon: <Hammer className="w-4 h-4 text-cyan-400" />,
  },
  {
    category: 'Chat & Behavior Etiquette',
    subtitle: 'Global chat standards, respectful communication & anti-spam',
    accentColor: 'border-indigo-500/35',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    icon: <MessageSquare className="w-4 h-4 text-indigo-400" />,
  },
  {
    category: 'PvP/Fair Play',
    subtitle: 'Anti-cheat policy, approved mods, arena combat & consensual PvP',
    accentColor: 'border-amber-500/35',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: <Swords className="w-4 h-4 text-amber-400" />,
  },
];

const COMMAND_CATEGORIES: readonly ('All' | CommandCategory)[] = [
  'All',
  'Teleport',
  'Survival & Land',
  'Economy',
  'Combat & Social',
  'General',
];

export const InformationPage: React.FC = () => {
  const {
    siteSettings,
    stories,
    rules,
    commands,
    joinSteps,
    faqs,
    gameModes,
    isAdmin,
  } = useApp();

  const [selectedRuleCategory, setSelectedRuleCategory] = useState<
    StructuredRuleCategory | 'All'
  >('All');
  const [selectedCommandCategory, setSelectedCommandCategory] =
    useState<'All' | CommandCategory>('All');
  const [commandSearch, setCommandSearch] = useState<string>('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const javaIpOnly = siteSettings.javaHost;
  const bedrockIp = siteSettings.bedrockHost;
  const bedrockPort = String(Number(siteSettings.bedrockPort) || 19132);

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback handled silently
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // Active Warps & Realms
  const activeWarps = gameModes.filter((m) => m.published !== false);

  // Active Commands
  const activeCommands = commands.filter((c) => c.published !== false);
  const filteredCommands = activeCommands.filter((c) => {
    const matchesCategory =
      selectedCommandCategory === 'All' || c.category === selectedCommandCategory;
    if (!matchesCategory) return false;
    if (!commandSearch.trim()) return true;
    const q = commandSearch.trim().toLowerCase();
    return (
      c.command.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  // Active Rules normalized into the 4 structured categories
  const activeRules = rules
    .filter((r) => r.published !== false)
    .map((r) => ({
      ...r,
      normalizedCategory: normalizeRuleCategory(r.category),
    }));

  const visibleRuleCategories =
    selectedRuleCategory === 'All'
      ? RULE_CATEGORY_CONFIG
      : RULE_CATEGORY_CONFIG.filter((cfg) => cfg.category === selectedRuleCategory);

  // Active Join Steps
  const javaSteps = joinSteps.filter((s) => s.published !== false && s.edition === 'Java');
  const bedrockSteps = joinSteps.filter((s) => s.published !== false && s.edition === 'Bedrock');

  // Active Stories & FAQs
  const activeStories = stories.filter((s) => s.published !== false);
  const activeFaqs = faqs.filter((f) => f.published !== false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      {/* Page Header */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-10 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono uppercase tracking-widest text-emerald-400">
            <Server className="w-3.5 h-3.5" />
            <span>Warps, Essential Commands &amp; Server Rulebook</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white">
            PRO PLAYERS Server Information
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Explore our active server warps and realms, essential Minecraft &amp; crossplay
            commands, structured Server Rules &amp; Guidelines, and connection instructions.
          </p>
        </div>

        {/* Quick Copy Endpoints Widget in Header */}
        <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 space-y-3 shrink-0 min-w-[270px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Java Edition IP</span>
              <span className="font-mono text-sm font-bold text-emerald-300">{javaIpOnly}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(javaIpOnly, 'hdr-java')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              {copiedKey === 'hdr-java' ? 'Copied!' : 'Copy IP'}
            </button>
          </div>
          <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Bedrock IP &amp; Port</span>
              <span className="font-mono text-xs font-semibold text-cyan-300">
                {bedrockIp} · Port: {bedrockPort}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(bedrockPort, 'hdr-port')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors cursor-pointer"
            >
              {copiedKey === 'hdr-port' ? 'Copied!' : 'Copy Port'}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Dynamic Warps & Realms Section */}
      <section aria-labelledby="warps-realms-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              01. Server Realms &amp; Teleport Warps
            </p>
            <h2
              id="warps-realms-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Active Warps &amp; Realms
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Explore our server realms and copy the warp command to teleport directly in-game.
            </p>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Manage Warps in Admin Panel</span>
            </Link>
          )}
        </div>

        {activeWarps.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No active Warps or Realms are currently published in the database.
            </p>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors"
              >
                <span>Add Warps &amp; Realms in Admin Dashboard</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeWarps.map((mode) => (
              <div
                key={mode.id}
                className="rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-emerald-500/40 overflow-hidden flex flex-col sm:flex-row transition-colors shadow-lg"
              >
                <div className="sm:w-52 aspect-video sm:aspect-auto relative shrink-0 bg-slate-950">
                  <ResilientImage
                    src={mode.imageUrl}
                    alt={mode.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent sm:hidden" />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <DynamicIcon name={mode.iconName || 'Compass'} className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase tracking-wider">
                        Server Warp / Realm
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">{mode.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-300">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{mode.accessCommand}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(mode.accessCommand, `warp-${mode.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {copiedKey === `warp-${mode.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Warp</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Essential Server Commands List Section */}
      <section aria-labelledby="commands-heading" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              02. In-Game Command Reference
            </p>
            <h2
              id="commands-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Essential Server Commands List
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Frequently used Minecraft &amp; crossplay commands (<code className="font-mono text-emerald-300">/spawn</code>,{' '}
              <code className="font-mono text-emerald-300">/warp</code>,{' '}
              <code className="font-mono text-emerald-300">/tpa [player]</code>,{' '}
              <code className="font-mono text-emerald-300">/home</code>,{' '}
              <code className="font-mono text-emerald-300">/sethome</code>,{' '}
              <code className="font-mono text-emerald-300">/msg [player]</code>). Click any command to copy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search commands (e.g. /tpa)..."
                aria-label="Search server commands"
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manage Commands</span>
              </Link>
            )}
          </div>
        </div>

        {/* Category Filter Bar */}
        <div
          role="tablist"
          aria-label="Command Categories"
          className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 w-fit"
        >
          {COMMAND_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCommandCategory === cat}
              onClick={() => setSelectedCommandCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCommandCategory === cat
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredCommands.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-3">
            <p className="text-slate-400 text-sm">
              No matching commands found for this filter.
            </p>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors"
              >
                <span>Add or Edit Commands in Admin Panel</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommands.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-slate-900/85 border border-slate-800/90 hover:border-emerald-500/40 p-5 flex flex-col justify-between space-y-4 transition-colors shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <code className="px-3 py-1 rounded-lg bg-slate-950 border border-emerald-500/25 font-mono text-xs sm:text-sm font-bold text-emerald-300">
                      {item.command}
                    </code>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[11px] font-mono text-slate-400 border border-slate-800">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Java &amp; Bedrock Crossplay
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.command, `cmd-${item.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedKey === `cmd-${item.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Comprehensive, Structured Server Rules & Guidelines Section */}
      <section aria-labelledby="rules-heading" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              03. Official Code of Conduct
            </p>
            <h2
              id="rules-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Server Rules &amp; Guidelines
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Structured guidelines across General Rules, Building/Griefing Rules, Chat &amp;
              Behavior Etiquette, and PvP/Fair Play to ensure a fair experience for everyone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit or Add Rules in Admin Panel</span>
              </Link>
            )}
          </div>
        </div>

        {/* Rule Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Rule Categories"
          className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedRuleCategory === 'All'}
            onClick={() => setSelectedRuleCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedRuleCategory === 'All'
                ? 'bg-emerald-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All Categories ({activeRules.length})
          </button>
          {RULE_CATEGORY_CONFIG.map((cfg) => {
            const count = activeRules.filter(
              (r) => r.normalizedCategory === cfg.category
            ).length;
            return (
              <button
                key={cfg.category}
                type="button"
                role="tab"
                aria-selected={selectedRuleCategory === cfg.category}
                onClick={() => setSelectedRuleCategory(cfg.category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedRuleCategory === cfg.category
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cfg.category} ({count})
              </button>
            );
          })}
        </div>

        {/* Structured Category Cards Grid */}
        <div
          className={`grid grid-cols-1 ${
            selectedRuleCategory === 'All' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          } gap-6`}
        >
          {visibleRuleCategories.map((cfg) => {
            const categoryRules = activeRules.filter(
              (r) => r.normalizedCategory === cfg.category
            );
            return (
              <div
                key={cfg.category}
                className={`rounded-2xl bg-slate-900/85 border ${cfg.accentColor} p-6 space-y-5 shadow-xl flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/90">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        {cfg.icon}
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold text-white">
                          {cfg.category}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{cfg.subtitle}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border shrink-0 ${cfg.badgeClass}`}
                    >
                      {categoryRules.length}{' '}
                      {categoryRules.length === 1 ? 'Rule' : 'Rules'}
                    </span>
                  </div>

                  {/* Rules List inside Category */}
                  {categoryRules.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                      No rules currently listed in {cfg.category}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryRules.map((rule, idx) => (
                        <div
                          key={rule.id}
                          className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/90 hover:border-slate-700 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-emerald-300 flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="font-display text-base font-bold text-white">
                                {rule.title}
                              </h4>
                            </div>
                            <ShieldAlert className="w-4 h-4 text-amber-400/75 shrink-0" />
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                            {rule.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Enforced across Java &amp; Bedrock</span>
                  <span>Zero-Tolerance Fair Play</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. How to Join (Java IP-Only & Bedrock IP + Port Connection Cards) */}
      <section aria-labelledby="how-to-join-heading" className="space-y-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            04. Crossplay Connection Guide
          </p>
          <h2
            id="how-to-join-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
          >
            How to Join PRO PLAYERS
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Java and Bedrock connect to the same unified server via GeyserMC / Floodgate. Java
            requires only the server IP address; Bedrock requires both the IP and Port{' '}
            <code className="text-cyan-300">{bedrockPort}</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Java Connection Guide (IP Only — No Port Displayed) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Java Edition (PC / Mac / Linux)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Server IP: <span className="text-emerald-300 font-semibold">{javaIpOnly}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(javaIpOnly, 'join-java-ip')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedKey === 'join-java-ip' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied IP!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy IP</span>
                  </>
                )}
              </button>
            </div>

            {javaSteps.length > 0 && (
              <div className="space-y-4">
                {javaSteps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="text-xs font-mono text-emerald-400">
                      Step 0{step.stepNumber}
                    </div>
                    <h4 className="font-display text-base font-bold text-white">{step.title}</h4>
                    <p className="text-sm text-slate-300">{step.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bedrock Connection Guide (Both Bedrock IP & Port with 1-Click Copy for Each) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Bedrock Edition (Mobile / Console / Win10)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    IP: <span className="text-cyan-300">{bedrockIp}</span> · Port:{' '}
                    <span className="text-slate-200">{bedrockPort}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(bedrockIp, 'join-bedrock-ip')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedKey === 'join-bedrock-ip' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied IP!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy IP</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(bedrockPort, 'join-bedrock-port')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedKey === 'join-bedrock-port' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Port!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Port</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {bedrockSteps.length > 0 && (
              <div className="space-y-4">
                {bedrockSteps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="text-xs font-mono text-cyan-400">
                      Step 0{step.stepNumber}
                    </div>
                    <h4 className="font-display text-base font-bold text-white">{step.title}</h4>
                    <p className="text-sm text-slate-300">{step.description}</p>
                    {step.highlightText && (
                      <div className="pt-1 font-mono text-xs text-cyan-300">
                        {step.highlightText}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Server Story & Milestones */}
      {activeStories.length > 0 && (
        <section aria-labelledby="story-heading" className="space-y-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              05. Our Journey
            </p>
            <h2
              id="story-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Server Story &amp; Milestones
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeStories.map((story, index) => (
              <div
                key={story.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden flex flex-col"
              >
                <div className="aspect-video relative overflow-hidden bg-slate-950">
                  <ResilientImage
                    src={story.imageUrl}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-mono text-emerald-300">
                      Chapter 0{index + 1} · {story.dateLabel}
                    </span>
                    <span className="text-slate-400">{story.milestoneType}</span>
                  </div>
                </div>
                <div className="p-6 space-y-2 flex-1">
                  <h3 className="font-display text-xl font-bold text-white">{story.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{story.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. FAQ Accordion */}
      {activeFaqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="space-y-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              06. Help &amp; Answers
            </p>
            <h2
              id="faq-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {activeFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-display text-base font-bold text-white">
                        {faq.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline text-xs text-slate-400">
                        {faq.category}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180 text-emerald-400' : ''
                        }`}
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
