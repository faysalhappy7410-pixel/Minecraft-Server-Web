import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
        <Compass className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">Error 404</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          Chunk Not Found
        </h1>
        <p className="text-sm text-slate-400">
          The coordinates you entered lead outside the world border of PRO PLAYERS.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to PRO PLAYERS Home</span>
        </Link>
      </div>
    </div>
  );
};
