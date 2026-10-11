import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 text-slate-400 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-8 h-8 text-emerald-400/70 mb-2 shrink-0" />
        <span className="text-xs font-medium tracking-wide text-slate-300 line-clamp-2">
          {fallbackLabel || alt || 'PRO PLAYERS'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
