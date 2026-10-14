import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Compass,
  Crown,
  Database,
  Edit3,
  FileText,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Terminal,
  Trophy,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  assertAdminAccess,
  db,
  isSuperAdminEmail,
  safeAdminDeleteUser,
  safeAdminUpdateUserRole,
  safeGetAllRegisteredUsers,
  SUPER_ADMIN_EMAILS,
  uploadCmsImage,
} from '../lib/firebase';
import {
  isCollectionMarkedCustomized,
  markCollectionCustomized,
  useApp,
} from '../context/AppContext';
import {
  BUILD_ARENA_ASSET,
  BUILD_CITADEL_ASSET,
  BUILD_GARDENS_ASSET,
  normalizeRuleCategory,
  SEED_COMMANDS,
  SEED_EVENTS,
  SEED_FAQS,
  SEED_FEATURES,
  SEED_GALLERY,
  SEED_GAME_MODES,
  SEED_JOIN_STEPS,
  SEED_LEADERBOARDS,
  SEED_NEWS,
  SEED_RULES,
  SEED_SOCIAL_LINKS,
  SEED_STAFF,
  SEED_STORIES,
  SEED_TESTIMONIALS,
  seedDatabaseToFirestore,
  THEME_REFERENCE_ASSET,
} from '../data/seedData';
import { GlobalAnnouncementType, SiteSettings, UserProfile } from '../types/cms';
import { ResilientImage } from '../components/ResilientImage';
import { MinecraftAvatar } from '../components/MinecraftAvatar';

type AdminSidebarSection =
  | 'dashboard'
  | 'warps_manager'
  | 'commands_manager'
  | 'rules_manager'
  | 'events_manager'
  | 'announcements_manager'
  | 'leaderboards_manager'
  | 'users'
  | 'site_settings'
  | 'content'
  | 'community'
  | 'social_links';

type CmsCollectionKey =
  | 'stories'
  | 'rules'
  | 'commands'
  | 'join_steps'
  | 'faqs'
  | 'features'
  | 'game_modes'
  | 'leaderboards'
  | 'staff'
  | 'gallery'
  | 'testimonials'
  | 'events'
  | 'news'
  | 'social_links';

interface FieldSpec {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'image';
  options?: string[];
  required?: boolean;
  maxLength?: number;
  storageCategory?: string;
}

const SEED_FALLBACK_MAP: Record<CmsCollectionKey, { id: string }[]> = {
  stories: SEED_STORIES,
  rules: SEED_RULES,
  commands: SEED_COMMANDS,
  join_steps: SEED_JOIN_STEPS,
  faqs: SEED_FAQS,
  features: SEED_FEATURES,
  game_modes: SEED_GAME_MODES,
  leaderboards: SEED_LEADERBOARDS,
  staff: SEED_STAFF,
  gallery: SEED_GALLERY,
  testimonials: SEED_TESTIMONIALS,
  events: SEED_EVENTS,
  news: SEED_NEWS,
  social_links: SEED_SOCIAL_LINKS,
};

const WARP_IMAGE_PRESETS = [
  { label: 'Survival Realm', url: THEME_REFERENCE_ASSET },
  { label: 'PvP Colosseum', url: BUILD_ARENA_ASSET },
  { label: 'Sky Citadel', url: BUILD_CITADEL_ASSET },
  { label: 'Elysium Gardens', url: BUILD_GARDENS_ASSET },
];

const COLLECTION_SCHEMAS: Record<
  CmsCollectionKey,
  {
    title: string;
    group: 'content' | 'community' | 'social_links';
    fields: FieldSpec[];
    defaultValues: Record<string, unknown>;
  }
> = {
  stories: {
    title: 'Server Story Timeline',
    group: 'content',
    fields: [
      { name: 'title', label: 'Milestone Title', type: 'text', required: true, maxLength: 120 },
      { name: 'dateLabel', label: 'Date Label (e.g. June 2024)', type: 'text', required: true, maxLength: 60 },
      { name: 'milestoneType', label: 'Milestone Type', type: 'text', required: true, maxLength: 60 },
      { name: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 1000 },
      { name: 'imageUrl', label: 'Milestone Image', type: 'image', storageCategory: 'stories', maxLength: 500 },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      dateLabel: '2026',
      milestoneType: 'Milestone',
      description: '',
      imageUrl: '',
      order: 1,
      published: true,
    },
  },
  rules: {
    title: 'Server Rules & Guidelines',
    group: 'content',
    fields: [
      { name: 'title', label: 'Rule Title', type: 'text', required: true, maxLength: 120 },
      {
        name: 'category',
        label: 'Rule Category',
        type: 'select',
        options: [
          'General Rules',
          'Building/Griefing Rules',
          'Chat & Behavior Etiquette',
          'PvP/Fair Play',
        ],
        required: true,
      },
      { name: 'description', label: 'Rule Description & Details', type: 'textarea', required: true, maxLength: 800 },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      category: 'General Rules',
      description: '',
      order: 1,
      published: true,
    },
  },
  commands: {
    title: 'Minecraft Server Commands',
    group: 'content',
    fields: [
      {
        name: 'command',
        label: 'Command Syntax (e.g. /spawn, /warp, /tpa [player], /home, /sethome, /msg [player])',
        type: 'text',
        required: true,
        maxLength: 80,
      },
      {
        name: 'category',
        label: 'Command Category',
        type: 'select',
        options: ['Teleport', 'Survival & Land', 'Economy', 'Combat & Social', 'General'],
        required: true,
      },
      {
        name: 'description',
        label: 'Command Description',
        type: 'textarea',
        required: true,
        maxLength: 600,
      },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Enabled / Active on Public Information Page', type: 'boolean' },
    ],
    defaultValues: {
      command: '/warp',
      category: 'Teleport',
      description: '',
      order: 1,
      published: true,
    },
  },
  join_steps: {
    title: 'How to Join Steps',
    group: 'content',
    fields: [
      { name: 'edition', label: 'Edition', type: 'select', options: ['Java', 'Bedrock'], required: true },
      { name: 'stepNumber', label: 'Step Number', type: 'number', required: true },
      { name: 'title', label: 'Step Title', type: 'text', required: true, maxLength: 120 },
      { name: 'description', label: 'Instructions', type: 'textarea', required: true, maxLength: 600 },
      { name: 'highlightText', label: 'Highlight Code/Port Text', type: 'text', maxLength: 160 },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      edition: 'Java',
      stepNumber: 1,
      title: '',
      description: '',
      highlightText: '',
      published: true,
    },
  },
  faqs: {
    title: 'FAQs',
    group: 'content',
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true, maxLength: 200 },
      { name: 'category', label: 'Category', type: 'text', required: true, maxLength: 60 },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true, maxLength: 1500 },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      question: '',
      category: 'General',
      answer: '',
      order: 1,
      published: true,
    },
  },
  features: {
    title: 'Server Features & Home Cards',
    group: 'content',
    fields: [
      { name: 'title', label: 'Feature Title', type: 'text', required: true, maxLength: 100 },
      { name: 'category', label: 'Category Label', type: 'text', required: true, maxLength: 60 },
      {
        name: 'iconName',
        label: 'Icon Name',
        type: 'select',
        options: ['Compass', 'Swords', 'Hammer', 'Gamepad2', 'Trophy', 'ShieldCheck', 'Globe', 'Lock', 'Zap', 'Crown'],
        required: true,
      },
      { name: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 600 },
      { name: 'showOnHome', label: 'Show on Home Page Preview (Top 6)', type: 'boolean' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      category: 'Gameplay',
      iconName: 'Compass',
      description: '',
      showOnHome: true,
      order: 1,
      published: true,
    },
  },
  game_modes: {
    title: 'Warps & Realms Manager',
    group: 'content',
    fields: [
      {
        name: 'name',
        label: 'Warp / Realm Title / Name (e.g. Survival Realm, Resource World, Arena)',
        type: 'text',
        required: true,
        maxLength: 100,
      },
      {
        name: 'accessCommand',
        label: 'Specific Warp Command (e.g. /warp survival, /warp nether, /warp pvp)',
        type: 'text',
        required: true,
        maxLength: 80,
      },
      {
        name: 'iconName',
        label: 'Warp Icon',
        type: 'select',
        options: ['Compass', 'Swords', 'Hammer', 'Gamepad2', 'Trophy', 'ShieldCheck', 'Globe', 'Zap', 'Crown'],
        required: true,
      },
      {
        name: 'description',
        label: 'Warp / Realm Description & Details',
        type: 'textarea',
        required: true,
        maxLength: 600,
      },
      {
        name: 'imageUrl',
        label: 'Warp Background / Thumbnail Image (Upload or Set Image URL)',
        type: 'image',
        storageCategory: 'game_modes',
        maxLength: 500000,
      },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Enabled / Active on Public Information Page', type: 'boolean' },
    ],
    defaultValues: {
      name: '',
      accessCommand: '/warp survival',
      iconName: 'Compass',
      description: '',
      imageUrl: THEME_REFERENCE_ASSET,
      order: 1,
      published: true,
    },
  },
  leaderboards: {
    title: 'Leaderboards & Player Rankings',
    group: 'community',
    fields: [
      {
        name: 'category',
        label: 'Leaderboard Category',
        type: 'select',
        options: [
          'PvP Masters',
          'Builders',
          'Challengers',
          'Mini-Game Champions',
          'Event Winners',
          'Community Beta',
          'PvP Master',
          'Master Builder',
          'Minigame Champion',
          'Event Winner',
          'Community Helper',
          'Play Time Legend',
        ],
        required: true,
      },
      { name: 'rank', label: 'Rank Position (1 - 100)', type: 'number', required: true },
      { name: 'minecraftUsername', label: 'Minecraft Username (Select Registered User or Enter)', type: 'text', required: true, maxLength: 16 },
      { name: 'statLabel', label: 'Stat Label (e.g. Arena Duels Won or Challenge Time)', type: 'text', required: true, maxLength: 60 },
      { name: 'statValue', label: 'Stat Value (e.g. 412 Wins or 4m 12s)', type: 'text', required: true, maxLength: 60 },
      {
        name: 'challengeTitle',
        label: 'Challenge Title (For Challengers, e.g. Hardcore Nether Wither Solo)',
        type: 'text',
        maxLength: 160,
      },
      {
        name: 'challengeDescription',
        label: 'Challenge Description & Criteria Completed (For Challengers)',
        type: 'textarea',
        maxLength: 800,
      },
      {
        name: 'videoUrl',
        label: 'Optional Proof / Video Link (YouTube, Twitch, or Stream URL for all categories)',
        type: 'text',
        maxLength: 300,
      },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      category: 'PvP Masters',
      rank: 1,
      minecraftUsername: '',
      statLabel: 'Arena Duels Won',
      statValue: '412 Wins · 89% WR',
      challengeTitle: '',
      challengeDescription: '',
      videoUrl: '',
      published: true,
    },
  },
  staff: {
    title: 'Team & Staff Roster',
    group: 'community',
    fields: [
      { name: 'minecraftUsername', label: 'Minecraft Username', type: 'text', required: true, maxLength: 16 },
      {
        name: 'roleTitle',
        label: 'Staff Role',
        type: 'select',
        options: ['Owner', 'Admin', 'Moderator', 'Builder', 'Helper'],
        required: true,
      },
      { name: 'bio', label: 'Staff Bio & Responsibilities', type: 'textarea', required: true, maxLength: 400 },
      { name: 'discordHandle', label: 'Discord Handle', type: 'text', maxLength: 60 },
      { name: 'avatarUrl', label: 'Staff Avatar Image', type: 'image', storageCategory: 'staff', maxLength: 500 },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      minecraftUsername: '',
      roleTitle: 'Moderator',
      bio: '',
      discordHandle: '',
      avatarUrl: '',
      order: 1,
      published: true,
    },
  },
  gallery: {
    title: 'Build Gallery',
    group: 'community',
    fields: [
      { name: 'title', label: 'Build Title', type: 'text', required: true, maxLength: 120 },
      { name: 'category', label: 'Build Category', type: 'text', required: true, maxLength: 60 },
      { name: 'builderCredit', label: 'Builder Credit(s)', type: 'text', required: true, maxLength: 80 },
      { name: 'completionDate', label: 'Completion Date', type: 'text', required: true, maxLength: 40 },
      { name: 'description', label: 'Build Description', type: 'textarea', required: true, maxLength: 800 },
      { name: 'imageUrl', label: 'Build Screenshot (Required)', type: 'image', required: true, storageCategory: 'gallery', maxLength: 500 },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      category: 'Survival Wonders',
      builderCredit: '',
      completionDate: 'October 2026',
      description: '',
      imageUrl: '',
      published: true,
    },
  },
  testimonials: {
    title: 'Player Testimonials',
    group: 'community',
    fields: [
      { name: 'minecraftUsername', label: 'Minecraft Username', type: 'text', required: true, maxLength: 16 },
      { name: 'rating', label: 'Rating (1 to 5)', type: 'number', required: true },
      { name: 'playingSince', label: 'Playing Since (e.g. June 2024)', type: 'text', required: true, maxLength: 40 },
      { name: 'quote', label: 'Testimonial Quote', type: 'textarea', required: true, maxLength: 600 },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      minecraftUsername: '',
      rating: 5,
      playingSince: '2025',
      quote: '',
      published: true,
    },
  },
  events: {
    title: 'Community Events',
    group: 'community',
    fields: [
      { name: 'title', label: 'Event Title', type: 'text', required: true, maxLength: 120 },
      { name: 'eventDate', label: 'Event Date', type: 'text', required: true, maxLength: 40 },
      { name: 'eventTime', label: 'Event Time (e.g. 18:00 UTC)', type: 'text', required: true, maxLength: 40 },
      { name: 'prize', label: 'Event Prize', type: 'text', required: true, maxLength: 160 },
      { name: 'discordLink', label: 'Discord Registration Link', type: 'text', maxLength: 300 },
      { name: 'description', label: 'Event Description', type: 'textarea', required: true, maxLength: 1000 },
      { name: 'imageUrl', label: 'Event Banner Image', type: 'image', storageCategory: 'events', maxLength: 500 },
      { name: 'isPast', label: 'Mark as Past Event (Recap)', type: 'boolean' },
      { name: 'winnerSummary', label: 'Past Event Winner Summary', type: 'textarea', maxLength: 400 },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      eventDate: 'November 2026',
      eventTime: '18:00 UTC',
      prize: '',
      discordLink: '',
      description: '',
      imageUrl: '',
      isPast: false,
      winnerSummary: '',
      published: true,
    },
  },
  news: {
    title: 'Announcements & Server News',
    group: 'community',
    fields: [
      { name: 'title', label: 'Announcement Headline', type: 'text', required: true, maxLength: 150 },
      { name: 'publishDate', label: 'Publish Date', type: 'text', required: true, maxLength: 40 },
      { name: 'authorName', label: 'Author Name', type: 'text', required: true, maxLength: 60 },
      { name: 'category', label: 'Category (e.g. Announcement, Patch Notes, Event)', type: 'text', required: true, maxLength: 60 },
      { name: 'summary', label: 'Short Summary', type: 'textarea', required: true, maxLength: 400 },
      { name: 'content', label: 'Full Announcement Content', type: 'textarea', required: true, maxLength: 5000 },
      { name: 'imageUrl', label: 'Announcement Cover Image', type: 'image', storageCategory: 'news', maxLength: 500 },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      title: '',
      publishDate: 'October 2026',
      authorName: 'PRO PLAYERS Admin',
      category: 'Announcement',
      summary: '',
      content: '',
      imageUrl: '',
      published: true,
    },
  },
  social_links: {
    title: 'Social Links',
    group: 'social_links',
    fields: [
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        options: ['Discord', 'YouTube', 'Instagram', 'Facebook', 'TikTok', 'X'],
        required: true,
      },
      { name: 'label', label: 'Card Title / Label', type: 'text', required: true, maxLength: 80 },
      { name: 'url', label: 'Full External URL (https://...)', type: 'text', required: true, maxLength: 300 },
      { name: 'description', label: 'Short Description', type: 'textarea', required: true, maxLength: 300 },
      { name: 'colorHex', label: 'Accent Color Hex (e.g. #5865F2)', type: 'text', required: true, maxLength: 20 },
      { name: 'isPrimary', label: 'Primary Featured Card (Discord)', type: 'boolean' },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'published', label: 'Published Publicly', type: 'boolean' },
    ],
    defaultValues: {
      platform: 'Discord',
      label: '',
      url: 'https://',
      description: '',
      colorHex: '#5865F2',
      isPrimary: false,
      order: 1,
      published: true,
    },
  },
};

export const AdminPage: React.FC = () => {
  const {
    user,
    userProfile,
    authLoading,
    isAdmin,
    isOwnerEmail,
    siteSettings,
    commands,
    rules,
    gameModes,
    events,
    news,
    leaderboards,
    isUsingSeedFallback,
    refreshCms,
    refreshUserProfile,
  } = useApp();

  const [activeSection, setActiveSection] = useState<AdminSidebarSection>('dashboard');
  const [activeCollection, setActiveCollection] = useState<CmsCollectionKey>('game_modes');

  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);
  const [collectionDocs, setCollectionDocs] = useState<Record<string, unknown>[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>(
    COLLECTION_SCHEMAS.game_modes.defaultValues
  );
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    collectionName: string;
    id: string;
    label: string;
    email?: string;
  } | null>(null);

  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  // Direct live Firestore collection loader (materializes starter items into Firestore once if never customized)
  const loadAdminCollection = useCallback(async (colKey: CmsCollectionKey) => {
    setLoadingList(true);
    const sortDocs = (items: (Record<string, unknown> & { id: string })[]) => {
      if (
        colKey === 'commands' ||
        colKey === 'rules' ||
        colKey === 'stories' ||
        colKey === 'faqs' ||
        colKey === 'features' ||
        colKey === 'game_modes' ||
        colKey === 'staff' ||
        colKey === 'social_links'
      ) {
        return [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      }
      if (colKey === 'join_steps') {
        return [...items].sort((a, b) => (Number(a.stepNumber) || 0) - (Number(b.stepNumber) || 0));
      }
      if (colKey === 'leaderboards') {
        return [...items].sort((a, b) => (Number(a.rank) || 1) - (Number(b.rank) || 1));
      }
      return items;
    };

    const normalizeAdminDoc = (id: string, raw: Record<string, unknown>) => {
      if (colKey === 'game_modes') {
        return {
          id,
          ...raw,
          name: String(raw.name ?? raw.title ?? ''),
          accessCommand: String(raw.accessCommand ?? raw.command ?? ''),
          description: String(raw.description ?? ''),
          imageUrl: String(raw.imageUrl ?? ''),
          iconName: String(raw.iconName ?? 'Compass') || 'Compass',
        };
      }
      if (colKey === 'rules') {
        return {
          id,
          ...raw,
          category: normalizeRuleCategory(String(raw.category ?? 'General Rules')),
        };
      }
      return { id, ...raw };
    };

    try {
      const snap = await getDocs(collection(db, colKey));
      if (snap.empty) {
        setCollectionDocs([]);
        return;
      }

      markCollectionCustomized(colKey);
      const docs = sortDocs(
        snap.docs.map((d) => normalizeAdminDoc(d.id, d.data() as Record<string, unknown>))
      );
      setCollectionDocs(docs);
    } catch (err) {
      setCollectionDocs([]);
      setStatusBanner({
        type: 'error',
        message:
          err instanceof Error
            ? `Firestore read error on "${colKey}": ${err.message}`
            : `Failed to read "${colKey}" from Firestore.`,
      });
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingList(true);
    try {
      const registered = await safeGetAllRegisteredUsers(isAdmin);
      if (userProfile && !registered.some((u) => u.uid === userProfile.uid)) {
        setUsersList([userProfile, ...registered]);
      } else {
        setUsersList(registered);
      }
    } catch {
      setUsersList(userProfile ? [userProfile] : []);
    } finally {
      setLoadingList(false);
    }
  }, [isAdmin, userProfile]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAllUsers();
  }, [isAdmin, loadAllUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection === 'warps_manager') {
      setActiveCollection('game_modes');
      loadAdminCollection('game_modes');
    } else if (activeSection === 'commands_manager') {
      setActiveCollection('commands');
      loadAdminCollection('commands');
    } else if (activeSection === 'rules_manager') {
      setActiveCollection('rules');
      loadAdminCollection('rules');
    } else if (activeSection === 'events_manager') {
      setActiveCollection('events');
      loadAdminCollection('events');
    } else if (activeSection === 'announcements_manager') {
      setActiveCollection('news');
      loadAdminCollection('news');
    } else if (activeSection === 'leaderboards_manager') {
      setActiveCollection('leaderboards');
      loadAdminCollection('leaderboards');
    } else if (
      activeSection === 'content' ||
      activeSection === 'community' ||
      activeSection === 'social_links'
    ) {
      loadAdminCollection(activeCollection);
    } else if (activeSection === 'users') {
      loadAllUsers();
    }
  }, [activeSection, activeCollection, isAdmin, loadAdminCollection, loadAllUsers]);

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400">
        Verifying PRO PLAYERS Master Administrator credentials...
      </div>
    );
  }

  // Strictly block non-admin visitors & standard users from /admin
  if (!user || !isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div
          role="alert"
          className="rounded-2xl bg-slate-900/95 border border-rose-800/70 p-8 text-center space-y-5 shadow-2xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-rose-400">
              Unauthorized · 403 Forbidden
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Master Admin Access Required
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Regular users do not have permission to access the Admin Dashboard, modify community
              events, edit leaderboard rankings, or manage user roles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-left text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role-Based Access Control (RBAC) Enforcement:</span>
            </div>
            <p>
              Administrative privileges are automatically granted only to verified Master Admin
              accounts (<code className="text-emerald-300 font-mono">{SUPER_ADMIN_EMAILS.join(', ')}</code>).
              {user?.email && (
                <>
                  {' '}
                  You are currently signed in as{' '}
                  <code className="text-rose-300 font-mono">{user.email}</code> (Role:{' '}
                  <code className="text-slate-300 font-mono">{userProfile?.role || 'user'}</code>).
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <span>Master Admin Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handler to seed all 14 collections with default PRO PLAYERS data into Cloud Firestore
  const handleSeedDatabase = async () => {
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'seed database collections');
      await seedDatabaseToFirestore();

      if (isOwnerEmail && user && userProfile?.role !== 'admin') {
        await refreshUserProfile();
      }

      await refreshCms();
      await loadAdminCollection(activeCollection);
      setStatusBanner({
        type: 'success',
        message: 'All 14 CMS collections and Site Settings have been written to Firebase Firestore!',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to initialize CMS collections.',
      });
    } finally {
      setBusy(false);
    }
  };

  // Seed ONLY missing default items for the active collection into Firebase Firestore (never overwrites existing live documents)
  const handleSeedSingleCollection = async (colKey: CmsCollectionKey) => {
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, `seed ${colKey} collection`);
      const existingSnap = await getDocs(collection(db, colKey));
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));
      const now = new Date().toISOString();
      const seedItems = (SEED_FALLBACK_MAP[colKey] || []).filter(
        (item) => !existingIds.has(item.id)
      );

      if (seedItems.length === 0) {
        setStatusBanner({
          type: 'success',
          message: `All ${COLLECTION_SCHEMAS[colKey].title} records already exist in Firestore — existing live data was preserved without overwriting.`,
        });
        return;
      }

      await Promise.all(
        seedItems.map(async (item) => {
          const { id, ...rest } = item as Record<string, unknown> & { id: string };
          await setDoc(doc(db, colKey, id), {
            ...rest,
            updatedAt: now,
          });
        })
      );
      markCollectionCustomized(colKey);
      await loadAdminCollection(colKey);
      await refreshCms();
      setStatusBanner({
        type: 'success',
        message: `Added ${seedItems.length} missing starter ${COLLECTION_SCHEMAS[colKey].title} items into Firebase Firestore (existing records preserved)!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : `Failed to seed ${colKey}.`,
      });
    } finally {
      setBusy(false);
    }
  };

  // Save Site Settings (including Global Announcement Banner) directly to Firestore
  const handleSaveSiteSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'update Site Settings');

      const now = new Date().toISOString();
      const cleanDiscordUrl = (settingsForm.discordUrl || '').trim().slice(0, 300);
      const firestorePayload: Omit<SiteSettings, 'id'> = {
        siteName: 'PRO PLAYERS',
        tagline: settingsForm.tagline.trim().slice(0, 160),
        description: settingsForm.description.trim().slice(0, 1000),
        officialLogoUrl: settingsForm.officialLogoUrl.trim().slice(0, 500000),
        themeReferenceUrl: settingsForm.themeReferenceUrl.trim().slice(0, 500000),
        backgroundImageUrl: settingsForm.backgroundImageUrl.trim().slice(0, 500000),
        primaryColor: settingsForm.primaryColor.trim().slice(0, 20),
        secondaryColor: settingsForm.secondaryColor.trim().slice(0, 20),
        javaHost: settingsForm.javaHost.trim().slice(0, 120),
        javaPort: Number(settingsForm.javaPort) || 25565,
        bedrockHost: settingsForm.bedrockHost.trim().slice(0, 120),
        bedrockPort: Number(settingsForm.bedrockPort) || 19132,
        minecraftVersion: settingsForm.minecraftVersion.trim().slice(0, 60),
        discordUrl: cleanDiscordUrl,
        youtubeUrl: (settingsForm.youtubeUrl || '').trim().slice(0, 300),
        instagramUrl: (settingsForm.instagramUrl || '').trim().slice(0, 300),
        facebookUrl: (settingsForm.facebookUrl || '').trim().slice(0, 300),
        announcementEnabled: settingsForm.announcementEnabled !== false,
        announcementType: (settingsForm.announcementType || 'news') as GlobalAnnouncementType,
        announcementTitle: (settingsForm.announcementTitle || '').trim().slice(0, 120),
        announcementMessage: (settingsForm.announcementMessage || '').trim().slice(0, 400),
        announcementLinkText: (settingsForm.announcementLinkText || '').trim().slice(0, 60),
        announcementLinkUrl: (settingsForm.announcementLinkUrl || '').trim().slice(0, 300),
        customizedCollections: settingsForm.customizedCollections || {},
        published: true,
        updatedAt: now,
      };

      await setDoc(doc(db, 'site_settings', 'main'), firestorePayload, { merge: true });

      // Also sync the updated Discord URL to any Discord entry in social_links so both collections stay 100% aligned
      if (cleanDiscordUrl && cleanDiscordUrl !== '#') {
        try {
          const socialSnap = await getDocs(collection(db, 'social_links'));
          const discordDocs = socialSnap.docs.filter((d) => {
            const data = d.data() as Record<string, unknown>;
            return (
              String(data.platform || '').toLowerCase() === 'discord' ||
              Boolean(data.isPrimary)
            );
          });
          await Promise.all(
            discordDocs.map((d) =>
              setDoc(
                doc(db, 'social_links', d.id),
                { url: cleanDiscordUrl, updatedAt: now },
                { merge: true }
              )
            )
          );
        } catch {
          // Ignore if social_links sync is skipped
        }
      }

      await refreshCms();
      setStatusBanner({
        type: 'success',
        message: 'Site Settings & Global Announcement Banner saved to Firebase Firestore!',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save Site Settings.',
      });
    } finally {
      setBusy(false);
    }
  };

  // Pin any Announcement article directly to the Top Global Announcement Banner
  const handlePinAnnouncementToGlobalBanner = async (item: Record<string, unknown>) => {
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'pin Global Announcement Banner');
      const now = new Date().toISOString();
      const nextSettings: Omit<SiteSettings, 'id'> = {
        ...siteSettings,
        announcementEnabled: true,
        announcementType: 'news',
        announcementTitle: String(item.title || 'Server Announcement').slice(0, 120),
        announcementMessage: String(item.summary || item.content || '').slice(0, 400),
        announcementLinkText: 'Read Full Update',
        announcementLinkUrl: '/community',
        updatedAt: now,
      };
      setSettingsForm(nextSettings);
      await setDoc(doc(db, 'site_settings', 'main'), nextSettings);
      await refreshCms();
      setStatusBanner({
        type: 'success',
        message: `Pinned "${String(item.title)}" to the Global Announcement Banner at the top of the site!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to pin announcement.',
      });
    } finally {
      setBusy(false);
    }
  };

  // Upload image to Firebase Storage for Site Settings or CMS Form
  const handleSettingsImageUpload = async (
    file: File,
    fieldKey: 'officialLogoUrl' | 'themeReferenceUrl' | 'backgroundImageUrl',
    category: string
  ) => {
    setUploadingField(fieldKey);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'upload branding images');
      const downloadUrl = await uploadCmsImage(file, category);
      setSettingsForm((prev) => ({ ...prev, [fieldKey]: downloadUrl }));
      setStatusBanner({
        type: 'success',
        message: 'Image uploaded. Click "Save Site Settings" to publish.',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Image upload failed.',
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleCmsFieldImageUpload = async (file: File, fieldName: string, category: string) => {
    setUploadingField(fieldName);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'upload CMS media');
      const downloadUrl = await uploadCmsImage(file, category);
      setFormState((prev) => ({ ...prev, [fieldName]: downloadUrl }));
      setStatusBanner({
        type: 'success',
        message: 'Image ready! Click "Save Record" below to persist to Firestore.',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Image upload failed.',
      });
    } finally {
      setUploadingField(null);
    }
  };

  // Save (Create / Update) CMS Document directly in Firebase Firestore
  const handleSaveCmsDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatusBanner(null);

    const schema = COLLECTION_SCHEMAS[activeCollection];
    const now = new Date().toISOString();
    const docId = editingDocId || `${activeCollection}_${Date.now()}`;

    try {
      assertAdminAccess(isAdmin, `modify ${schema.title}`);

      const cleanPayload: Record<string, unknown> = {};
      for (const field of schema.fields) {
        const rawVal = formState[field.name];
        if (field.type === 'number') {
          cleanPayload[field.name] = Number(rawVal) || 1;
        } else if (field.type === 'boolean') {
          cleanPayload[field.name] = rawVal === undefined ? true : Boolean(rawVal);
        } else if (field.type === 'image') {
          const strVal = String(rawVal ?? '').trim();
          cleanPayload[field.name] = strVal.slice(0, 600000);
        } else {
          const strVal = String(rawVal ?? '').trim();
          cleanPayload[field.name] = field.maxLength ? strVal.slice(0, field.maxLength) : strVal;
        }
      }

      if (activeCollection === 'game_modes' && !cleanPayload.iconName) {
        cleanPayload.iconName = 'Compass';
      }

      const existingDoc = collectionDocs.find((d) => d.id === editingDocId);
      cleanPayload.createdAt =
        existingDoc && typeof existingDoc.createdAt === 'string' && existingDoc.createdAt
          ? existingDoc.createdAt
          : now;
      cleanPayload.updatedAt = now;

      markCollectionCustomized(activeCollection);
      await setDoc(doc(db, activeCollection, docId), cleanPayload);

      // When a Discord (or YouTube/Instagram/Facebook) link is updated in the Links section (social_links),
      // automatically propagate that URL to site_settings/main in Firestore so all connected links stay in sync!
      if (activeCollection === 'social_links' && cleanPayload.published !== false) {
        const platformLower = String(cleanPayload.platform || '').trim().toLowerCase();
        const updatedUrl = String(cleanPayload.url || '').trim().slice(0, 300);
        if (updatedUrl && updatedUrl !== '#') {
          const settingsPatch: Partial<SiteSettings> = {};
          if (platformLower === 'discord' || Boolean(cleanPayload.isPrimary)) {
            settingsPatch.discordUrl = updatedUrl;
          } else if (platformLower === 'youtube') {
            settingsPatch.youtubeUrl = updatedUrl;
          } else if (platformLower === 'instagram') {
            settingsPatch.instagramUrl = updatedUrl;
          } else if (platformLower === 'facebook') {
            settingsPatch.facebookUrl = updatedUrl;
          }

          if (Object.keys(settingsPatch).length > 0) {
            await setDoc(
              doc(db, 'site_settings', 'main'),
              {
                ...settingsPatch,
                updatedAt: now,
              },
              { merge: true }
            );
            setSettingsForm((prev) => ({ ...prev, ...settingsPatch, updatedAt: now }));
          }

          // If this was a Discord link update, also sync any other Discord documents in social_links so no stale duplicate URL remains
          if (platformLower === 'discord' || Boolean(cleanPayload.isPrimary)) {
            const otherDiscordDocs = collectionDocs.filter(
              (d) =>
                String(d.id) !== docId &&
                (String(d.platform || '').toLowerCase() === 'discord' || Boolean(d.isPrimary))
            );
            await Promise.all(
              otherDiscordDocs.map((d) =>
                setDoc(
                  doc(db, 'social_links', String(d.id)),
                  { url: updatedUrl, updatedAt: now },
                  { merge: true }
                )
              )
            );
          }
        }
      }

      await loadAdminCollection(activeCollection);
      await refreshCms();

      setIsFormOpen(false);
      setEditingDocId(null);
      setStatusBanner({
        type: 'success',
        message: `${schema.title} record "${String(
          cleanPayload.name ||
            cleanPayload.command ||
            cleanPayload.title ||
            cleanPayload.minecraftUsername ||
            docId
        )}" saved directly to Firebase Firestore!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save record to Firestore.',
      });
    } finally {
      setBusy(false);
    }
  };

  // 1-Click Enable / Disable (Published / Inactive) Toggle directly in Firebase Firestore
  const handleToggleRecordPublished = async (item: Record<string, unknown>) => {
    setBusy(true);
    setStatusBanner(null);
    const schema = COLLECTION_SCHEMAS[activeCollection];
    const docId = String(item.id);
    const nextPublished = item.published === false;
    const now = new Date().toISOString();

    try {
      assertAdminAccess(isAdmin, `enable/disable ${schema.title}`);

      const cleanPayload: Record<string, unknown> = {};
      for (const field of schema.fields) {
        const rawVal = item[field.name];
        if (field.name === 'published') {
          cleanPayload.published = nextPublished;
        } else if (field.type === 'number') {
          cleanPayload[field.name] = Number(rawVal) || 1;
        } else if (field.type === 'boolean') {
          cleanPayload[field.name] = Boolean(rawVal);
        } else if (field.type === 'image') {
          cleanPayload[field.name] = String(rawVal ?? '').trim().slice(0, 600000);
        } else {
          const strVal = String(rawVal ?? '').trim();
          cleanPayload[field.name] = field.maxLength ? strVal.slice(0, field.maxLength) : strVal;
        }
      }

      if (activeCollection === 'game_modes' && !cleanPayload.iconName) {
        cleanPayload.iconName = 'Compass';
      }

      cleanPayload.createdAt =
        typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : now;
      cleanPayload.updatedAt = now;

      markCollectionCustomized(activeCollection);
      await setDoc(doc(db, activeCollection, docId), cleanPayload);
      await loadAdminCollection(activeCollection);
      await refreshCms();

      const label = String(
        item.name || item.command || item.title || item.minecraftUsername || docId
      );
      setStatusBanner({
        type: 'success',
        message: `"${label}" is now ${nextPublished ? 'Enabled (Active)' : 'Disabled (Hidden)'} in Firebase Firestore.`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to toggle status in Firestore.',
      });
    } finally {
      setBusy(false);
    }
  };

  // Confirm Permanent Delete Execution directly in Firebase Firestore
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, `delete from ${deleteTarget.collectionName}`);

      if (deleteTarget.collectionName === 'users') {
        await safeAdminDeleteUser(isAdmin, deleteTarget.id, deleteTarget.email);
        await loadAllUsers();
      } else {
        const colKey = deleteTarget.collectionName as CmsCollectionKey;
        markCollectionCustomized(colKey);
        await deleteDoc(doc(db, colKey, deleteTarget.id));
        setCollectionDocs((prev) => prev.filter((d) => String(d.id) !== deleteTarget.id));
        await loadAdminCollection(colKey);
        await refreshCms();
      }
      setStatusBanner({
        type: 'success',
        message: `Permanently deleted "${deleteTarget.label}" from Firebase Firestore (${deleteTarget.collectionName}).`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Delete operation failed in Firestore.',
      });
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  };

  // Toggle User Role (Admin-Only Action)
  const handleToggleUserRole = async (targetUser: UserProfile) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setBusy(true);
    setStatusBanner(null);
    try {
      assertAdminAccess(isAdmin, 'change user roles');
      await safeAdminUpdateUserRole(isAdmin, targetUser, nextRole);
      await loadAllUsers();
      setStatusBanner({
        type: 'success',
        message: `Updated ${targetUser.minecraftUsername}'s role to "${nextRole}".`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update user role.',
      });
    } finally {
      setBusy(false);
    }
  };

  // Quick helper to rank a registered database user directly on the Leaderboard
  const handleRankUserOnLeaderboard = (targetUser: UserProfile) => {
    setActiveSection('leaderboards_manager');
    setActiveCollection('leaderboards');
    setEditingDocId(null);
    setFormState({
      ...COLLECTION_SCHEMAS.leaderboards.defaultValues,
      minecraftUsername: targetUser.minecraftUsername,
    });
    setIsFormOpen(true);
  };

  const openCreateModal = (colKey: CmsCollectionKey) => {
    setEditingDocId(null);
    setFormState({
      ...COLLECTION_SCHEMAS[colKey].defaultValues,
      ...(colKey === 'events' ? { discordLink: siteSettings.discordUrl } : {}),
      order: collectionDocs.length + 1,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (docItem: Record<string, unknown>) => {
    setEditingDocId(String(docItem.id));
    setFormState({ ...docItem });
    setIsFormOpen(true);
  };

  const contentCollections: CmsCollectionKey[] = [
    'game_modes',
    'commands',
    'rules',
    'stories',
    'join_steps',
    'faqs',
    'features',
  ];
  const communityCollections: CmsCollectionKey[] = [
    'staff',
    'gallery',
    'testimonials',
  ];

  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    return (
      u.minecraftUsername?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const isCmsEditorSection =
    activeSection === 'warps_manager' ||
    activeSection === 'commands_manager' ||
    activeSection === 'rules_manager' ||
    activeSection === 'events_manager' ||
    activeSection === 'announcements_manager' ||
    activeSection === 'leaderboards_manager' ||
    activeSection === 'content' ||
    activeSection === 'community' ||
    activeSection === 'social_links';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <ResilientImage
                src={siteSettings.officialLogoUrl}
                alt="PRO PLAYERS Official Logo"
                className="w-12 h-12 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-white text-sm truncate">
                  PRO PLAYERS CMS
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <Shield className="w-3 h-3" />
                  <span>{isOwnerEmail ? 'Master Admin' : 'Admin Console'}</span>
                </div>
              </div>
            </div>

            <nav aria-label="Admin Sidebar" className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('dashboard');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'dashboard'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>

              <div className="pt-2 pb-1 px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Core Master Admin Tools
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('warps_manager');
                  setActiveCollection('game_modes');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'warps_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Compass className="w-4 h-4" />
                  <span>Warps &amp; Realms</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {gameModes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('commands_manager');
                  setActiveCollection('commands');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'commands_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Terminal className="w-4 h-4" />
                  <span>Minecraft Commands</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {commands.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('rules_manager');
                  setActiveCollection('rules');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'rules_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Shield className="w-4 h-4" />
                  <span>Rules &amp; Guidelines</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {rules.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('announcements_manager');
                  setActiveCollection('news');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'announcements_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span>Announcements &amp; Banner</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {news.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('leaderboards_manager');
                  setActiveCollection('leaderboards');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'leaderboards_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Trophy className="w-4 h-4" />
                  <span>Leaderboards &amp; Stats</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {leaderboards.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('events_manager');
                  setActiveCollection('events');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'events_manager'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span>Community Events</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {events.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('users');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'users'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Registered Users</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/30">
                  {usersList.length}
                </span>
              </button>

              <div className="pt-2 pb-1 px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Website Configuration
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('site_settings');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'site_settings'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Site Settings &amp; IP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('content');
                  setActiveCollection('stories');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'content'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Story, Join Steps &amp; FAQ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('community');
                  setActiveCollection('staff');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'community'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Staff, Gallery &amp; Reviews</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('social_links');
                  setActiveCollection('social_links');
                  setIsFormOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeSection === 'social_links'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Social Links</span>
              </button>
            </nav>

            {/* Authenticated Master Admin Identity Card */}
            <div className="pt-4 border-t border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-slate-400 font-semibold">Authenticated Admin:</div>
              <div className="font-mono text-emerald-300 truncate">{user.email}</div>
              <div className="text-slate-500">
                Super Admin List: <code className="text-slate-300">{SUPER_ADMIN_EMAILS[0]}</code>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <div className="lg:col-span-9 space-y-6">
          {/* Status Feedback Banner */}
          {statusBanner && (
            <div
              role={statusBanner.type === 'error' ? 'alert' : 'status'}
              className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-700/70 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {statusBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{statusBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-300 mb-2">
                      <Crown className="w-3.5 h-3.5" />
                      <span>MASTER ADMIN RBAC VERIFIED ({user.email})</span>
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                      PRO PLAYERS Master Admin Console
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage Warps &amp; Realms, Essential Commands, Server Rules &amp; Guidelines,
                      Global Announcements, and Leaderboard rankings directly in Firebase Firestore.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSeedDatabase}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Database className="w-4 h-4" />
                    <span>
                      {busy
                        ? 'Syncing Database...'
                        : isUsingSeedFallback
                          ? 'Initialize & Seed Default Content'
                          : 'Sync & Reset Starter CMS Data'}
                    </span>
                  </button>
                </div>

                {/* Live Admin Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Active Warps</div>
                    <div className="font-mono text-xl font-extrabold text-emerald-400 mt-1">
                      {gameModes.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Commands</div>
                    <div className="font-mono text-xl font-extrabold text-emerald-400 mt-1">
                      {commands.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Server Rules</div>
                    <div className="font-mono text-xl font-extrabold text-cyan-400 mt-1">
                      {rules.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Announcements</div>
                    <div className="font-mono text-xl font-extrabold text-cyan-400 mt-1">
                      {news.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Leaderboard</div>
                    <div className="font-mono text-xl font-extrabold text-amber-400 mt-1">
                      {leaderboards.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Users</div>
                    <div className="font-mono text-xl font-extrabold text-purple-400 mt-1">
                      {usersList.length}
                    </div>
                  </div>
                </div>

                {/* Primary Admin Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('warps_manager');
                      setActiveCollection('game_modes');
                    }}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Compass className="w-5 h-5 text-emerald-400" />
                      <span className="text-[11px] font-mono text-emerald-400">
                        Title · Image · /warp Command
                      </span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Warps &amp; Realms Management System
                    </div>
                    <p className="text-xs text-slate-400">
                      Set &amp; edit Warp/Realm titles, descriptions, background images, and warp
                      commands (<code className="font-mono text-emerald-300">/warp survival</code>,{' '}
                      <code className="font-mono text-emerald-300">/warp arena</code>).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('commands_manager');
                      setActiveCollection('commands');
                    }}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Terminal className="w-5 h-5 text-emerald-400" />
                      <span className="text-[11px] font-mono text-emerald-400">
                        Add / Edit / Enable / Delete
                      </span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Essential Minecraft Commands Manager
                    </div>
                    <p className="text-xs text-slate-400">
                      Manage essential server commands (<code className="font-mono text-emerald-300">/spawn</code>,{' '}
                      <code className="font-mono text-emerald-300">/warp</code>,{' '}
                      <code className="font-mono text-emerald-300">/tpa [player]</code>,{' '}
                      <code className="font-mono text-emerald-300">/home</code>,{' '}
                      <code className="font-mono text-emerald-300">/sethome</code>,{' '}
                      <code className="font-mono text-emerald-300">/msg [player]</code>).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('rules_manager');
                      setActiveCollection('rules');
                    }}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <span className="text-[11px] font-mono text-cyan-400">
                        4 Structured Rule Categories
                      </span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Server Rules &amp; Guidelines Manager
                    </div>
                    <p className="text-xs text-slate-400">
                      Add, edit, or delete rules across General Rules, Building/Griefing Rules,
                      Chat &amp; Behavior Etiquette, and PvP/Fair Play.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('announcements_manager');
                      setActiveCollection('news');
                    }}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Megaphone className="w-5 h-5 text-cyan-400" />
                      <span className="text-[11px] font-mono text-cyan-400">
                        Global Top Banner &amp; News
                      </span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Global Announcement Banner &amp; News
                    </div>
                    <p className="text-xs text-slate-400">
                      Broadcast important server news, maintenance updates, or event alerts in the
                      Global Announcement Bar near the top of the site.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('leaderboards_manager');
                      setActiveCollection('leaderboards');
                    }}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] font-mono text-amber-400">
                        Pull from DB Users
                      </span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Modify Leaderboard Rankings &amp; Stats
                    </div>
                    <p className="text-xs text-slate-400">
                      Manage Challengers, PvP, and Builder rankings with custom challenge descriptions,
                      stat records, and optional video proof links.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('users')}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/45 text-left space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span className="text-[11px] font-mono text-purple-400">RBAC Directory</span>
                    </div>
                    <div className="font-display font-bold text-white text-base">
                      Registered User Management
                    </div>
                    <p className="text-xs text-slate-400">
                      View all registered player accounts, assign Leaderboard rankings, or manage
                      admin roles.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SITE SETTINGS */}
          {activeSection === 'site_settings' && (
            <form
              onSubmit={handleSaveSiteSettings}
              className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 sm:p-8 space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Site Settings, Global Banner &amp; Server Endpoints
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Update the Global Announcement Banner, Official Website Logo, background image,
                    accent colors, and Java/Bedrock connection details.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>{busy ? 'Saving...' : 'Save Site Settings'}</span>
                </button>
              </div>

              {/* Global Announcement Banner Configuration */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/35 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Megaphone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        Global Announcement Bar / Top Site Banner
                      </h3>
                      <p className="text-xs text-slate-400">
                        Broadcast server news, maintenance updates, or event alerts at the top of
                        every page.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.announcementEnabled !== false}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded accent-emerald-400"
                    />
                    <span>Show Global Announcement Banner</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Broadcast Type / Badge
                    </label>
                    <select
                      value={settingsForm.announcementType || 'news'}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementType: e.target.value as GlobalAnnouncementType,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="news">Server News (Emerald)</option>
                      <option value="maintenance">Maintenance Update (Amber)</option>
                      <option value="event">Event Alert (Cyan)</option>
                      <option value="alert">Important Alert (Rose)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Banner Headline
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={settingsForm.announcementTitle || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementTitle: e.target.value,
                        })
                      }
                      placeholder="e.g. Season IV Crossplay Update Live!"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Broadcast Message
                    </label>
                    <input
                      type="text"
                      maxLength={400}
                      value={settingsForm.announcementMessage || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementMessage: e.target.value,
                        })
                      }
                      placeholder="Enter important server news, maintenance schedule, or event alert..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Action Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={settingsForm.announcementLinkText || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementLinkText: e.target.value,
                        })
                      }
                      placeholder="e.g. View Community Hub"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Action Button Link (Internal path like /community or full https:// URL)
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={settingsForm.announcementLinkUrl || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          announcementLinkUrl: e.target.value,
                        })
                      }
                      placeholder="/community"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Branding Images */}
              <div className="space-y-4">
                <h3 className="font-display text-base font-bold text-emerald-300">
                  1. Official Website Logo &amp; Theme Reference Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Official Website Logo */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Official Website Logo</span>
                      <span className="text-[11px] font-mono text-emerald-400">Navbar / Hero</span>
                    </div>
                    <div className="flex items-center justify-center py-2">
                      <ResilientImage
                        src={settingsForm.officialLogoUrl}
                        alt="Official Logo Preview"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={settingsForm.officialLogoUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, officialLogoUrl: e.target.value })
                      }
                      placeholder="Logo URL or path..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingField === 'officialLogoUrl'
                          ? 'Uploading...'
                          : 'Upload New Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSettingsImageUpload(file, 'officialLogoUrl', 'branding');
                        }}
                      />
                    </label>
                  </div>

                  {/* Theme Reference Image */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Theme Reference Image</span>
                      <span className="text-[11px] font-mono text-cyan-400">Visual Mood</span>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <ResilientImage
                        src={settingsForm.themeReferenceUrl}
                        alt="Theme Reference Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      value={settingsForm.themeReferenceUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, themeReferenceUrl: e.target.value })
                      }
                      placeholder="Theme Reference URL..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingField === 'themeReferenceUrl'
                          ? 'Uploading...'
                          : 'Upload Theme Reference'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleSettingsImageUpload(file, 'themeReferenceUrl', 'branding');
                        }}
                      />
                    </label>
                  </div>

                  {/* Full-Page Background Image */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Site Background Image</span>
                      <span className="text-[11px] font-mono text-slate-400">Dark Scrim</span>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <ResilientImage
                        src={settingsForm.backgroundImageUrl}
                        alt="Background Image Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      value={settingsForm.backgroundImageUrl}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, backgroundImageUrl: e.target.value })
                      }
                      placeholder="Background Image URL..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingField === 'backgroundImageUrl'
                          ? 'Uploading...'
                          : 'Upload Background'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleSettingsImageUpload(file, 'backgroundImageUrl', 'branding');
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Theme Colors & Server Description */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="font-display text-base font-bold text-emerald-300">
                  2. Theme Colors &amp; PRO PLAYERS Copy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Primary Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.primaryColor}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, primaryColor: e.target.value })
                        }
                        className="w-10 h-10 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.primaryColor}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, primaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Secondary Glow Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.secondaryColor}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, secondaryColor: e.target.value })
                        }
                        className="w-10 h-10 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.secondaryColor}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, secondaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Supported Minecraft Version
                    </label>
                    <input
                      type="text"
                      value={settingsForm.minecraftVersion}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, minecraftVersion: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Server Tagline
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={settingsForm.tagline}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, tagline: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Server Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={1000}
                    value={settingsForm.description}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>
              </div>

              {/* Java & Bedrock Connection Endpoints */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="font-display text-base font-bold text-emerald-300">
                  3. Java &amp; Bedrock Live Status Endpoints (mcstatus.io)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Java Host
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.javaHost}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, javaHost: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Java Port (Default 25565)
                    </label>
                    <input
                      type="number"
                      required
                      value={settingsForm.javaPort}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          javaPort: Number(e.target.value) || 25565,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bedrock Host
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.bedrockHost}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, bedrockHost: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Bedrock Port (Default 19132)
                    </label>
                    <input
                      type="number"
                      required
                      value={settingsForm.bedrockPort}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          bedrockPort: Number(e.target.value) || 19132,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* CMS CRUD SECTIONS (Warps, Commands, Rules, Events, Announcements, Leaderboards, Content, Community, Social Links) */}
          {isCmsEditorSection && (
            <div className="space-y-6">
              {/* Quick Global Announcement Banner Editor at Top of Announcements Manager */}
              {activeSection === 'announcements_manager' && (
                <form
                  onSubmit={handleSaveSiteSettings}
                  className="rounded-2xl bg-slate-900/90 border border-emerald-500/40 p-6 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-bold text-white">
                          Global Announcement Banner (Top of Site)
                        </h2>
                        <p className="text-xs text-slate-400">
                          Broadcast urgent server news, maintenance windows, or event alerts at the
                          very top of the website.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.announcementEnabled !== false}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              announcementEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded accent-emerald-400"
                        />
                        <span>Banner Active</span>
                      </label>
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{busy ? 'Saving...' : 'Update Top Banner'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Broadcast Type
                      </label>
                      <select
                        value={settingsForm.announcementType || 'news'}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            announcementType: e.target.value as GlobalAnnouncementType,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="news">Server News</option>
                        <option value="maintenance">Maintenance Update</option>
                        <option value="event">Event Alert</option>
                        <option value="alert">Important Alert</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Banner Title
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={settingsForm.announcementTitle || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            announcementTitle: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Banner Broadcast Message
                      </label>
                      <input
                        type="text"
                        maxLength={400}
                        value={settingsForm.announcementMessage || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            announcementMessage: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* Sub-navigation Tabs for Multi-Collection Groups */}
              {(activeSection === 'content' || activeSection === 'community') && (
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                  {(activeSection === 'content'
                    ? contentCollections
                    : communityCollections
                  ).map((colKey) => (
                    <button
                      key={colKey}
                      type="button"
                      onClick={() => {
                        setActiveCollection(colKey);
                        setIsFormOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeCollection === colKey
                          ? 'bg-emerald-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {COLLECTION_SCHEMAS[colKey].title}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">
                      {COLLECTION_SCHEMAS[activeCollection].title}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Firestore collection:{' '}
                      <code className="font-mono text-emerald-300">{activeCollection}</code>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadAdminCollection(activeCollection)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      aria-label="Reload collection"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateModal(activeCollection)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {activeCollection === 'game_modes'
                          ? 'Add New Warp / Realm'
                          : activeCollection === 'commands'
                            ? 'Add Server Command'
                            : activeCollection === 'rules'
                              ? 'Add Server Rule'
                              : activeCollection === 'events'
                                ? 'Create Event'
                                : activeCollection === 'news'
                                  ? 'Post Announcement'
                                  : activeCollection === 'leaderboards'
                                    ? 'Add Leaderboard Rank'
                                    : 'Add New Record'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Create / Edit Form Panel */}
                {isFormOpen && (
                  <form
                    onSubmit={handleSaveCmsDoc}
                    className="p-5 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-display text-base font-bold text-emerald-300">
                        {editingDocId
                          ? `Edit ${COLLECTION_SCHEMAS[activeCollection].title} (${editingDocId})`
                          : `New ${COLLECTION_SCHEMAS[activeCollection].title} Entry`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Registered Database User Picker for Leaderboards */}
                    {activeCollection === 'leaderboards' && (
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="db-user-picker"
                            className="text-xs font-bold text-emerald-300 flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Pull Player from Registered Database Users:</span>
                          </label>
                          <span className="text-[11px] font-mono text-slate-400">
                            {usersList.length} registered user(s)
                          </span>
                        </div>
                        <select
                          id="db-user-picker"
                          value=""
                          onChange={(e) => {
                            const selectedMc = e.target.value;
                            if (selectedMc) {
                              setFormState((prev) => ({
                                ...prev,
                                minecraftUsername: selectedMc,
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                        >
                          <option value="">
                            -- Select a registered user to auto-fill Minecraft Username --
                          </option>
                          {usersList.map((regUser) => (
                            <option key={regUser.uid} value={regUser.minecraftUsername}>
                              {regUser.minecraftUsername} ({regUser.firstName} · {regUser.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {COLLECTION_SCHEMAS[activeCollection].fields.map((field) => {
                        const val = formState[field.name];
                        if (field.type === 'textarea') {
                          return (
                            <div key={field.name} className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                {field.label} {field.required ? '*' : ''}
                              </label>
                              <textarea
                                rows={3}
                                required={field.required}
                                maxLength={field.maxLength}
                                value={String(val ?? '')}
                                onChange={(e) =>
                                  setFormState({ ...formState, [field.name]: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                              />
                            </div>
                          );
                        }

                        if (field.type === 'boolean') {
                          return (
                            <div key={field.name} className="flex items-center gap-2 pt-2">
                              <input
                                id={`field-${field.name}`}
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) =>
                                  setFormState({ ...formState, [field.name]: e.target.checked })
                                }
                                className="w-4 h-4 rounded accent-emerald-400"
                              />
                              <label
                                htmlFor={`field-${field.name}`}
                                className="text-xs font-semibold text-slate-200"
                              >
                                {field.label}
                              </label>
                            </div>
                          );
                        }

                        if (field.type === 'select') {
                          return (
                            <div key={field.name}>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                {field.label} {field.required ? '*' : ''}
                              </label>
                              <select
                                value={String(val ?? field.options?.[0] ?? '')}
                                onChange={(e) =>
                                  setFormState({ ...formState, [field.name]: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                              >
                                {field.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (field.type === 'image') {
                          return (
                            <div key={field.name} className="sm:col-span-2 space-y-2.5">
                              <label className="block text-xs font-semibold text-slate-300">
                                {field.label} {field.required ? '*' : ''}
                              </label>

                              {Boolean(val) && (
                                <div className="w-44 aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                                  <ResilientImage
                                    src={String(val)}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  required={field.required}
                                  value={String(val ?? '')}
                                  onChange={(e) =>
                                    setFormState({ ...formState, [field.name]: e.target.value })
                                  }
                                  placeholder="Enter Image URL or upload an image file..."
                                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                                />
                                <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>
                                    {uploadingField === field.name
                                      ? 'Uploading...'
                                      : 'Upload Image File'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleCmsFieldImageUpload(
                                          file,
                                          field.name,
                                          field.storageCategory || activeCollection
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              {activeCollection === 'game_modes' && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <span className="text-[11px] text-slate-400">
                                    Quick Realm Presets:
                                  </span>
                                  {WARP_IMAGE_PRESETS.map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() =>
                                        setFormState((prev) => ({
                                          ...prev,
                                          [field.name]: preset.url,
                                        }))
                                      }
                                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-emerald-300 cursor-pointer"
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.name}>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              {field.label} {field.required ? '*' : ''}
                            </label>
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              required={field.required}
                              maxLength={field.maxLength}
                              value={String(val ?? '')}
                              onChange={(e) =>
                                setFormState({
                                  ...formState,
                                  [field.name]:
                                    field.type === 'number'
                                      ? Number(e.target.value)
                                      : e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{busy ? 'Saving...' : 'Save Record'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Records List */}
                {loadingList ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading records from Firebase Firestore...
                  </div>
                ) : collectionDocs.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-4">
                    <p className="text-sm text-slate-300">
                      No documents currently stored in{' '}
                      <code className="font-mono text-emerald-300">{activeCollection}</code>.
                    </p>
                    <p className="text-xs text-slate-400">
                      {activeCollection === 'leaderboards'
                        ? 'When no leaderboard scores are saved, the public website displays the stylish "No leaderboard stats available yet — Leaderboard updating soon" placeholder state.'
                        : 'Click the create button above to add a custom record, or load the starter items into Firestore.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => openCreateModal(activeCollection)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Entry</span>
                      </button>
                      {(SEED_FALLBACK_MAP[activeCollection]?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSeedSingleCollection(activeCollection)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Seed Starter Items into Firestore</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                    {collectionDocs.map((item) => {
                      const primaryLabel = String(
                        item.command ||
                          item.title ||
                          item.name ||
                          item.question ||
                          item.minecraftUsername ||
                          item.label ||
                          item.id
                      );
                      const secondaryLabel =
                        activeCollection === 'game_modes'
                          ? `${item.accessCommand ?? ''} — ${item.description ?? ''}`
                          : activeCollection === 'commands'
                            ? `${item.category ?? 'General'} — ${item.description ?? ''}`
                            : activeCollection === 'rules'
                              ? `${item.category ?? 'General Rules'} — ${item.description ?? ''}`
                              : activeCollection === 'leaderboards'
                                ? `Rank #${item.rank ?? 1} · ${item.category ?? ''} · ${item.statLabel ?? ''}: ${item.statValue ?? ''}`
                                : activeCollection === 'events'
                                  ? `${item.eventDate ?? ''} at ${item.eventTime ?? ''} · Prize: ${item.prize ?? ''}`
                                  : String(
                                      item.category ||
                                        item.edition ||
                                        item.roleTitle ||
                                        item.platform ||
                                        item.dateLabel ||
                                        item.publishDate ||
                                        ''
                                    );
                      const isPublished = item.published !== false;

                      return (
                        <div
                          key={String(item.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3.5 bg-slate-950/50 hover:bg-slate-900/80 transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {activeCollection === 'game_modes' && Boolean(item.imageUrl) && (
                              <div className="w-16 h-11 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                                <ResilientImage
                                  src={String(item.imageUrl)}
                                  alt={primaryLabel}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                {activeCollection === 'commands' ? (
                                  <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs sm:text-sm font-bold text-emerald-300">
                                    {primaryLabel}
                                  </code>
                                ) : (
                                  <span className="font-display text-sm font-bold text-white truncate">
                                    {primaryLabel}
                                  </span>
                                )}

                                {activeCollection === 'game_modes' &&
                                  Boolean(item.accessCommand) && (
                                    <code className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 font-mono text-xs font-bold text-emerald-300">
                                      {String(item.accessCommand)}
                                    </code>
                                  )}

                                {activeCollection === 'rules' && Boolean(item.category) && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-[11px] font-semibold text-emerald-300">
                                    {String(item.category)}
                                  </span>
                                )}

                                {activeCollection === 'leaderboards' && Boolean(item.category) && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                                      item.category === 'PvP Masters' || item.category === 'PvP Master'
                                        ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                                        : item.category === 'Challengers'
                                          ? 'bg-purple-500/20 border border-purple-400/40 text-amber-300'
                                          : item.category === 'Builders' || item.category === 'Master Builder'
                                            ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'
                                            : item.category === 'Mini-Game Champions' || item.category === 'Minigame Champion'
                                              ? 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-300'
                                              : item.category === 'Event Winners' || item.category === 'Event Winner'
                                                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                                : 'bg-teal-500/15 border border-teal-500/40 text-teal-300'
                                    }`}
                                  >
                                    {String(item.category)}
                                  </span>
                                )}

                                {activeCollection === 'leaderboards' && Boolean(item.videoUrl) && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 font-mono text-[10px] font-semibold text-rose-300">
                                    Video Attached
                                  </span>
                                )}

                                <span
                                  className={`text-[11px] font-mono ${
                                    isPublished ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  ·{' '}
                                  {activeCollection === 'commands' ||
                                  activeCollection === 'game_modes'
                                    ? isPublished
                                      ? 'Enabled (Active)'
                                      : 'Disabled (Hidden)'
                                    : isPublished
                                      ? 'Published'
                                      : 'Draft'}
                                </span>
                              </div>
                              {secondaryLabel && (
                                <div className="text-xs text-slate-400 line-clamp-2">
                                  {secondaryLabel}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {activeCollection === 'news' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handlePinAnnouncementToGlobalBanner(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 hover:bg-cyan-500/25 cursor-pointer"
                                title="Broadcast this announcement in the Global Top Banner"
                              >
                                <Megaphone className="w-3.5 h-3.5" />
                                <span>Pin to Top Banner</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleRecordPublished(item)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                isPublished
                                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25'
                              }`}
                            >
                              <span>{isPublished ? 'Disable' : 'Enable'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  collectionName: activeCollection,
                                  id: String(item.id),
                                  label: primaryLabel,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: REGISTERED USERS & ROLE MANAGEMENT */}
          {activeSection === 'users' && (
            <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    Registered Users &amp; Role Management
                  </h2>
                  <p className="text-xs text-slate-400">
                    View all registered database users, rank players on the Leaderboard, or manage
                    roles. Master Admin (<code className="font-mono text-emerald-300">{SUPER_ADMIN_EMAILS[0]}</code>) is permanently protected.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search username or email..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadAllUsers}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    aria-label="Reload users"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingList ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading registered users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  No matching registered users found.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                  {filteredUsers.map((u) => {
                    const isMaster = isSuperAdminEmail(u.email);
                    return (
                      <div
                        key={u.uid}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 bg-slate-950/50 hover:bg-slate-900/70 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <MinecraftAvatar
                            username={u.minecraftUsername || u.firstName || 'Player'}
                            customAvatarUrl={u.avatarUrl}
                            size="md"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-sm font-bold text-white truncate">
                                {u.minecraftUsername}
                              </span>
                              <span className="text-xs text-slate-400">({u.firstName})</span>
                              {isMaster ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                                  MASTER ADMIN
                                </span>
                              ) : u.role === 'admin' ? (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
                                  ADMIN
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                                  USER
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                              {u.email}
                              {u.discordUsername ? ` · Discord: ${u.discordUsername}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRankUserOnLeaderboard(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Rank on Leaderboard</span>
                          </button>

                          {!isMaster && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              disabled={busy || u.uid === user?.uid}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                            >
                              {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            </button>
                          )}

                          {!isMaster && u.uid !== user?.uid && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  collectionName: 'users',
                                  id: u.uid,
                                  label: u.minecraftUsername,
                                  email: u.email,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Never Delete Silently) */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-modal-title" className="font-display text-lg font-bold text-white">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-white">&ldquo;{deleteTarget.label}&rdquo;</strong> from{' '}
                  <code className="font-mono text-rose-300">{deleteTarget.collectionName}</code>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
              >
                {busy ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
