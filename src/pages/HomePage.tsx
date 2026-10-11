import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Layers,
  RefreshCw,
  Server,
  Shield,
  Smartphone,
  Terminal,
  Trophy,
  Users,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LeaderboardCategory } from '../types/cms';
import { DynamicIcon } from '../components/DynamicIcon';
import { ResilientImage } from '../components/ResilientImage';
import { MinecraftAvatar } from '../components/MinecraftAvatar';

type CopyTarget =
  | 'hero-java'
  | 'java-ip'
  | 'bedrock-ip'
  | 'bedrock-port'
  | string
  | null;

const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  'PvP Master',
  'Master Builder',
  'Minigame Champion',
  'Play Time Legend',
  'Community Helper',
  'Event Winner',
];

export const HomePage: React.FC = () => {
  const {
    siteSettings,
    features,
    commands,
    leaderboards,
    isAdmin,
    javaStatus,
    bedrockStatus,
    statusLoading,
    statusCooldownSeconds,
    refreshServerStatus,
  } = useApp();

  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  const [copiedValue, setCopiedValue] = useState<string>('');
  const [activeLeaderboardTab, setActiveLeaderboardTab] =
    useState<LeaderboardCategory>('PvP Master');

  const javaIpOnly = siteSettings.javaHost;
  const bedrockIp = siteSettings.bedrockHost;
  const bedrockPort = String(Number(siteSettings.bedrockPort) || 19132);

  // Unified Crossplay Server Status (GeyserMC / Floodgate connects Java & Bedrock to the same server)
  const serverOnline = Boolean(javaStatus.online || bedrockStatus.online);
  const playersOnline = javaStatus.online
    ? javaStatus.playersOnline
    : bedrockStatus.online
      ? bedrockStatus.playersOnline
      : 0;
  const playersMax =
    (javaStatus.online ? javaStatus.playersMax : bedrockStatus.playersMax) || 100;
  const serverVersion = siteSettings.minecraftVersion || javaStatus.version;
  const serverMotd = javaStatus.online
    ? javaStatus.motdClean
    : bedrockStatus.online
      ? bedrockStatus.motdClean
      : javaStatus.motdClean || 'PRO PLAYERS Crossplay Network — GeyserMC & Floodgate Enabled';

  const copyToClipboard = async (text: string, target: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback handled silently
    }
    setCopiedValue(text);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2500);
  };

  // Six editable preview cards for Home
  const homeFeatures = features
    .filter((f) => f.showOnHome !== false)
    .slice(0, 6);

  // Essential Server Commands preview (top 6)
  const essentialCommands = commands
    .filter((c) => c.published !== false)
    .slice(0, 6);

  // Leaderboard entries for selected category
  const currentLeaderboardEntries = leaderboards
    .filter((entry) => entry.category === activeLeaderboardTab)
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-20 pb-12">
      {/* Toast Notification for Copy Actions */}
      {copiedTarget && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm shadow-xl border border-emerald-300"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>
            Copied to clipboard:{' '}
            <code className="font-mono font-bold">{copiedValue}</code>
          </span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Centrally Positioned Very Large Background-Removed Logo above PRO PLAYERS Title, Tagline, Description & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-center text-center space-y-6">
              <div className="flex flex-col items-center space-y-4 w-full">
                <ResilientImage
                  src={siteSettings.officialLogoUrl}
                  alt="PRO PLAYERS Official Website Logo"
                  className="w-72 sm:w-88 lg:w-[26rem] h-auto object-contain mx-auto select-none"
                />

                <div className="space-y-1.5">
                  <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-emerald-400">
                    GeyserMC &amp; Floodgate Crossplay Server
                  </p>
                  <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white">
                    PRO PLAYERS
                  </h1>
                </div>
              </div>

              <p className="font-display text-xl sm:text-2xl font-semibold text-slate-100 leading-snug max-w-2xl">
                {siteSettings.tagline}
              </p>

              <p className="text-base text-slate-200 leading-relaxed max-w-2xl">
                {siteSettings.description}
              </p>

              {/* Primary Action Controls: Large Copy Java IP + Large Join Discord */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(javaIpOnly, 'hero-java')}
                  className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm sm:text-base font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedTarget === 'hero-java' ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Copied IP! ({javaIpOnly})</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Java IP: {javaIpOnly}</span>
                    </>
                  )}
                </button>

                {siteSettings.discordUrl && (
                  <a
                    href={siteSettings.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] transition-colors shadow-lg whitespace-nowrap shrink-0"
                  >
                    <span>Join Discord</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Explicit Free Hosting Notice */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Free hosting: the server may sometimes be offline.</span>
              </div>
            </div>

            {/* Right Column: Theme Showcase & Quick Crossplay Connection Overview */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 shadow-2xl">
                <div className="relative aspect-video overflow-hidden">
                  <ResilientImage
                    src={siteSettings.themeReferenceUrl || siteSettings.backgroundImageUrl}
                    alt="PRO PLAYERS World Showcase"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070B10] via-[#070B10]/30 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                    <span className="font-semibold">PRO PLAYERS Crossplay Realm</span>
                    <span className="font-mono text-emerald-300">{siteSettings.minecraftVersion}</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Crossplay Connection Summary</span>
                    <Link
                      to="/information"
                      className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                    >
                      <span>Commands &amp; Rules</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs tabular-nums">
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 mb-1 font-sans">Java Edition IP</div>
                        <div className="text-emerald-300 font-semibold truncate">
                          {javaIpOnly}
                        </div>
                      </div>
                      <div className="text-slate-500 mt-1 text-[11px] font-sans">
                        Default Connection (No Port Needed)
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 mb-1 font-sans">Bedrock IP &amp; Port</div>
                        <div className="text-cyan-300 font-semibold truncate">
                          {bedrockIp}
                        </div>
                      </div>
                      <div className="text-slate-300 mt-1">Port: {bedrockPort}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Server Online Status + Separate Java & Bedrock Connection Cards */}
      <section aria-labelledby="live-status-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>GeyserMC / Floodgate Unified Crossplay</span>
            </div>
            <h2
              id="live-status-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white"
            >
              Server Online Status &amp; Connection Details
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Java and Bedrock players connect to the exact same unified PRO PLAYERS realm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshServerStatus(false)}
            disabled={statusLoading || statusCooldownSeconds > 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-emerald-500/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>
              {statusLoading
                ? 'Checking Server...'
                : statusCooldownSeconds > 0
                  ? `Refresh Available in ${statusCooldownSeconds}s`
                  : 'Refresh Server Status'}
            </span>
          </button>
        </div>

        {/* 1. ONE Combined Server Online Status Banner Card */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  serverOnline
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/90 border-slate-700 text-amber-400'
                }`}
              >
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-xl font-extrabold text-white">
                    PRO PLAYERS Unified Network
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                    Java + Bedrock Crossplay
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Powered by GeyserMC &amp; Floodgate — Play together across PC, Console, and Mobile
                </p>
              </div>
            </div>

            {/* Unified Online / Offline Status Pill */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border self-start md:self-auto ${
                serverOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700'
              }`}
            >
              {serverOnline ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SERVER ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span>OFFLINE / STANDBY</span>
                </>
              )}
            </div>
          </div>

          {/* Combined Status Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs tabular-nums">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <span className="text-slate-400 block font-sans text-xs mb-1">Online Players</span>
              <span className="text-lg font-bold text-white inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>
                  {playersOnline} / {playersMax}
                </span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <span className="text-slate-400 block font-sans text-xs mb-1">Supported Version</span>
              <span className="text-sm font-bold text-emerald-300 block truncate" title={serverVersion}>
                {serverVersion}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <span className="text-slate-400 block font-sans text-xs mb-1">Server MOTD</span>
              <span className="text-xs text-slate-200 block truncate" title={serverMotd}>
                {serverMotd}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Separate Java & Bedrock Connection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Java Connection Card: ONLY Java IP Address + 1-Click Copy IP (No Port Shown) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      Java Edition Connection
                    </h3>
                    <p className="text-xs text-slate-400">
                      PC, Mac &amp; Linux Clients (Standard Direct Connect)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  Java Edition
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Java Server IP Address</div>
                  <div className="font-mono text-base sm:text-lg font-bold text-emerald-300 select-all">
                    {javaIpOnly}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(javaIpOnly, 'java-ip')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedTarget === 'java-ip' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied IP!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy IP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Enter the IP above directly in Multiplayer &rarr; Add Server</span>
              <Link to="/information" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                Java Guide &rarr;
              </Link>
            </div>
          </div>

          {/* Bedrock Connection Card: Shows BOTH Bedrock IP AND Bedrock Port with 1-Click Copy Button for EACH */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      Bedrock Edition Connection
                    </h3>
                    <p className="text-xs text-slate-400">
                      Windows, Mobile (iOS/Android), Xbox, PlayStation &amp; Switch
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  Bedrock / Geyser
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Bedrock IP Box + 1-Click Copy Button */}
                <div className="sm:col-span-7 p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 mb-1">Bedrock IP Address</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-cyan-300 truncate select-all">
                      {bedrockIp}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bedrockIp, 'bedrock-ip')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedTarget === 'bedrock-ip' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy IP</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bedrock Port Box + 1-Click Copy Button */}
                <div className="sm:col-span-5 p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Bedrock Port</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-slate-100 tabular-nums select-all">
                      {bedrockPort}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bedrockPort, 'bedrock-port')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedTarget === 'bedrock-port' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
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
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Enter both the Bedrock IP and Port ({bedrockPort}) when adding server</span>
              <Link to="/information" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Bedrock Guide &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Six Editable Preview Cards: Survival, PvP Arena, Creative Builds, Minigames, Community Events, Friendly Staff */}
      <section aria-labelledby="preview-cards-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Core Experience
            </p>
            <h2
              id="preview-cards-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Built for Every Playstyle on PRO PLAYERS
            </h2>
          </div>
          <Link
            to="/information"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Explore All Warps, Commands &amp; Rules</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {homeFeatures.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
            No feature cards are currently published.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeFeatures.map((feature, idx) => (
              <div
                key={feature.id}
                className="rounded-2xl bg-slate-900/75 border border-slate-800/90 hover:border-emerald-500/40 p-6 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                      <DynamicIcon name={feature.iconName} className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      0{idx + 1} · {feature.category}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{feature.description}</p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                  <span>PRO PLAYERS Realm</span>
                  <Link
                    to={
                      feature.title.toLowerCase().includes('event') ||
                      feature.title.toLowerCase().includes('staff')
                        ? '/community'
                        : '/information'
                    }
                    className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visible Server Leaderboard Section & Stylish Placeholder State */}
      <section
        aria-labelledby="home-leaderboard-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Seasonal Hall of Fame
            </p>
            <h2
              id="home-leaderboard-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Server Leaderboard &amp; Top Rankings
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Track top players across PvP, Creative Architecture, Minigames, and Survival Playtime.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Home Leaderboard Categories"
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

        {currentLeaderboardEntries.length === 0 ? (
          <div className="space-y-6">
            {/* Podium Placeholder Cards so users see the Leaderboard layout */}
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

            {/* Clean & Stylish Placeholder Notice */}
            <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-7 sm:p-8 text-center space-y-3 shadow-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Leaderboard updating soon</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                No leaderboard stats available yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Rankings for <strong className="text-white">{activeLeaderboardTab}</strong> will
                appear here once active player stats and seasonal tournament scores are recorded.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/community"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <span>Open Community Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors"
                  >
                    <span>Manage Leaderboard in Admin</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 overflow-hidden shadow-lg">
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
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
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
      </section>

      {/* Essential Commands & Server Rules Quick Reference on Home */}
      <section
        aria-labelledby="quick-commands-rules-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Columns: Essential Server Commands List */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  Quick In-Game Help
                </span>
                <h2
                  id="quick-commands-rules-heading"
                  className="font-display text-2xl font-bold text-white mt-0.5"
                >
                  Essential Server Commands
                </h2>
              </div>
              <Link
                to="/information"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <span>View All Commands</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {essentialCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-3.5 rounded-xl bg-slate-950/85 border border-slate-800/90 hover:border-emerald-500/40 flex flex-col justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="px-2.5 py-1 rounded bg-slate-900 border border-emerald-500/25 font-mono text-xs font-bold text-emerald-300">
                      {cmd.command}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cmd.command, `home-cmd-${cmd.id}`)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTarget === `home-cmd-${cmd.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{cmd.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 Columns: Structured Server Rules & Guidelines Summary */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 p-6 sm:p-8 flex flex-col justify-between space-y-5 shadow-xl">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  Code of Conduct
                </span>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  Server Rules &amp; Guidelines
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Our community enforces clear rules across four structured pillars to keep gameplay
                welcoming and fair for every Java and Bedrock player:
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    title: '1. General Rules',
                    desc: 'Respect all players & staff, account security, and crossplay fairness.',
                  },
                  {
                    title: '2. Building/Griefing Rules',
                    desc: 'Zero tolerance for griefing or theft, 64-block buffers, and lag-free farms.',
                  },
                  {
                    title: '3. Chat & Behavior Etiquette',
                    desc: 'Clean global chat, no external server advertising, and respectful /msg use.',
                  },
                  {
                    title: '4. PvP/Fair Play',
                    desc: 'No hacked clients, X-Ray, or macros; consensual wilderness PvP.',
                  },
                ].map((cat) => (
                  <div
                    key={cat.title}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-0.5"
                  >
                    <div className="font-display text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cat.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-5">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/information"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-colors"
              >
                <Terminal className="w-4 h-4" />
                <span>Read Full Rules &amp; Commands Guide</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
