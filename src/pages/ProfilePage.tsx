import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RotateCcw,
  Save,
  Shield,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import {
  auth,
  isSuperAdminEmail,
  safeSaveUserProfile,
  uploadUserAvatar,
  validateMinecraftUsername,
  validateOptionalUrl,
} from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import { MinecraftAvatar } from '../components/MinecraftAvatar';
import { UserProfile } from '../types/cms';

export const ProfilePage: React.FC = () => {
  const { user, userProfile, isAdmin, authLoading, siteSettings, refreshUserProfile } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [bio, setBio] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setMinecraftUsername(userProfile.minecraftUsername || '');
      setDiscordUsername(userProfile.discordUsername || '');
      setBio(userProfile.bio || '');
      setInstagramUrl(userProfile.instagramUrl || '');
      setFacebookUrl(userProfile.facebookUrl || '');
      setAvatarUrl(userProfile.avatarUrl || '');
    }
  }, [userProfile]);

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400">
        Loading your PRO PLAYERS profile...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleAvatarFileUpload = async (file: File) => {
    setUploadingAvatar(true);
    setFeedback(null);
    try {
      const uploadedUrl = await uploadUserAvatar(file, user.uid);
      setAvatarUrl(uploadedUrl);
      setFeedback({
        type: 'success',
        message: 'Custom skin/avatar uploaded to Firebase Storage! Click "Save Changes" to apply.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload custom avatar.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancel = () => {
    setFeedback(null);
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setMinecraftUsername(userProfile.minecraftUsername || '');
      setDiscordUsername(userProfile.discordUsername || '');
      setBio(userProfile.bio || '');
      setInstagramUrl(userProfile.instagramUrl || '');
      setFacebookUrl(userProfile.facebookUrl || '');
      setAvatarUrl(userProfile.avatarUrl || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedFirst = firstName.trim();
    const trimmedMc = minecraftUsername.trim();
    const trimmedDiscord = discordUsername.trim();
    const trimmedBio = bio.trim();
    const trimmedInsta = instagramUrl.trim();
    const trimmedFb = facebookUrl.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (!trimmedFirst || trimmedFirst.length > 60) {
      setFeedback({
        type: 'error',
        message: 'First name is required and must be 60 characters or fewer.',
      });
      return;
    }

    const mcError = validateMinecraftUsername(trimmedMc);
    if (mcError) {
      setFeedback({ type: 'error', message: mcError });
      return;
    }

    if (trimmedDiscord.length > 60) {
      setFeedback({
        type: 'error',
        message: 'Discord username must be 60 characters or fewer.',
      });
      return;
    }

    if (trimmedBio.length > 500) {
      setFeedback({
        type: 'error',
        message: 'Bio must be 500 characters or fewer.',
      });
      return;
    }

    const instaError = validateOptionalUrl(trimmedInsta, 'Instagram URL');
    if (instaError) {
      setFeedback({ type: 'error', message: instaError });
      return;
    }

    const fbError = validateOptionalUrl(trimmedFb, 'Facebook URL');
    if (fbError) {
      setFeedback({ type: 'error', message: fbError });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const effectiveEmail = userProfile?.email || user.email || 'player@proplayers.gg';
      const resolvedRole =
        isSuperAdminEmail(effectiveEmail) || userProfile?.role === 'admin' ? 'admin' : 'user';
      const updatedProfile: UserProfile = {
        uid: user.uid,
        email: effectiveEmail,
        firstName: trimmedFirst,
        minecraftUsername: trimmedMc,
        discordUsername: trimmedDiscord,
        bio: trimmedBio,
        instagramUrl: trimmedInsta,
        facebookUrl: trimmedFb,
        avatarUrl: trimmedAvatar.slice(0, 500),
        role: resolvedRole,
        createdAt: userProfile?.createdAt || now,
        updatedAt: now,
      };

      await safeSaveUserProfile(user.uid, updatedProfile);
      await refreshUserProfile();
      setFeedback({
        type: 'success',
        message: 'Your PRO PLAYERS profile has been saved.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Profile Header with Official Website Logo */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <ResilientImage
            src={siteSettings.officialLogoUrl}
            alt="PRO PLAYERS Official Logo"
            className="w-20 h-20 object-contain shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                PRO PLAYERS Member Account
              </p>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                  {isSuperAdminEmail(user.email) ? 'MASTER ADMIN' : 'ADMIN'}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {minecraftUsername || firstName || 'Player Profile'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Manage your identity, skin/avatar, and public community card. Your email address is
              never shown publicly.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/60 hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Edit Profile Form */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Edit Profile Information</h2>
            <p className="text-xs text-slate-400 mt-1">
              Update your required account identity, custom skin/avatar upload, and optional
              community links.
            </p>
          </div>

          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-800/70 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prof-firstName"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  First Name *
                </label>
                <input
                  id="prof-firstName"
                  type="text"
                  required
                  maxLength={60}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-mc"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Minecraft Username *
                </label>
                <input
                  id="prof-mc"
                  type="text"
                  required
                  minLength={3}
                  maxLength={16}
                  value={minecraftUsername}
                  onChange={(e) => setMinecraftUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Multi-Source Avatar & Manual Skin/Avatar Upload to Firebase Storage */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Minecraft Avatar (mc-heads / Crafatar / Custom Upload)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatically fetches your head from mc-heads.net &amp; Crafatar, or upload a
                    custom avatar to Firebase Storage.
                  </p>
                </div>
                <MinecraftAvatar
                  username={minecraftUsername || 'Steve'}
                  customAvatarUrl={avatarUrl}
                  size="md"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  maxLength={500}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Leave blank for auto mc-heads/Crafatar or paste custom URL..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{uploadingAvatar ? 'Uploading...' : 'Upload Skin/Avatar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarFileUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="prof-discord"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Discord Username (Optional)
              </label>
              <input
                id="prof-discord"
                type="text"
                maxLength={60}
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
                placeholder="e.g. player_handle"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="prof-bio"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Public Bio (Optional, max 500 characters)
              </label>
              <textarea
                id="prof-bio"
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your favorite game mode, build style, or PRO PLAYERS achievements..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              <div className="text-right text-[11px] text-slate-500 mt-1">
                {bio.length} / 500 characters
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prof-insta"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Instagram URL (Optional)
                </label>
                <input
                  id="prof-insta"
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
                  htmlFor="prof-fb"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Facebook URL (Optional)
                </label>
                <input
                  id="prof-fb"
                  type="url"
                  maxLength={300}
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview of Safe Public Player Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4 brand-card-glow">
            <h2 className="font-display text-lg font-bold text-white">
              Public Profile Card Preview
            </h2>
            <p className="text-xs text-slate-400">
              This is how your card appears to other players on the PRO PLAYERS Community page.
              Private fields (like your email) are strictly hidden.
            </p>

            <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <MinecraftAvatar
                  username={minecraftUsername || 'Steve'}
                  customAvatarUrl={avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-white truncate">
                    {minecraftUsername || 'YourMinecraftName'}
                  </div>
                  <div className="text-xs text-emerald-400">PRO PLAYERS Member</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {bio || 'No public bio added yet.'}
              </p>

              <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                {discordUsername && (
                  <div className="flex items-center justify-between">
                    <span>Discord:</span>
                    <span className="font-mono text-slate-200">{discordUsername}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <span>Instagram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                      <span>Facebook</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!instagramUrl && !facebookUrl && !discordUsername && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <UserIcon className="w-3 h-3" />
                      <span>Public Card Active</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
