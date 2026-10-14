import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  LogOut,
  MailWarning,
  Megaphone,
  Menu,
  RefreshCw,
  Shield,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { ResilientImage } from './ResilientImage';
import { MinecraftAvatar } from './MinecraftAvatar';
import { normalizeAssetUrl, FALLBACK_BACKGROUND_URL } from '../lib/assetHelper';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, isAdmin, siteSettings, news } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [reloadingVerification, setReloadingVerification] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
    } catch {
      setVerificationSent(true);
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    setReloadingVerification(true);
    try {
      await auth.currentUser.reload();
      window.location.reload();
    } finally {
      setReloadingVerification(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/information', label: 'Information' },
    { to: '/community', label: 'Community' },
    { to: '/links', label: 'Links' },
  ];

  // Global Announcement Banner state
  const showGlobalAnnouncement =
    !announcementDismissed && siteSettings.announcementEnabled !== false;
  const announcementType = siteSettings.announcementType || 'news';
  const announcementTitle =
    siteSettings.announcementTitle?.trim() ||
    news[0]?.title ||
    'Season IV Crossplay Update Live!';
  const announcementMessage =
    siteSettings.announcementMessage?.trim() ||
    news[0]?.summary ||
    'Java & Bedrock (1.20.4 – 1.21.x) unified realms are online! Check out our upcoming community events and realm warps.';
  const announcementLinkText =
    siteSettings.announcementLinkText?.trim() || 'View Announcements';
  const announcementLinkUrl =
    siteSettings.announcementLinkUrl?.trim() || '/community';
  const isExternalAnnouncementLink = /^https?:\/\//i.test(announcementLinkUrl);

  const bannerTheme =
    announcementType === 'maintenance'
      ? {
          wrapper:
            'bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border-amber-500/40 text-amber-100',
          badge: 'bg-amber-400 text-slate-950',
          badgeLabel: 'MAINTENANCE UPDATE',
          icon: <Wrench className="w-3.5 h-3.5" />,
          cta: 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border-amber-400/40',
        }
      : announcementType === 'event'
        ? {
            wrapper:
              'bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-cyan-950/90 border-cyan-500/40 text-cyan-100',
            badge: 'bg-cyan-400 text-slate-950',
            badgeLabel: 'EVENT ALERT',
            icon: <Calendar className="w-3.5 h-3.5" />,
            cta: 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-200 border-cyan-400/40',
          }
        : announcementType === 'alert'
          ? {
              wrapper:
                'bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-950/90 border-rose-500/40 text-rose-100',
              badge: 'bg-rose-500 text-white',
              badgeLabel: 'IMPORTANT ALERT',
              icon: <AlertTriangle className="w-3.5 h-3.5" />,
              cta: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-400/40',
            }
          : {
              wrapper:
                'bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-950/90 border-emerald-500/40 text-emerald-100',
              badge: 'bg-emerald-400 text-slate-950',
              badgeLabel: 'SERVER NEWS',
              icon: <Megaphone className="w-3.5 h-3.5" />,
              cta: 'bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 border-emerald-400/40',
            };

  const effectiveBackgroundUrl = normalizeAssetUrl(
    siteSettings.backgroundImageUrl,
    FALLBACK_BACKGROUND_URL
  );

  return (
    <div className="min-h-screen flex flex-col relative bg-[#070B10] text-slate-100">
      {/* Full-Page Minecraft Background with Robust Responsive CSS Properties */}
      <div
        className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden select-none"
        aria-hidden="true"
      >
        <img
          src={effectiveBackgroundUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== FALLBACK_BACKGROUND_URL) {
              target.src = FALLBACK_BACKGROUND_URL;
            }
          }}
          className="w-full h-full min-w-full min-h-full object-cover object-center opacity-85 scale-102 saturate-115 contrast-105 absolute inset-0"
          style={{
            objectFit: 'cover',
            objectPosition: 'center center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 25%, rgba(7, 11, 16, 0.22) 0%, rgba(7, 11, 16, 0.55) 65%, rgba(7, 11, 16, 0.90) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B10]/35 via-[#070B10]/55 to-[#070B10]/90" />
      </div>

      {/* Top Navigation Bar — Clean 3-Zone Navigation Structure */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070B10]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-20">
          {/* Zone 1: Brand Lockup (Proportional Background-Removed Logo + PRO PLAYERS Text, No Border/Container/Glow) */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3.5 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
          >
            <ResilientImage
              src={siteSettings.officialLogoUrl}
              alt="PRO PLAYERS Official Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0"
            />
            <span className="font-display text-xl sm:text-2xl font-extrabold tracking-wider text-white group-hover:text-emerald-300 transition-colors">
              PRO PLAYERS
            </span>
          </Link>

          {/* Zone 2: Primary Navigation Links (Home | Information | Community | Links) */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    isActive
                      ? 'text-emerald-400 border-emerald-400 font-semibold'
                      : 'text-slate-300 border-transparent hover:text-white hover:border-slate-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-emerald-400 border-emerald-400 font-semibold'
                      : 'text-slate-300 border-transparent hover:text-white hover:border-slate-600'
                  }`
                }
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Zone 3: Right-Side Auth / Profile Action */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to="/profile"
                className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  location.pathname === '/profile'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:border-emerald-500/50 hover:text-white'
                }`}
              >
                <MinecraftAvatar
                  username={userProfile?.minecraftUsername || userProfile?.firstName || 'Player'}
                  customAvatarUrl={userProfile?.avatarUrl}
                  size="sm"
                  className="!w-6 !h-6 !rounded-md"
                />
                <span>{userProfile?.minecraftUsername || userProfile?.firstName || 'My Profile'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0A1017]/98 px-4 pt-3 pb-5 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`
                }
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}

            <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700"
                  >
                    <UserIcon className="w-4 h-4 text-emerald-400" />
                    <span>
                      Profile ({userProfile?.minecraftUsername || userProfile?.firstName || 'Account'})
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-300 bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Prominent Global Announcements Bar/Banner Near Top of Site */}
      {showGlobalAnnouncement && (
        <section
          aria-label="Global Server Announcement"
          className={`relative z-30 border-b backdrop-blur-md px-4 py-3 ${bannerTheme.wrapper}`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-extrabold tracking-wider shrink-0 ${bannerTheme.badge}`}
              >
                {bannerTheme.icon}
                <span>{bannerTheme.badgeLabel}</span>
              </span>

              <div className="text-xs sm:text-sm leading-snug min-w-0">
                <strong className="font-display font-bold text-white mr-2">
                  {announcementTitle}:
                </strong>
                <span className="text-slate-200">{announcementMessage}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {announcementLinkUrl &&
                (isExternalAnnouncementLink ? (
                  <a
                    href={announcementLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${bannerTheme.cta}`}
                  >
                    <span>{announcementLinkText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link
                    to={announcementLinkUrl}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${bannerTheme.cta}`}
                  >
                    <span>{announcementLinkText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap"
                  title="Edit Global Announcement Banner in Admin Panel"
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="hidden lg:inline">Edit Banner</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setAnnouncementDismissed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                aria-label="Dismiss announcement banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Email Verification Notice Banner for Signed-In Unverified Accounts */}
      {user && !user.emailVerified && (
        <div className="relative z-20 bg-amber-950/85 border-b border-amber-700/50 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <MailWarning className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Please verify your email address to secure your PRO PLAYERS account. Check your inbox
                or spam folder for the verification link.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {verificationSent ? (
                <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verification email sent!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="px-3 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 font-medium transition-colors"
                >
                  Resend Email
                </button>
              )}
              <button
                type="button"
                onClick={handleRefreshVerification}
                disabled={reloadingVerification}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${reloadingVerification ? 'animate-spin' : ''}`} />
                <span>I&apos;ve Verified</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">{children}</main>

      {/* Clean Footer with Official Website Logo */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#05080C]/95 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800/70">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3.5">
                <ResilientImage
                  src={siteSettings.officialLogoUrl}
                  alt="PRO PLAYERS Official Logo"
                  className="w-14 h-14 object-contain shrink-0"
                />
                <span className="font-display text-xl font-extrabold tracking-wider text-white">
                  PRO PLAYERS
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                {siteSettings.tagline}. Join players across Java and Bedrock editions for survival,
                competitive PvP, creative architecture, and community events.
              </p>
              <p className="text-xs text-slate-400">
                Free hosting: the server may sometimes be offline. Not an official Minecraft service;
                not approved by or associated with Mojang or Microsoft.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Navigation
              </h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>
                  <Link to="/" className="hover:text-emerald-400 transition-colors">
                    Home &amp; Live Status
                  </Link>
                </li>
                <li>
                  <Link to="/information" className="hover:text-emerald-400 transition-colors">
                    Information, Commands &amp; Rules
                  </Link>
                </li>
                <li>
                  <Link to="/community" className="hover:text-emerald-400 transition-colors">
                    Community, Leaderboards &amp; Events
                  </Link>
                </li>
                <li>
                  <Link to="/links" className="hover:text-emerald-400 transition-colors">
                    Official Social Links
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Server Endpoints
              </h2>
              <div className="space-y-2 text-xs font-mono tabular-nums text-slate-200 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Java IP:</span>
                  <span className="text-emerald-300 font-semibold">
                    {siteSettings.javaHost}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Bedrock IP &amp; Port:</span>
                  <span className="text-cyan-300 font-semibold">
                    {siteSettings.bedrockHost} · Port {siteSettings.bedrockPort || 19132}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Crossplay:</span>
                  <span className="text-slate-200">GeyserMC / Floodgate ({siteSettings.minecraftVersion})</span>
                </div>
              </div>
              {siteSettings.discordUrl && (
                <a
                  href={siteSettings.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 pt-1"
                >
                  <span>Join Official PRO PLAYERS Discord</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} PRO PLAYERS Community. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/profile" className="hover:text-white transition-colors">
                  My Profile
                </Link>
              ) : (
                <>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                  <span>·</span>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Register
                  </Link>
                </>
              )}
              {isAdmin && (
                <>
                  <span>·</span>
                  <Link to="/admin" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    Admin Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
