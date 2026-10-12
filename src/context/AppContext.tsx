import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
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
} from '../data/seedData';
import {
  CommandCategory,
  CommunityEventItem,
  EventReminderItem,
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

const LEGACY_PLACEHOLDER_DISCORD = 'https://discord.gg/proplayers';

function isValidHttpUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'https://') return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
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
  eventReminders: EventReminderItem[];
  remindedEventIds: string[];
  toggleEventReminder: (event: CommunityEventItem) => Promise<boolean>;
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

  // All CMS states are fetched live in real-time directly from Firebase Firestore (no hardcoded seed fallbacks)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [commands, setCommands] = useState<ServerCommandItem[]>([]);
  const [joinSteps, setJoinSteps] = useState<JoinStepItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [gameModes, setGameModes] = useState<GameModeItem[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntryItem[]>([]);
  const [staff, setStaff] = useState<StaffMemberItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [events, setEvents] = useState<CommunityEventItem[]>([]);
  const [eventReminders, setEventReminders] = useState<EventReminderItem[]>([]);
  const [news, setNews] = useState<NewsArticleItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
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

  // Real-time listener for logged-in user's event reminders in Firestore (/users/{uid}/event_reminders)
  useEffect(() => {
    if (!user?.uid) {
      setEventReminders([]);
      return;
    }

    const storageKey = `pro_players_event_reminders_${user.uid}`;
    try {
      const cachedRaw = localStorage.getItem(storageKey);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as EventReminderItem[];
        if (Array.isArray(parsed)) {
          setEventReminders(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    }

    const remindersCol = collection(db, 'users', user.uid, 'event_reminders');
    const unsub = onSnapshot(
      remindersCol,
      (snap) => {
        const docs: EventReminderItem[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            uid: String(raw.uid ?? user.uid),
            eventId: String(raw.eventId ?? d.id),
            eventTitle: String(raw.eventTitle ?? ''),
            eventDate: String(raw.eventDate ?? ''),
            eventTime: String(raw.eventTime ?? ''),
            createdAt: String(raw.createdAt ?? ''),
          };
        });
        setEventReminders(docs);
        try {
          localStorage.setItem(storageKey, JSON.stringify(docs));
        } catch {
          // Ignore storage write errors
        }
      },
      () => {
        // Keep cached state if offline or restricted
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const remindedEventIds = React.useMemo(
    () => eventReminders.map((r) => r.eventId || r.id),
    [eventReminders]
  );

  const toggleEventReminder = useCallback(
    async (event: CommunityEventItem): Promise<boolean> => {
      const currentUser = auth.currentUser || user;
      if (!currentUser?.uid) {
        throw new Error('Please sign in to set event reminders.');
      }

      const uid = currentUser.uid;
      const storageKey = `pro_players_event_reminders_${uid}`;
      const isCurrentlyReminded = eventReminders.some(
        (r) => r.eventId === event.id || r.id === event.id
      );
      const reminderRef = doc(db, 'users', uid, 'event_reminders', event.id);

      if (isCurrentlyReminded) {
        const nextList = eventReminders.filter(
          (r) => r.eventId !== event.id && r.id !== event.id
        );
        setEventReminders(nextList);
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextList));
        } catch {
          // Ignore
        }
        await deleteDoc(reminderRef);
        return false;
      } else {
        const nowIso = new Date().toISOString();
        const payload: Omit<EventReminderItem, 'id'> = {
          uid,
          eventId: event.id,
          eventTitle: (event.title || 'Community Event').trim().slice(0, 120),
          eventDate: (event.eventDate || 'TBA').trim().slice(0, 40),
          eventTime: (event.eventTime || '18:00 UTC').trim().slice(0, 40),
          createdAt: nowIso,
        };
        const nextItem: EventReminderItem = { id: event.id, ...payload };
        const nextList = [...eventReminders, nextItem];
        setEventReminders(nextList);
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextList));
        } catch {
          // Ignore
        }
        await setDoc(reminderRef, payload);
        return true;
      }
    },
    [user, eventReminders]
  );

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

  // Manual refresh from Firebase Firestore (strictly live database documents, zero hardcoded seed fallbacks)
  const refreshCms = useCallback(async () => {
    setCmsLoading(true);
    try {
      // 1. Site Settings from Firestore
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
          setSiteSettings({
            id: mainDoc.id,
            ...DEFAULT_SITE_SETTINGS,
            ...loadedSettings,
            officialLogoUrl:
              loadedSettings.officialLogoUrl || DEFAULT_SITE_SETTINGS.officialLogoUrl,
          });
        }
      } catch {
        // Keep current siteSettings if unreachable
      }

      async function fetchLiveCollection<T extends { id: string }>(
        colName: string,
        mapDoc: (id: string, data: Record<string, unknown>) => T,
        sortFn?: (a: T, b: T) => number
      ): Promise<T[]> {
        try {
          const snap = await getDocs(collection(db, colName));
          if (snap.empty) {
            return [];
          }
          markCollectionCustomized(colName);
          const items = snap.docs
            .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
            .filter(
              (item) => (item as unknown as { published?: boolean }).published !== false
            );
          return sortFn ? [...items].sort(sortFn) : items;
        } catch {
          return [];
        }
      }

      const defaultMap = <T extends { id: string }>(
        id: string,
        data: Record<string, unknown>
      ): T => ({ id, ...data }) as unknown as T;

      const [
        liveStories,
        liveRules,
        liveCommands,
        liveJoinSteps,
        liveFaqs,
        liveFeatures,
        liveGameModes,
        liveLeaderboards,
        liveStaff,
        liveGallery,
        liveTestimonials,
        liveEvents,
        liveNews,
        liveSocialLinks,
      ] = await Promise.all([
        fetchLiveCollection<StoryItem>('stories', defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<RuleItem>('rules', normalizeRuleDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<ServerCommandItem>('commands', normalizeCommandDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<JoinStepItem>('join_steps', defaultMap, (a, b) => (Number(a.stepNumber) || 0) - (Number(b.stepNumber) || 0)),
        fetchLiveCollection<FaqItem>('faqs', defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<FeatureItem>('features', defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<GameModeItem>('game_modes', normalizeWarpDoc, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<LeaderboardEntryItem>('leaderboards', defaultMap, (a, b) => (Number(a.rank) || 1) - (Number(b.rank) || 1)),
        fetchLiveCollection<StaffMemberItem>('staff', defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
        fetchLiveCollection<GalleryItem>('gallery', defaultMap),
        fetchLiveCollection<TestimonialItem>('testimonials', defaultMap),
        fetchLiveCollection<CommunityEventItem>('events', defaultMap),
        fetchLiveCollection<NewsArticleItem>('news', defaultMap, (a, b) =>
          String(b.publishDate || '').localeCompare(String(a.publishDate || ''))
        ),
        fetchLiveCollection<SocialLinkItem>('social_links', defaultMap, (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
      ]);

      setStories(liveStories);
      setRules(liveRules);
      setCommands(liveCommands);
      setJoinSteps(liveJoinSteps);
      setFaqs(liveFaqs);
      setFeatures(liveFeatures);
      setGameModes(liveGameModes);
      setLeaderboards(liveLeaderboards);
      setStaff(liveStaff);
      setGallery(liveGallery);
      setTestimonials(liveTestimonials);
      setEvents(liveEvents);
      setNews(liveNews);
      setSocialLinks(liveSocialLinks);
      setIsUsingSeedFallback(false);
    } finally {
      setCmsLoading(false);
    }
  }, []);

  // Real-time Firestore listeners so any database update immediately reflects on live pages
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
            setSiteSettings({
              id: mainDoc.id,
              ...DEFAULT_SITE_SETTINGS,
              ...loadedSettings,
              officialLogoUrl:
                loadedSettings.officialLogoUrl || DEFAULT_SITE_SETTINGS.officialLogoUrl,
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
          setCommands(docs);
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
          setGameModes(docs);
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
          setRules(docs);
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
          setJoinSteps(docs);
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
          setFaqs(docs);
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
          setStories(docs);
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
          setFeatures(docs);
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
          setEvents(docs);
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
          setNews(docs);
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
          setStaff(docs);
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
          setGallery(docs);
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
          setTestimonials(docs);
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
          setSocialLinks(docs);
        },
        () => {}
      )
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [refreshCms]);

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

  // Automatically connect & sync Discord (and other social URLs) from live Firestore socialLinks and siteSettings across all pages
  const syncedSiteSettings = React.useMemo<SiteSettings>(() => {
    const resolvePlatformUrl = (
      platformName: string,
      checkPrimary: boolean,
      settingsUrl?: string
    ): string => {
      const matchingDocs = socialLinks
        .filter(
          (l) =>
            l.published !== false &&
            (l.platform?.toLowerCase() === platformName.toLowerCase() ||
              (checkPrimary && l.isPrimary)) &&
            isValidHttpUrl(l.url)
        )
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

      // 1. Prefer any custom (non-placeholder) URL from live Firestore social_links
      const customFromSocialLinks = matchingDocs.find(
        (l) => l.url.trim().toLowerCase() !== LEGACY_PLACEHOLDER_DISCORD
      );
      if (customFromSocialLinks) {
        return customFromSocialLinks.url.trim();
      }

      // 2. Otherwise prefer a custom (non-placeholder) URL from live Firestore site_settings
      if (
        isValidHttpUrl(settingsUrl) &&
        settingsUrl!.trim().toLowerCase() !== LEGACY_PLACEHOLDER_DISCORD
      ) {
        return settingsUrl!.trim();
      }

      // 3. Otherwise use whichever valid URL exists in live Firestore social_links or site_settings
      if (matchingDocs.length > 0) {
        return matchingDocs[0].url.trim();
      }
      if (isValidHttpUrl(settingsUrl)) {
        return settingsUrl!.trim();
      }
      return '';
    };

    return {
      ...siteSettings,
      discordUrl: resolvePlatformUrl('discord', true, siteSettings.discordUrl),
      youtubeUrl: resolvePlatformUrl('youtube', false, siteSettings.youtubeUrl),
      instagramUrl: resolvePlatformUrl('instagram', false, siteSettings.instagramUrl),
      facebookUrl: resolvePlatformUrl('facebook', false, siteSettings.facebookUrl),
    };
  }, [siteSettings, socialLinks]);

  // Ensure socialLinks entries for Discord also reflect the live synced Discord URL
  const syncedSocialLinks = React.useMemo<SocialLinkItem[]>(() => {
    const activeDiscord = syncedSiteSettings.discordUrl;
    if (!activeDiscord) return socialLinks;
    return socialLinks.map((link) => {
      if (link.platform?.toLowerCase() === 'discord' || link.isPrimary) {
        return {
          ...link,
          url: activeDiscord,
        };
      }
      return link;
    });
  }, [socialLinks, syncedSiteSettings.discordUrl]);

  // Automatically update any event using an empty or legacy placeholder Discord link to use the live connected Discord link from Firestore
  const syncedEvents = React.useMemo<CommunityEventItem[]>(() => {
    const activeDiscord = syncedSiteSettings.discordUrl;
    if (!activeDiscord) return events;
    return events.map((evt) => {
      const rawLink = (evt.discordLink || '').trim();
      if (!rawLink || rawLink.toLowerCase() === LEGACY_PLACEHOLDER_DISCORD) {
        return {
          ...evt,
          discordLink: activeDiscord,
        };
      }
      return evt;
    });
  }, [events, syncedSiteSettings.discordUrl]);

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        authLoading,
        isAdmin,
        isOwnerEmail,
        refreshUserProfile,
        siteSettings: syncedSiteSettings,
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
        events: syncedEvents,
        eventReminders,
        remindedEventIds,
        toggleEventReminder,
        news,
        socialLinks: syncedSocialLinks,
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
