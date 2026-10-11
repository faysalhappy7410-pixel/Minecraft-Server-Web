import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import {
  auth,
  db,
  isSuperAdminEmail,
  syncAuthenticatedUserProfile,
} from '../lib/firebase';
import {
  DEFAULT_SITE_SETTINGS,
  normalizeRuleCategory,
  SEED_COMMANDS,
  SEED_EVENTS,
  SEED_FAQS,
  SEED_FEATURES,
  SEED_GALLERY,
  SEED_GAME_MODES,
  SEED_JOIN_STEPS,
  SEED_NEWS,
  SEED_RULES,
  SEED_SOCIAL_LINKS,
  SEED_STAFF,
  SEED_STORIES,
  SEED_TESTIMONIALS,
} from '../data/seedData';
import {
  CommandCategory,
  CommunityEventItem,
  FaqItem,
  FeatureItem,
  GalleryItem,
  GameModeItem,
  JoinStepItem,
  LeaderboardEntryItem,
  LiveServerStatus,
  NewsArticleItem,
  RuleItem,
  ServerCommandItem,
  SiteSettings,
  SocialLinkItem,
  StaffMemberItem,
  StoryItem,
  TestimonialItem,
  UserProfile,
} from '../types/cms';

export const CUSTOMIZED_COLLECTION_PREFIX = 'pro_players_customized_col_';

export function isCollectionMarkedCustomized(colName: string): boolean {
  try {
    return localStorage.getItem(`${CUSTOMIZED_COLLECTION_PREFIX}${colName}`) === 'true';
  } catch {
    return false;
  }
}

export function markCollectionCustomized(colName: string): void {
  try {
    localStorage.setItem(`${CUSTOMIZED_COLLECTION_PREFIX}${colName}`, 'true');
  } catch {
    // Ignore storage error
  }
}

interface AppContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  isAdmin: boolean;
  isOwnerEmail: boolean;
  refreshUserProfile: () => Promise<void>;

  siteSettings: SiteSettings;
  stories: StoryItem[];
  rules: RuleItem[];
  commands: ServerCommandItem[];
  joinSteps: JoinStepItem[];
  faqs: FaqItem[];
  features: FeatureItem[];
  gameModes: GameModeItem[];
  leaderboards: LeaderboardEntryItem[];
  staff: StaffMemberItem[];
  gallery: GalleryItem[];
  testimonials: TestimonialItem[];
  events: CommunityEventItem[];
  news: NewsArticleItem[];
  socialLinks: SocialLinkItem[];
  cmsLoading: boolean;
  isUsingSeedFallback: boolean;
  refreshCms: () => Promise<void>;

  javaStatus: LiveServerStatus;
  bedrockStatus: LiveServerStatus;
  statusLoading: boolean;
  statusCooldownSeconds: number;
  refreshServerStatus: (force?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STATUS_COOLDOWN_MS = 60_000;

function normalizeCommandDoc(id: string, raw: Record<string, unknown>): ServerCommandItem {
  return {
    id,
    command: String(raw.command ?? '').trim(),
    category: (raw.category as CommandCategory) || 'General',
    description: String(raw.description ?? '').trim(),
    order: Number(raw.order) || 1,
    published: raw.published !== false,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function normalizeWarpDoc(id: string, raw: Record<string, unknown>): GameModeItem {
  return {
    id,
    name: String(raw.name ?? raw.title ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    accessCommand: String(raw.accessCommand ?? raw.command ?? '').trim(),
    iconName: String(raw.iconName ?? 'Compass').trim() || 'Compass',
    imageUrl: String(raw.imageUrl ?? '').trim(),
    order: Number(raw.order) || 1,
    published: raw.published !== false,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function normalizeRuleDoc(id: string, raw: Record<string, unknown>): RuleItem {
  return {
    id,
    title: String(raw.title ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    category: normalizeRuleCategory(String(raw.category ?? 'General Rules')),
    order: Number(raw.order) || 1,
    published: raw.published !== false,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [stories, setStories] = useState<StoryItem[]>(
    isCollectionMarkedCustomized('stories') ? [] : SEED_STORIES
  );
  const [rules, setRules] = useState<RuleItem[]>(
    isCollectionMarkedCustomized('rules') ? [] : SEED_RULES
  );
  const [commands, setCommands] = useState<ServerCommandItem[]>(
    isCollectionMarkedCustomized('commands') ? [] : SEED_COMMANDS
  );
  const [joinSteps, setJoinSteps] = useState<JoinStepItem[]>(
    isCollectionMarkedCustomized('join_steps') ? [] : SEED_JOIN_STEPS
  );
  const [faqs, setFaqs] = useState<FaqItem[]>(
    isCollectionMarkedCustomized('faqs') ? [] : SEED_FAQS
  );
  const [features, setFeatures] = useState<FeatureItem[]>(
    isCollectionMarkedCustomized('features') ? [] : SEED_FEATURES
  );
  const [gameModes, setGameModes] = useState<GameModeItem[]>(
    isCollectionMarkedCustomized('game_modes') ? [] : SEED_GAME_MODES
  );
  // Leaderboards default to live Firestore entries so the stylish placeholder state is shown when no entries exist yet
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntryItem[]>([]);
  const [staff, setStaff] = useState<StaffMemberItem[]>(
    isCollectionMarkedCustomized('staff') ? [] : SEED_STAFF
  );
  const [gallery, setGallery] = useState<GalleryItem[]>(
    isCollectionMarkedCustomized('gallery') ? [] : SEED_GALLERY
  );
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    isCollectionMarkedCustomized('testimonials') ? [] : SEED_TESTIMONIALS
  );
  const [events, setEvents] = useState<CommunityEventItem[]>(
    isCollectionMarkedCustomized('events') ? [] : SEED_EVENTS
  );
  const [news, setNews] = useState<NewsArticleItem[]>(
    isCollectionMarkedCustomized('news') ? [] : SEED_NEWS
  );
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(
    isCollectionMarkedCustomized('social_links') ? [] : SEED_SOCIAL_LINKS
  );
  const [cmsLoading, setCmsLoading] = useState<boolean>(true);
  const [isUsingSeedFallback, setIsUsingSeedFallback] = useState<boolean>(false);

  const [javaStatus, setJavaStatus] = useState<LiveServerStatus>({
    online: false,
    host: DEFAULT_SITE_SETTINGS.javaHost,
    port: DEFAULT_SITE_SETTINGS.javaPort || 25565,
    playersOnline: 0,
    playersMax: 0,
    version: DEFAULT_SITE_SETTINGS.minecraftVersion,
    motdClean: 'PRO PLAYERS — Free hosting: server may be in standby mode.',
    lastCheckedAt: new Date().toISOString(),
  });

  const [bedrockStatus, setBedrockStatus] = useState<LiveServerStatus>({
    online: false,
    host: DEFAULT_SITE_SETTINGS.bedrockHost,
    port: DEFAULT_SITE_SETTINGS.bedrockPort || 19132,
    playersOnline: 0,
    playersMax: 0,
    version: DEFAULT_SITE_SETTINGS.minecraftVersion,
    motdClean: 'PRO PLAYERS Bedrock Gateway — Free hosting: server may be in standby mode.',
    lastCheckedAt: new Date().toISOString(),
  });

  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusCooldownSeconds, setStatusCooldownSeconds] = useState<number>(0);
  const lastStatusFetchRef = useRef<number>(0);

  const loadUserProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await syncAuthenticatedUserProfile(currentUser);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await loadUserProfile(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [loadUserProfile]);

  const refreshUserProfile = useCallback(async () => {
    await loadUserProfile(auth.currentUser);
  }, [loadUserProfile]);

  // Sync CSS variables and favicon when siteSettings updates
  useEffect(() => {
    const root = document.documentElement;
    if (siteSettings.primaryColor) {
      root.style.setProperty('--brand-primary', siteSettings.primaryColor);
    }
    if (siteSettings.secondaryColor) {
      root.style.setProperty('--brand-secondary', siteSettings.secondaryColor);
    }
    if (siteSettings.officialLogoUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = siteSettings.officialLogoUrl;
      }
    }
  }, [siteSettings]);

  const resolveCollectionItems = useCallback(
    <T extends { id: string }>(
      colName: string,
      firestoreDocs: T[],
      seedFallback: T[],
      isFirestoreEmpty: boolean
    ): T[] => {
      if (!isFirestoreEmpty) {
        markCollectionCustomized(colName);
        return firestoreDocs;
      }
      if (isCollectionMarkedCustomized(colName)) {
        return [];
      }
      return seedFallback;
    },
    []
  );

  // Manual refresh from Firebase Firestore
  const refreshCms = useCallback(async () => {
    setCmsLoading(true);
    try {
      // 1. Site Settings
      try {
        const settingsSnap = await getDocs(collection(db, 'site_settings'));
        if (!settingsSnap.empty) {
          const mainDoc =
            settingsSnap.docs.find((d) => d.id === 'main') || settingsSnap.docs[0];
          const loadedSettings = mainDoc.data() as SiteSettings;
          if (loadedSettings.customizedCollections) {
            Object.entries(loadedSettings.customizedCollections).forEach(([col, isCust]) => {
              if (isCust) markCollectionCustomized(col);
            });
          }
          const isOldDefaultLogo =
            !loadedSettings.officialLogoUrl ||
            loadedSettings.officialLogoUrl.includes('pro_players_logo_') ||
            loadedSettings.officialLogoUrl.includes('pro_players_official_emblem_') ||
            loadedSettings.officialLogoUrl.includes('minecraft_players_esports_logo_');
          setSiteSettings({
            id: mainDoc.id,
            ...DEFAULT_SITE_SETTINGS,
            ...loadedSettings,
            officialLogoUrl: isOldDefaultLogo
              ? DEFAULT_SITE_SETTINGS.officialLogoUrl
              : loadedSettings.officialLogoUrl,
          });
        }
      } catch {
        // Keep current siteSettings if unreachable
      }

      async function fetchCollectionWithFallback<T extends { id: string }>(
        colName: string,
        seedItems: T[],
        mapDoc: (id: string, data: Record<string, unknown>) => T,
        sortFn?: (a: T, b: T) => number
      ): Promise<{ items: T[]; usedSeed: boolean }> {
        try {
          const snap = await getDocs(collection(db, colName));
          if (snap.empty) {
            if (isCollectionMarkedCustomized(colName)) {
              return { items: [], usedSeed: false };
            }
            return { items: seedItems, usedSeed: seedItems.length > 0 };
          }
          markCollectionCustomized(colName);
          const items = snap.docs
            .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
            .filter(
              (item) => (item as unknown as { published?: boolean }).published !== false
            );
          return {
            items: sortFn ? [...items].sort(sortFn) : items,
            usedSeed: false,
          };
        } catch {
          return {
            items: isCollectionMarkedCustomized(colName) ? [] : seedItems,
            usedSeed: !isCollectionMarkedCustomized(colName) && seedItems.length > 0,
          };
        }
      }

      const defaultMap = <T extends { id: string }>(
        id: string,
        data: Record<string, unknown>
      ): T => ({ id, ...data }) as unknown as T;

      const [
        resStories,
        resRules,
        resCommands,
        resJoinSteps,
        resFaqs,
        resFeatures,
        resGameModes,
        resLeaderboards,
        resStaff,
        resGallery,
        resTestimonials,
        resEvents,
        resNews,
        resSocialLinks,
      ] = await Promise.all([
        fetchCollectionWithFallback<StoryItem>('stories', SEED_STORIES, defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<RuleItem>('rules', SEED_RULES, normalizeRuleDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<ServerCommandItem>('commands', SEED_COMMANDS, normalizeCommandDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<JoinStepItem>('join_steps', SEED_JOIN_STEPS, defaultMap, (a, b) => (Number(a.stepNumber) || 0) - (Number(b.stepNumber) || 0)),
        fetchCollectionWithFallback<FaqItem>('faqs', SEED_FAQS, defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<FeatureItem>('features', SEED_FEATURES, defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<GameModeItem>('game_modes', SEED_GAME_MODES, normalizeWarpDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<LeaderboardEntryItem>('leaderboards', [], defaultMap, (a, b) => (Number(a.rank) || 1) - (Number(b.rank) || 1)),
        fetchCollectionWithFallback<StaffMemberItem>('staff', SEED_STAFF, defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchCollectionWithFallback<GalleryItem>('gallery', SEED_GALLERY, defaultMap),
        fetchCollectionWithFallback<TestimonialItem>('testimonials', SEED_TESTIMONIALS, defaultMap),
        fetchCollectionWithFallback<CommunityEventItem>('events', SEED_EVENTS, defaultMap),
        fetchCollectionWithFallback<NewsArticleItem>('news', SEED_NEWS, defaultMap, (a, b) =>
          String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
        ),
        fetchCollectionWithFallback<SocialLinkItem>('social_links', SEED_SOCIAL_LINKS, defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
      ]);

      setStories(resStories.items);
      setRules(resRules.items);
      setCommands(resCommands.items);
      setJoinSteps(resJoinSteps.items);
      setFaqs(resFaqs.items);
      setFeatures(resFeatures.items);
      setGameModes(resGameModes.items);
      setLeaderboards(resLeaderboards.items);
      setStaff(resStaff.items);
      setGallery(resGallery.items);
      setTestimonials(resTestimonials.items);
      setEvents(resEvents.items);
      setNews(resNews.items);
      setSocialLinks(resSocialLinks.items);
      setIsUsingSeedFallback(
        resRules.usedSeed || resCommands.usedSeed || resGameModes.usedSeed
      );
    } finally {
      setCmsLoading(false);
    }
  }, []);

  // Real-time Firestore listeners so any Admin edit/delete/add immediately reflects on live pages
  useEffect(() => {
    refreshCms();

    const unsubscribers: (() => void)[] = [];

    // 1. Live site_settings listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'site_settings'),
        (snap) => {
          if (!snap.empty) {
            const mainDoc = snap.docs.find((d) => d.id === 'main') || snap.docs[0];
            const loadedSettings = mainDoc.data() as SiteSettings;
            if (loadedSettings.customizedCollections) {
              Object.entries(loadedSettings.customizedCollections).forEach(([col, isCust]) => {
                if (isCust) markCollectionCustomized(col);
              });
            }
            const isOldDefaultLogo =
              !loadedSettings.officialLogoUrl ||
              loadedSettings.officialLogoUrl.includes('pro_players_logo_') ||
              loadedSettings.officialLogoUrl.includes('pro_players_official_emblem_') ||
              loadedSettings.officialLogoUrl.includes('minecraft_players_esports_logo_');
            setSiteSettings({
              id: mainDoc.id,
              ...DEFAULT_SITE_SETTINGS,
              ...loadedSettings,
              officialLogoUrl: isOldDefaultLogo
                ? DEFAULT_SITE_SETTINGS.officialLogoUrl
                : loadedSettings.officialLogoUrl,
            });
          }
        },
        () => {}
      )
    );

    // 2. Live commands listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'commands'),
        (snap) => {
          const docs = snap.docs
            .map((d) => normalizeCommandDoc(d.id, d.data() as Record<string, unknown>))
            .filter((c) => c.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setCommands(resolveCollectionItems('commands', docs, SEED_COMMANDS, snap.empty));
          setCmsLoading(false);
        },
        () => {}
      )
    );

    // 3. Live game_modes (Warps & Realms) listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'game_modes'),
        (snap) => {
          const docs = snap.docs
            .map((d) => normalizeWarpDoc(d.id, d.data() as Record<string, unknown>))
            .filter((m) => m.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setGameModes(resolveCollectionItems('game_modes', docs, SEED_GAME_MODES, snap.empty));
          setCmsLoading(false);
        },
        () => {}
      )
    );

    // 4. Live rules listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'rules'),
        (snap) => {
          const docs = snap.docs
            .map((d) => normalizeRuleDoc(d.id, d.data() as Record<string, unknown>))
            .filter((r) => r.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setRules(resolveCollectionItems('rules', docs, SEED_RULES, snap.empty));
        },
        () => {}
      )
    );

    // 5. Live join_steps listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'join_steps'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<JoinStepItem, 'id'>) }))
            .filter((s) => s.published !== false)
            .sort((a, b) => (Number(a.stepNumber) || 0) - (Number(b.stepNumber) || 0));
          setJoinSteps(resolveCollectionItems('join_steps', docs, SEED_JOIN_STEPS, snap.empty));
        },
        () => {}
      )
    );

    // 6. Live faqs listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'faqs'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FaqItem, 'id'>) }))
            .filter((f) => f.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setFaqs(resolveCollectionItems('faqs', docs, SEED_FAQS, snap.empty));
        },
        () => {}
      )
    );

    // 7. Live stories listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'stories'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<StoryItem, 'id'>) }))
            .filter((s) => s.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setStories(resolveCollectionItems('stories', docs, SEED_STORIES, snap.empty));
        },
        () => {}
      )
    );

    // 8. Live features listener
    unsubscribers.push(
      onSnapshot(
        collection(db, 'features'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FeatureItem, 'id'>) }))
            .filter((f) => f.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setFeatures(resolveCollectionItems('features', docs, SEED_FEATURES, snap.empty));
        },
        () => {}
      )
    );

    // 9. Live events, news, leaderboards, staff, gallery, testimonials, social_links listeners
    unsubscribers.push(
      onSnapshot(
        collection(db, 'events'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityEventItem, 'id'>) }))
            .filter((e) => e.published !== false);
          setEvents(resolveCollectionItems('events', docs, SEED_EVENTS, snap.empty));
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'news'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<NewsArticleItem, 'id'>) }))
            .filter((n) => n.published !== false)
            .sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')));
          setNews(resolveCollectionItems('news', docs, SEED_NEWS, snap.empty));
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'leaderboards'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<LeaderboardEntryItem, 'id'>) }))
            .filter((l) => l.published !== false)
            .sort((a, b) => (Number(a.rank) || 1) - (Number(b.rank) || 1));
          setLeaderboards(docs);
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'staff'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMemberItem, 'id'>) }))
            .filter((s) => s.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setStaff(resolveCollectionItems('staff', docs, SEED_STAFF, snap.empty));
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'gallery'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryItem, 'id'>) }))
            .filter((g) => g.published !== false);
          setGallery(resolveCollectionItems('gallery', docs, SEED_GALLERY, snap.empty));
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'testimonials'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<TestimonialItem, 'id'>) }))
            .filter((t) => t.published !== false);
          setTestimonials(resolveCollectionItems('testimonials', docs, SEED_TESTIMONIALS, snap.empty));
        },
        () => {}
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, 'social_links'),
        (snap) => {
          const docs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<SocialLinkItem, 'id'>) }))
            .filter((s) => s.published !== false)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setSocialLinks(resolveCollectionItems('social_links', docs, SEED_SOCIAL_LINKS, snap.empty));
        },
        () => {}
      )
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [refreshCms, resolveCollectionItems]);

  // Separate, safe live server status fetch using mcstatus.io
  const refreshServerStatus = useCallback(
    async (force = false) => {
      const now = Date.now();
      const elapsed = now - lastStatusFetchRef.current;
      if (!force && lastStatusFetchRef.current > 0 && elapsed < STATUS_COOLDOWN_MS) {
        return;
      }

      lastStatusFetchRef.current = now;
      setStatusCooldownSeconds(60);
      setStatusLoading(true);

      const javaHost = (siteSettings.javaHost || 'play.proplayers.gg').trim();
      const javaPort = Number(siteSettings.javaPort) || 25565;
      const bedrockHost = (siteSettings.bedrockHost || 'bedrock.proplayers.gg').trim();
      const bedrockPort = Number(siteSettings.bedrockPort) || 19132;

      const javaAddress = javaPort === 25565 ? javaHost : `${javaHost}:${javaPort}`;
      const bedrockAddress = `${bedrockHost}:${bedrockPort}`;

      const fetchWithTimeout = async (url: string, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          clearTimeout(timer);
          if (response.status === 429) {
            throw new Error('Rate limit reached. Please wait 60 seconds before refreshing.');
          }
          if (!response.ok) {
            throw new Error(`Status service returned HTTP ${response.status}`);
          }
          return await response.json();
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      };

      const checkedAt = new Date().toISOString();

      const javaPromise = (async () => {
        try {
          const data = await fetchWithTimeout(
            `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(javaAddress)}`
          );
          const isOnline = Boolean(data?.online);
          const motdClean =
            data?.motd?.clean?.join(' ')?.trim() ||
            (isOnline
              ? 'PRO PLAYERS — Java Edition Realm Online'
              : 'Server is currently offline or in free-hosting standby mode.');
          setJavaStatus({
            online: isOnline,
            host: javaHost,
            port: data?.port || javaPort,
            playersOnline: isOnline ? Number(data?.players?.online ?? 0) : 0,
            playersMax: isOnline ? Number(data?.players?.max ?? 100) : 0,
            version: data?.version?.name_clean || siteSettings.minecraftVersion,
            motdClean,
            lastCheckedAt: checkedAt,
          });
        } catch (err) {
          setJavaStatus({
            online: false,
            host: javaHost,
            port: javaPort,
            playersOnline: 0,
            playersMax: 0,
            version: siteSettings.minecraftVersion,
            motdClean: 'Server is currently offline or unreachable (Free hosting standby).',
            lastCheckedAt: checkedAt,
            error: err instanceof Error ? err.message : 'Unable to reach status API',
          });
        }
      })();

      const bedrockPromise = (async () => {
        try {
          const data = await fetchWithTimeout(
            `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(bedrockAddress)}`
          );
          const isOnline = Boolean(data?.online);
          const motdClean =
            data?.motd?.clean?.join(' ')?.trim() ||
            (isOnline
              ? 'PRO PLAYERS — Bedrock Crossplay Online'
              : 'Bedrock gateway is currently offline or in free-hosting standby mode.');
          setBedrockStatus({
            online: isOnline,
            host: bedrockHost,
            port: data?.port || bedrockPort,
            playersOnline: isOnline ? Number(data?.players?.online ?? 0) : 0,
            playersMax: isOnline ? Number(data?.players?.max ?? 100) : 0,
            version: data?.version?.name || siteSettings.minecraftVersion,
            motdClean,
            lastCheckedAt: checkedAt,
          });
        } catch (err) {
          setBedrockStatus({
            online: false,
            host: bedrockHost,
            port: bedrockPort,
            playersOnline: 0,
            playersMax: 0,
            version: siteSettings.minecraftVersion,
            motdClean: 'Bedrock gateway is currently offline or unreachable (Free hosting standby).',
            lastCheckedAt: checkedAt,
            error: err instanceof Error ? err.message : 'Unable to reach status API',
          });
        }
      })();

      await Promise.allSettled([javaPromise, bedrockPromise]);
      setStatusLoading(false);
    },
    [
      siteSettings.javaHost,
      siteSettings.javaPort,
      siteSettings.bedrockHost,
      siteSettings.bedrockPort,
      siteSettings.minecraftVersion,
    ]
  );

  // Initial status fetch and 60s background refresh interval
  useEffect(() => {
    refreshServerStatus(true);
    const interval = setInterval(() => {
      refreshServerStatus(true);
    }, STATUS_COOLDOWN_MS);
    return () => clearInterval(interval);
  }, [refreshServerStatus]);

  // Countdown timer for manual refresh button
  useEffect(() => {
    if (statusCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setStatusCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [statusCooldownSeconds]);

  // Hardcoded Master Admin check against SUPER_ADMIN_EMAILS (faysalhappy7410@gmail.com)
  const isOwnerEmail = isSuperAdminEmail(user?.email || userProfile?.email);
  const isAdmin = Boolean(isOwnerEmail || userProfile?.role === 'admin');

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        authLoading,
        isAdmin,
        isOwnerEmail,
        refreshUserProfile,
        siteSettings,
        stories,
        rules,
        commands,
        joinSteps,
        faqs,
        features,
        gameModes,
        leaderboards,
        staff,
        gallery,
        testimonials,
        events,
        news,
        socialLinks,
        cmsLoading,
        isUsingSeedFallback,
        refreshCms,
        javaStatus,
        bedrockStatus,
        statusLoading,
        statusCooldownSeconds,
        refreshServerStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
