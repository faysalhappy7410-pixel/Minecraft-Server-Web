import React, { useEffect, useState } from 'react';

interface MinecraftAvatarProps {
  username: string;
  customAvatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Multi-source Minecraft player avatar component:
 * 1. Custom uploaded avatar / skin head URL (Firebase Storage or direct URL)
 * 2. mc-heads.net avatar endpoint (https://mc-heads.net/avatar/{username}/64)
 * 3. Crafatar avatar endpoint (https://crafatar.com/avatars/{username}?size=64&overlay)
 * 4. Custom SVG Voxel Head fallback with deterministic player colors
 */
export const MinecraftAvatar: React.FC<MinecraftAvatarProps> = ({
  username,
  customAvatarUrl,
  size = 'md',
  className = '',
}) => {
  const cleanUsername = (username || 'Steve').trim().replace(/[^a-zA-Z0-9_]/g, '') || 'Steve';

  const sources = [
    ...(customAvatarUrl && customAvatarUrl.trim() ? [customAvatarUrl.trim()] : []),
    `https://mc-heads.net/avatar/${encodeURIComponent(cleanUsername)}/64`,
    `https://crafatar.com/avatars/${encodeURIComponent(cleanUsername)}?size=64&overlay`,
  ];

  const [sourceIndex, setSourceIndex] = useState(0);
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setUseSvgFallback(false);
  }, [cleanUsername, customAvatarUrl]);

  const sizeClasses: Record<string, string> = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const handleImageError = () => {
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setUseSvgFallback(true);
    }
  };

  // Deterministic voxel SVG palette based on username
  const hash = cleanUsername.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const primaryHue = (hash * 37) % 360;
  const secondaryHue = (primaryHue + 35) % 360;

  if (useSvgFallback) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden border border-[rgba(var(--brand-primary-rgb),0.45)] bg-slate-950 flex items-center justify-center shrink-0 shadow-md ${className}`}
        title={`${cleanUsername} (Voxel Avatar)`}
      >
        <svg
          viewBox="0 0 16 16"
          className="w-full h-full"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`${cleanUsername} Minecraft avatar`}
        >
          {/* Base Voxel Head */}
          <rect width="16" height="16" fill={`hsl(${primaryHue}, 55%, 22%)`} />
          {/* Top Helmet / Hair Layer */}
          <rect x="0" y="0" width="16" height="5" fill={`hsl(${secondaryHue}, 70%, 16%)`} />
          <rect x="0" y="5" width="2" height="4" fill={`hsl(${secondaryHue}, 70%, 16%)`} />
          <rect x="14" y="5" width="2" height="4" fill={`hsl(${secondaryHue}, 70%, 16%)`} />
          {/* Crown / Visor Accent */}
          <rect x="2" y="2" width="12" height="2" fill="var(--brand-primary)" />
          {/* Glowing Eyes */}
          <rect x="2" y="8" width="4" height="2" fill="#ffffff" />
          <rect x="3" y="8" width="3" height="2" fill="var(--brand-primary)" />
          <rect x="10" y="8" width="4" height="2" fill="#ffffff" />
          <rect x="10" y="8" width="3" height="2" fill="var(--brand-primary)" />
          {/* Mouth / Chin Detail */}
          <rect x="5" y="12" width="6" height="2" fill={`hsl(${secondaryHue}, 65%, 12%)`} />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl overflow-hidden border border-[rgba(var(--brand-primary-rgb),0.45)] bg-slate-950 shrink-0 shadow-md ${className}`}
    >
      <img
        src={sources[sourceIndex]}
        alt={`${cleanUsername} Minecraft avatar`}
        referrerPolicy="no-referrer"
        onError={handleImageError}
        className="w-full h-full object-cover [image-rendering:pixelated]"
        loading="lazy"
      />
    </div>
  );
};
