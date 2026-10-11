import React from 'react';
import { ExternalLink, Globe, MessageSquare, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const LinksPage: React.FC = () => {
  const { siteSettings, socialLinks } = useApp();

  // Combine Firestore social_links with siteSettings URLs and filter out any empty/invalid '#' links
  const validSocialLinks = socialLinks.filter((item) => isValidExternalUrl(item.url));

  const primaryDiscord =
    validSocialLinks.find((l) => l.platform.toLowerCase() === 'discord' || l.isPrimary) ||
    (isValidExternalUrl(siteSettings.discordUrl)
      ? {
          id: 'settings_discord',
          platform: 'Discord',
          label: 'Official PRO PLAYERS Discord Server',
          url: siteSettings.discordUrl,
          description:
            'Join our main community hub for server announcements, voice chat, support tickets, and player trading.',
          colorHex: '#5865F2',
          isPrimary: true,
          order: 1,
          published: true,
          createdAt: '',
          updatedAt: '',
        }
      : null);

  const secondaryLinks = validSocialLinks.filter((l) => l.id !== primaryDiscord?.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800/80 pb-8">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Official Channels
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white">
            PRO PLAYERS Links
          </h1>
          <p className="text-base text-slate-300 max-w-2xl">
            Connect with the PRO PLAYERS community across our verified social platforms. All links
            open in a new tab.
          </p>
        </div>

        <ResilientImage
          src={siteSettings.officialLogoUrl}
          alt="PRO PLAYERS Official Logo"
          className="w-24 h-24 object-contain shrink-0 mix-blend-lighten drop-shadow-[0_0_18px_rgba(168,85,247,0.7)]"
        />
      </div>

      {/* Primary Featured Card: Discord (#5865F2) */}
      {primaryDiscord && isValidExternalUrl(primaryDiscord.url) && (
        <section aria-labelledby="discord-primary-heading">
          <div
            className="rounded-2xl p-6 sm:p-8 border shadow-2xl transition-transform"
            style={{
              background:
                'linear-gradient(135deg, rgba(88, 101, 242, 0.22) 0%, rgba(15, 23, 42, 0.92) 100%)',
              borderColor: '#5865F2',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-300">
                  <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                  <span>Primary Community Hub · Discord</span>
                </div>
                <h2
                  id="discord-primary-heading"
                  className="font-display text-2xl sm:text-3xl font-extrabold text-white"
                >
                  {primaryDiscord.label}
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {primaryDiscord.description}
                </p>
                <p className="text-xs font-mono text-indigo-200/90 break-all">
                  {primaryDiscord.url}
                </p>
              </div>

              <a
                href={primaryDiscord.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-base font-bold text-white transition-opacity hover:opacity-95 shadow-lg whitespace-nowrap shrink-0"
                style={{ backgroundColor: '#5865F2' }}
              >
                <span>Join Discord Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Secondary Social Platform Cards (YouTube, Instagram, Facebook, plus optional TikTok / X if configured) */}
      <section aria-labelledby="social-platforms-heading" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2
            id="social-platforms-heading"
            className="font-display text-xl sm:text-2xl font-bold text-white"
          >
            Official Social Networks
          </h2>
          <span className="text-xs text-slate-400">
            {secondaryLinks.length} Active {secondaryLinks.length === 1 ? 'Channel' : 'Channels'}
          </span>
        </div>

        {secondaryLinks.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400">
            No additional social links are currently configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {secondaryLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-600 p-6 flex flex-col justify-between space-y-5 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: `${link.colorHex || '#10b981'}18`,
                        borderColor: `${link.colorHex || '#10b981'}50`,
                        color: link.colorHex || '#10b981',
                      }}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-slate-400">{link.platform}</span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{link.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                  <span className="truncate max-w-[200px] font-mono text-slate-400">
                    {link.url.replace(/^https?:\/\//, '')}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <span>Visit</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
