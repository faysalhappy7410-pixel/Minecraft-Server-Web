import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, KeyRound, LogIn, UserPlus } from 'lucide-react';
import {
  auth,
  isSuperAdminEmail,
  safeSaveUserProfile,
  syncAuthenticatedUserProfile,
  validateMinecraftUsername,
  validateOptionalUrl,
} from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import { UserProfile } from '../types/cms';

export const LoginPage: React.FC = () => {
  const { siteSettings, refreshUserProfile } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await syncAuthenticatedUserProfile(cred.user);
      await refreshUserProfile();
      if (isSuperAdminEmail(cred.user.email) || profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (msg.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in Firebase Console. Please enable Email/Password under Authentication > Sign-in method.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (!email.trim()) {
      setError('Please enter your account email address to receive a password reset link.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccess(
        'Password reset email sent! Check your inbox for instructions to reset your PRO PLAYERS password.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <ResilientImage
            src={siteSettings.officialLogoUrl}
            alt="PRO PLAYERS Official Logo"
            className="w-28 h-28 object-contain"
          />
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              {forgotMode ? 'Reset PRO PLAYERS Password' : 'Sign In to PRO PLAYERS'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {forgotMode
                ? 'Enter your email address to receive a password reset link.'
                : 'Access your PRO PLAYERS community profile and account settings.'}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-xs text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-xs text-emerald-200 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{resetSuccess}</span>
          </div>
        )}

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Account Email Address *
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Sending Reset Link...' : 'Send Password Reset Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white py-1 cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Email Address *
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Don&apos;t have a PRO PLAYERS account yet?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { siteSettings, refreshUserProfile } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [bio, setBio] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedFirst = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedMc = minecraftUsername.trim();
    const trimmedDiscord = discordUsername.trim();
    const trimmedBio = bio.trim();
    const trimmedInsta = instagramUrl.trim();
    const trimmedFb = facebookUrl.trim();

    if (!trimmedFirst || trimmedFirst.length > 60) {
      setError('First name is required and must be 60 characters or fewer.');
      return;
    }

    const mcValidationError = validateMinecraftUsername(trimmedMc);
    if (mcValidationError) {
      setError(mcValidationError);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedDiscord.length > 60) {
      setError('Discord username must be 60 characters or fewer.');
      return;
    }

    if (trimmedBio.length > 500) {
      setError('Bio must be 500 characters or fewer.');
      return;
    }

    const instaErr = validateOptionalUrl(trimmedInsta, 'Instagram URL');
    if (instaErr) {
      setError(instaErr);
      return;
    }

    const fbErr = validateOptionalUrl(trimmedFb, 'Facebook URL');
    if (fbErr) {
      setError(fbErr);
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const now = new Date().toISOString();
      const isMasterAdmin = isSuperAdminEmail(trimmedEmail);

      // Automatically assign 'admin' if email matches SUPER_ADMIN_EMAILS; otherwise strictly 'user'.
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: trimmedEmail,
        firstName: trimmedFirst,
        minecraftUsername: trimmedMc,
        discordUsername: trimmedDiscord,
        bio: trimmedBio,
        instagramUrl: trimmedInsta,
        facebookUrl: trimmedFb,
        role: isMasterAdmin ? 'admin' : 'user',
        createdAt: now,
        updatedAt: now,
      };

      await safeSaveUserProfile(cred.user.uid, newProfile);

      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Non-blocking if email verification sending is throttled
      }

      await refreshUserProfile();
      navigate(isMasterAdmin ? '/admin' : '/profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/email-already-in-use')) {
        setError('This email address is already registered. Please sign in instead.');
      } else if (msg.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password registration is not yet enabled in Firebase Console. Please enable Email/Password under Authentication > Sign-in method.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <ResilientImage
            src={siteSettings.officialLogoUrl}
            alt="PRO PLAYERS Official Logo"
            className="w-28 h-28 object-contain"
          />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Create Your PRO PLAYERS Account
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Register with your email and Minecraft username to join our community directory.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 text-xs text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-firstName"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                First Name *
              </label>
              <input
                id="reg-firstName"
                type="text"
                required
                maxLength={60}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="reg-mc"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Minecraft Username * (3–16 chars)
              </label>
              <input
                id="reg-mc"
                type="text"
                required
                minLength={3}
                maxLength={16}
                value={minecraftUsername}
                onChange={(e) => setMinecraftUsername(e.target.value)}
                placeholder="AlexBuilder_99"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Email Address * (Kept Private)
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Password * (Min 6 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Optional Public Profile Information
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="reg-discord"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Discord Username (Optional)
                </label>
                <input
                  id="reg-discord"
                  type="text"
                  maxLength={60}
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="alexbuilder"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-bio"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Short Player Bio (Optional, max 500 chars)
                </label>
                <textarea
                  id="reg-bio"
                  rows={3}
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the PRO PLAYERS community about your favorite builds or game modes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="reg-insta"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Instagram URL (Optional)
                  </label>
                  <input
                    id="reg-insta"
                    type="url"
                    maxLength={300}
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-fb"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Facebook URL (Optional)
                  </label>
                  <input
                    id="reg-fb"
                    type="url"
                    maxLength={300}
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Create PRO PLAYERS Account'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
