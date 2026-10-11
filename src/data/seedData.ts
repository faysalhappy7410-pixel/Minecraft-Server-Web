import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CommunityEventItem,
  FaqItem,
  FeatureItem,
  GalleryItem,
  GameModeItem,
  JoinStepItem,
  LeaderboardEntryItem,
  NewsArticleItem,
  RuleCategory,
  RuleItem,
  ServerCommandItem,
  SiteSettings,
  SocialLinkItem,
  StaffMemberItem,
  StoryItem,
  TestimonialItem,
} from '../types/cms';

export const OFFICIAL_LOGO_ASSET = '/pro-players-logo.png';
export const THEME_REFERENCE_ASSET = '/src/assets/images/pro_players_ender_bg_1791687106870.jpg';
export const BUILD_CITADEL_ASSET = '/src/assets/images/build_citadel_showcase_1791684771545.jpg';
export const BUILD_ARENA_ASSET = '/src/assets/images/build_cyber_arena_1791684782779.jpg';
export const BUILD_GARDENS_ASSET = '/src/assets/images/build_elysium_gardens_1791684793830.jpg';

const NOW_ISO = '2026-10-10T19:00:00.000Z';

export function normalizeRuleCategory(
  rawCategory?: string
): 'General Rules' | 'Building/Griefing Rules' | 'Chat & Behavior Etiquette' | 'PvP/Fair Play' {
  const c = String(rawCategory || '').trim().toLowerCase();
  if (c.includes('build') || c.includes('grief')) {
    return 'Building/Griefing Rules';
  }
  if (c.includes('chat') || c.includes('behavior') || c.includes('etiquette')) {
    return 'Chat & Behavior Etiquette';
  }
  if (c.includes('pvp') || c.includes('fair') || c.includes('prohibit') || c.includes('combat')) {
    return 'PvP/Fair Play';
  }
  return 'General Rules';
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 'main',
  siteName: 'PRO PLAYERS',
  tagline: 'Where Builders, Tacticians, and Survivors Unite',
  description:
    'PRO PLAYERS is a cross-platform Minecraft community server supporting both Java and Bedrock editions. Experience balanced survival realms, competitive PvP colosseums, collaborative creative districts, and weekly community events.',
  officialLogoUrl: OFFICIAL_LOGO_ASSET,
  themeReferenceUrl: THEME_REFERENCE_ASSET,
  backgroundImageUrl: THEME_REFERENCE_ASSET,
  primaryColor: '#10b981',
  secondaryColor: '#06b6d4',
  javaHost: 'play.proplayers.gg',
  javaPort: 25565,
  bedrockHost: 'bedrock.proplayers.gg',
  bedrockPort: 19132,
  minecraftVersion: '1.20.4 – 1.21.x (Java & Bedrock)',
  discordUrl: 'https://discord.gg/proplayers',
  youtubeUrl: 'https://youtube.com/@proplayersmc',
  instagramUrl: 'https://instagram.com/proplayersmc',
  facebookUrl: 'https://facebook.com/proplayersmc',
  announcementEnabled: true,
  announcementType: 'news',
  announcementTitle: 'Season IV Crossplay Update Live!',
  announcementMessage:
    'Java & Bedrock (1.20.4 – 1.21.x) unified realms are online! Join our Saturday Colosseum Tournament at 18:00 UTC or explore the new realm warps.',
  announcementLinkText: 'View Community Hub',
  announcementLinkUrl: '/community',
  customizedCollections: {},
  published: true,
  updatedAt: NOW_ISO,
};

export const SEED_FEATURES: FeatureItem[] = [
  {
    id: 'feat_survival',
    title: 'Survival',
    description:
      'Player-driven economy, land claiming protection, custom biome structures, and balanced progression with zero pay-to-win mechanics.',
    category: 'Core Gameplay',
    iconName: 'Compass',
    showOnHome: true,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'feat_pvp',
    title: 'PvP Arena',
    description:
      'Dedicated low-latency 1v1 duel queues, kit-based gladiatorial colosseums, and seasonal tournament brackets with fair matchmaking.',
    category: 'Combat',
    iconName: 'Swords',
    showOnHome: true,
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'feat_creative',
    title: 'Creative Builds',
    description:
      'Expansive plot worlds and freebuild realms with WorldEdit access for verified architects to collaborate on mega-projects.',
    category: 'Architecture',
    iconName: 'Hammer',
    showOnHome: true,
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'feat_minigames',
    title: 'Minigames',
    description:
      'Fast-paced Spleef, Parkour gauntlets, Crystal Rush, and King of the Hill rotations playable solo or with party squads.',
    category: 'Arcade',
    iconName: 'Gamepad2',
    showOnHome: true,
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'feat_events',
    title: 'Community Events',
    description:
      'Weekly Saturday build battles, treasure hunts, boss raids, and Discord town halls with exclusive in-game titles.',
    category: 'Community',
    iconName: 'Trophy',
    showOnHome: true,
    order: 5,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'feat_staff',
    title: 'Friendly Staff',
    description:
      'Active, transparent moderation team committed to fair play, grief rollback support, and welcoming new players on Java and Bedrock.',
    category: 'Support',
    iconName: 'ShieldCheck',
    showOnHome: true,
    order: 6,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_STORIES: StoryItem[] = [
  {
    id: 'story_1',
    title: 'The Founding of PRO PLAYERS',
    dateLabel: 'January 2024',
    description:
      'Started by a tight-knit group of five survival builders and redstone engineers who wanted a lag-free, community-first realm without commercial clutter.',
    milestoneType: 'Founding Date',
    imageUrl: THEME_REFERENCE_ASSET,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'story_2',
    title: 'Sky Citadel & First 100 Community Members',
    dateLabel: 'June 2024',
    description:
      'Our build team completed the floating Sky Citadel spawn hub, welcoming our first 100 active players and launching the inaugural Summer Build Off.',
    milestoneType: 'Milestone',
    imageUrl: BUILD_CITADEL_ASSET,
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'story_3',
    title: 'Java + Bedrock Crossplay Unification',
    dateLabel: 'February 2025',
    description:
      'Opened our dedicated Bedrock gateway on port 19132 alongside our Java network on port 25565, uniting desktop, console, and mobile players.',
    milestoneType: 'Team History',
    imageUrl: BUILD_GARDENS_ASSET,
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'story_4',
    title: 'Subterranean Colosseum & Season IV Launch',
    dateLabel: 'September 2026',
    description:
      'Debuted the Obsidian PvP Colosseum, expanded the minigame rotation, and launched the official PRO PLAYERS community web portal.',
    milestoneType: 'Memorable Moment',
    imageUrl: BUILD_ARENA_ASSET,
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_RULES: RuleItem[] = [
  // 1. General Rules
  {
    id: 'rule_gen_1',
    title: 'Respect All Community Members & Staff',
    description:
      'Treat every player and staff member with respect. Harassment, discrimination, hate speech, personal attacks, and doxxing result in an immediate permanent ban.',
    category: 'General Rules' as RuleCategory,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_gen_2',
    title: 'Account Security & Alternate Account Policy',
    description:
      'You are responsible for all actions taken on your Minecraft account. Up to 2 accounts per household are allowed; using alt accounts to evade bans or farm rewards is strictly prohibited.',
    category: 'General Rules' as RuleCategory,
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_gen_3',
    title: 'Crossplay Fairness & No Real-Money Trading (RMT)',
    description:
      'Java and Bedrock players share the same unified worlds. Exploiting crossplay bugs or trading in-game items, coins, or accounts for real-world currency is strictly forbidden.',
    category: 'General Rules' as RuleCategory,
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },

  // 2. Building/Griefing Rules
  {
    id: 'rule_build_1',
    title: 'Zero Tolerance for Griefing, Stealing & Raiding',
    description:
      'Do not destroy, deface, or steal from claimed or unclaimed player builds, chests, or villager halls. Every block interaction is logged with CoreProtect for instant rollback.',
    category: 'Building/Griefing Rules' as RuleCategory,
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_build_2',
    title: 'Maintain Neighbor Buffers & Clean Landscapes',
    description:
      'Leave at least 64 blocks of buffer space around existing player bases unless invited to build together. Avoid leaving floating treetops, 1x1 cobblestone pillars, or lava casts.',
    category: 'Building/Griefing Rules' as RuleCategory,
    order: 5,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_build_3',
    title: 'Redstone & Lag-Friendly Farm Design',
    description:
      'All automated farms and redstone clocks must include an accessible on/off lever. Chunk-ban contraptions, excessive entity cramming, and intentional lag machines will be removed.',
    category: 'Building/Griefing Rules' as RuleCategory,
    order: 6,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },

  // 3. Chat & Behavior Etiquette
  {
    id: 'rule_chat_1',
    title: 'Keep Global Chat Clean, Welcoming & Spam-Free',
    description:
      'Avoid excessive profanity, character flooding, all-caps spam, or heated arguments in global chat. Help newcomers when they ask questions about commands or crossplay.',
    category: 'Chat & Behavior Etiquette' as RuleCategory,
    order: 7,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_chat_2',
    title: 'No Server Advertising or Malicious Links',
    description:
      'Do not advertise external Minecraft servers, unauthorized Discord invites, or suspicious links in public chat, signs, books, or private /msg whispers.',
    category: 'Chat & Behavior Etiquette' as RuleCategory,
    order: 8,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_chat_3',
    title: 'Respect Staff Guidance & Support Channels',
    description:
      'Do not impersonate staff or mini-mod aggressively in chat. To report a rule breaker or request a grief rollback, open a ticket in our official Discord server.',
    category: 'Chat & Behavior Etiquette' as RuleCategory,
    order: 9,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },

  // 4. PvP/Fair Play
  {
    id: 'rule_pvp_1',
    title: 'No Hacked Clients, X-Ray Packs, or Auto-Clickers',
    description:
      'Hacked clients (KillAura, Fly, Reach, Baritone), X-Ray resource packs, crystal macros, and auto-clickers are strictly banned. FPS mods like Sodium and OptiFine are welcome.',
    category: 'PvP/Fair Play' as RuleCategory,
    order: 10,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_pvp_2',
    title: 'Consensual Survival PvP & No TP-Trapping',
    description:
      'Outside designated PvP arenas (/warp arena), survival PvP must be mutually agreed upon. Unprovoked spawn-killing, bed-trapping, or /tpa kill traps are strictly forbidden.',
    category: 'PvP/Fair Play' as RuleCategory,
    order: 11,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'rule_pvp_3',
    title: 'No Combat-Logging or Duplication Exploits',
    description:
      'Disconnecting during active combat to avoid death is penalized automatically. Any discovered item duplication or economy glitch must be reported immediately to staff.',
    category: 'PvP/Fair Play' as RuleCategory,
    order: 12,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_COMMANDS: ServerCommandItem[] = [
  {
    id: 'cmd_spawn',
    command: '/spawn',
    category: 'Teleport',
    description: 'Teleport to the main spawn',
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_warp',
    command: '/warp',
    category: 'Teleport',
    description: 'Open available realm/world warps',
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_tpa',
    command: '/tpa [player]',
    category: 'Teleport',
    description: 'Send a teleport request to a friend',
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_home',
    command: '/home',
    category: 'Teleport',
    description: 'Go to your personal set home',
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_sethome',
    command: '/sethome',
    category: 'Teleport',
    description: 'Save your current location as home',
    order: 5,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_msg',
    command: '/msg [player]',
    category: 'Combat & Social',
    description: 'Send a private message',
    order: 6,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_tpaccept',
    command: '/tpaccept',
    category: 'Teleport',
    description: 'Accept an incoming teleport request from another player',
    order: 7,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_rtp',
    command: '/rtp',
    category: 'Teleport',
    description: 'Randomly teleport into unclaimed Survival wilderness to start building',
    order: 8,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_claim',
    command: '/claim',
    category: 'Survival & Land',
    description: 'Protect your land chunk against griefing, theft, and unauthorized PvP',
    order: 9,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_trust',
    command: '/trust [player]',
    category: 'Survival & Land',
    description: 'Grant a trusted friend or teammate building permissions inside your claim',
    order: 10,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_bal',
    command: '/bal',
    category: 'Economy',
    description: 'Check your current PRO PLAYERS coin balance and economy rank',
    order: 11,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'cmd_duel',
    command: '/duel [player]',
    category: 'Combat & Social',
    description: 'Challenge a player to a fair 1v1 kit match inside the PvP Colosseum',
    order: 12,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_JOIN_STEPS: JoinStepItem[] = [
  {
    id: 'join_java_1',
    edition: 'Java',
    stepNumber: 1,
    title: 'Launch Minecraft: Java Edition',
    description:
      'Open the official Minecraft Launcher on PC, Mac, or Linux and select version 1.20.4 through 1.21.x.',
    highlightText: 'Recommended: 1.21.x Vanilla or Fabric/Sodium',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'join_java_2',
    edition: 'Java',
    stepNumber: 2,
    title: 'Open Multiplayer & Add Server',
    description:
      'Click "Multiplayer" on the main menu, then click "Add Server" in the bottom right corner.',
    highlightText: 'Server Name: PRO PLAYERS',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'join_java_3',
    edition: 'Java',
    stepNumber: 3,
    title: 'Enter the Java Server IP',
    description:
      'Paste the Java IP address into the Server Address box and click Done to join immediately.',
    highlightText: 'play.proplayers.gg',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'join_bedrock_1',
    edition: 'Bedrock',
    stepNumber: 1,
    title: 'Launch Minecraft: Bedrock Edition',
    description:
      'Open Minecraft on Windows 10/11, iOS, Android, Xbox, PlayStation, or Nintendo Switch and sign in to your Microsoft account.',
    highlightText: 'Ensure you are updated to the latest release',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'join_bedrock_2',
    edition: 'Bedrock',
    stepNumber: 2,
    title: 'Navigate to Servers Tab',
    description:
      'Tap "Play", switch to the far-right "Servers" tab, scroll to the bottom, and tap "Add Server".',
    highlightText: 'Server Name: PRO PLAYERS',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'join_bedrock_3',
    edition: 'Bedrock',
    stepNumber: 3,
    title: 'Enter Bedrock IP & Port 19132',
    description:
      'Enter the Bedrock server address and verify that the Port field is set to 19132.',
    highlightText: 'Address: bedrock.proplayers.gg · Port: 19132',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_FAQS: FaqItem[] = [
  {
    id: 'faq_1',
    question: 'Why does the server status sometimes show Offline?',
    answer:
      'PRO PLAYERS utilizes free community hosting. To conserve resources when no players are active, the server may occasionally enter standby or offline mode. Check our Discord #server-status channel to request a wake-up or see scheduled maintenance windows.',
    category: 'Hosting & Status',
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'faq_2',
    question: 'Which Minecraft versions and editions are supported?',
    answer:
      'We support both Minecraft: Java Edition (1.20.4 – 1.21.x) and Minecraft: Bedrock Edition (latest release on port 19132). Both editions play together in the same worlds via GeyserMC & Floodgate.',
    category: 'Compatibility',
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'faq_3',
    question: 'Are client mods or resource packs allowed?',
    answer:
      'Yes! Optimization mods (Sodium, Lithium, Iris, OptiFine), minimaps WITHOUT cave/entity radar, and aesthetic shader/resource packs are allowed. Any mod providing unfair combat, movement, or X-Ray advantage is strictly prohibited.',
    category: 'Mods & Packs',
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'faq_4',
    question: 'Is PRO PLAYERS completely free to play?',
    answer:
      '100% free to play. We do not sell pay-to-win ranks, loot crates, or paid stat boosts. Every rank badge and leaderboard spot is earned through community participation and skill.',
    category: 'Free-to-Play',
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'faq_5',
    question: 'How do I report griefing, bugs, or rule breakers?',
    answer:
      'Join our official Discord server and open a support ticket in #help-desk with coordinates and screenshots, or message an online Moderator directly in-game.',
    category: 'Support',
    order: 5,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_GAME_MODES: GameModeItem[] = [
  {
    id: 'mode_survival',
    name: 'Emerald Frontier SMP',
    description:
      'Classic cooperative survival with player-run market stalls, land claiming, custom boss shrines, and seasonal world wonders.',
    accessCommand: '/warp survival',
    iconName: 'Compass',
    imageUrl: THEME_REFERENCE_ASSET,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'mode_pvp',
    name: 'Obsidian Colosseum PvP',
    description:
      'Competitive 1v1, 2v2, and Free-For-All arenas featuring balanced Diamond, Netherite, and Archer kits with instant health regen.',
    accessCommand: '/warp arena',
    iconName: 'Swords',
    imageUrl: BUILD_ARENA_ASSET,
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'mode_creative',
    name: 'Architect Sky Plots',
    description:
      'Generous 128x128 creative plots with biome switching and builder tools for testing redstone and designing showcase builds.',
    accessCommand: '/warp creative',
    iconName: 'Hammer',
    imageUrl: BUILD_CITADEL_ASSET,
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'mode_minigames',
    name: 'Elysium Party Arcade',
    description:
      'Rotating mini-games including Spleef Arenas, TNT Tag, Parkour Towers, and Elytra Ring Trials.',
    accessCommand: '/warp arcade',
    iconName: 'Gamepad2',
    imageUrl: BUILD_GARDENS_ASSET,
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_LEADERBOARDS: LeaderboardEntryItem[] = [
  {
    id: 'lb_pvp_1',
    category: 'PvP Master',
    rank: 1,
    minecraftUsername: 'VortexBlade_',
    statLabel: 'Arena Duels Won',
    statValue: '412 Wins · 89% WR',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'lb_pvp_2',
    category: 'PvP Master',
    rank: 2,
    minecraftUsername: 'NetherKnight99',
    statLabel: 'Arena Duels Won',
    statValue: '368 Wins · 84% WR',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'lb_pvp_3',
    category: 'PvP Master',
    rank: 3,
    minecraftUsername: 'CrimsonAegis',
    statLabel: 'Arena Duels Won',
    statValue: '319 Wins · 79% WR',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'lb_build_1',
    category: 'Master Builder',
    rank: 1,
    minecraftUsername: 'AetheriusMC',
    statLabel: 'Featured Mega Builds',
    statValue: '14 Showcase Awards',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'lb_mini_1',
    category: 'Minigame Champion',
    rank: 1,
    minecraftUsername: 'SwiftParkour',
    statLabel: 'Arcade Tournament Crowns',
    statValue: '94 Crowns',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'lb_time_1',
    category: 'Play Time Legend',
    rank: 1,
    minecraftUsername: 'RedstoneSage',
    statLabel: 'Active Community Hours',
    statValue: '1,240 Hours',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_STAFF: StaffMemberItem[] = [
  {
    id: 'staff_1',
    minecraftUsername: 'ProFounder_MC',
    roleTitle: 'Owner',
    bio: 'Lead network architect and founder of PRO PLAYERS. Oversees server infrastructure, crossplay stability, and community vision.',
    discordHandle: 'profounder#0001',
    avatarUrl: OFFICIAL_LOGO_ASSET,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'staff_2',
    minecraftUsername: 'ValkyrieAdmin',
    roleTitle: 'Admin',
    bio: 'Head of community operations, event scheduling, and anti-cheat integrity across Java and Bedrock realms.',
    discordHandle: 'valkyrie_admin',
    avatarUrl: '',
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'staff_3',
    minecraftUsername: 'SentinelMod',
    roleTitle: 'Moderator',
    bio: 'Senior moderator specializing in CoreProtect grief rollbacks, fair duel refereeing, and player support tickets.',
    discordHandle: 'sentinel_mod',
    avatarUrl: '',
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_GALLERY: GalleryItem[] = [
  {
    id: 'gal_1',
    title: 'Aetherial Sky Citadel Spawn Hub',
    category: 'Spawn & Hubs',
    builderCredit: 'AetheriusMC & LunaBlocks',
    description:
      'Constructed atop floating stone cliffs with cyan crystal spires, warm lantern promenades, and portal chambers connecting all server realms.',
    completionDate: 'June 2024',
    imageUrl: BUILD_CITADEL_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'gal_2',
    title: 'Subterranean Obsidian PvP Colosseum',
    category: 'PvP Arenas',
    builderCredit: 'StonecraftPro & VortexBlade_',
    description:
      'Carved inside a massive underground cavern surrounded by flowing magma channels, obsidian arches, and emerald crystal braziers.',
    completionDate: 'September 2026',
    imageUrl: BUILD_ARENA_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'gal_3',
    title: 'Elysium Sanctuary & Bioluminescent Gardens',
    category: 'Survival Wonders',
    builderCredit: 'LunaBlocks & KiraGuides',
    description:
      'A serene survival sanctuary nestled beneath giant glowing trees and terraced waterfalls, built 100% in survival mode.',
    completionDate: 'March 2026',
    imageUrl: BUILD_GARDENS_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test_1',
    minecraftUsername: 'RedstoneSage',
    quote:
      'Best survival community I have joined in years. People actually collaborate on community towns and the staff resolves tickets within minutes.',
    rating: 5,
    playingSince: 'February 2024',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'test_2',
    minecraftUsername: 'FrostByte_MC',
    quote:
      'I play on Bedrock from my tablet while my brother plays on Java PC, and crossplay works seamlessly in both survival and the minigame arcade.',
    rating: 5,
    playingSince: 'March 2025',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'test_3',
    minecraftUsername: 'LunaBlocks',
    quote:
      'Zero pay-to-win nonsense and an inspiring group of builders. The weekend build battles are always the highlight of my week.',
    rating: 5,
    playingSince: 'June 2024',
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_EVENTS: CommunityEventItem[] = [
  {
    id: 'evt_1',
    title: 'Obsidian Colosseum 2v2 Championship',
    eventDate: 'October 24, 2026',
    eventTime: '18:00 UTC',
    description:
      'Form a two-player squad and compete in double-elimination Netherite kit matches inside the Subterranean Colosseum. All Java and Bedrock players welcome.',
    prize: 'Champion Chat Title + Trophy Head + Hall of Fame Plaque',
    discordLink: 'https://discord.gg/proplayers',
    isPast: false,
    winnerSummary: '',
    imageUrl: BUILD_ARENA_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'evt_2',
    title: 'Autumn Floating Island Build Battle',
    eventDate: 'November 7, 2026',
    eventTime: '17:00 UTC',
    description:
      '90-minute creative build challenge where solo builders or duos design a mystical floating sanctuary on a 64x64 sky plot.',
    prize: 'Master Architect Badge + Featured Spot on Home Gallery',
    discordLink: 'https://discord.gg/proplayers',
    isPast: false,
    winnerSummary: '',
    imageUrl: BUILD_CITADEL_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'evt_3',
    title: 'Elysium Parkour & Elytra Grand Prix',
    eventDate: 'September 19, 2026',
    eventTime: '18:00 UTC',
    description:
      'Three-stage checkpoint race through the Bioluminescent Gardens and cavern rings.',
    prize: 'Grand Prix Wings Cosmetic & Leaderboard Crown',
    discordLink: 'https://discord.gg/proplayers',
    isPast: true,
    winnerSummary:
      '1st Place: SwiftParkour (04:12.8) · 2nd Place: SolarisCraft (04:19.4) · 3rd Place: FrostByte_MC (04:27.1)',
    imageUrl: BUILD_GARDENS_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_NEWS: NewsArticleItem[] = [
  {
    id: 'news_1',
    title: 'Season IV Update: Subterranean Colosseum & Crossplay Enhancements',
    publishDate: 'October 10, 2026',
    authorName: 'ProFounder_MC',
    category: 'Server Update',
    summary:
      'Welcome to Season IV of PRO PLAYERS! Explore the newly opened Obsidian PvP Colosseum, updated Geyser crossplay support for 1.21.x, and our brand-new community portal.',
    content:
      'Welcome to Season IV on PRO PLAYERS!\n\nOur build and technical teams have spent the past month preparing our largest quality-of-life update yet:\n\n1. Subterranean Obsidian Colosseum: Accessible via /warp arena, featuring dedicated 1v1 duel queues and spectator balconies.\n2. Java & Bedrock 1.21.x Parity: Updated Geyser and Floodgate bridges ensure lower latency for mobile and console Bedrock players connecting on port 19132.\n3. Expanded Land Claim Blocks: Active survival players now earn +25% bonus claim blocks per hour of active building.\n\nRemember that because we utilize free hosting, if the server is ever in standby mode, simply ping our automated wake-up channel on Discord!',
    imageUrl: BUILD_ARENA_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'news_2',
    title: 'Community Build Spotlight: Elysium Sanctuary Completed',
    publishDate: 'September 28, 2026',
    authorName: 'AetheriusMC',
    category: 'Community Spotlight',
    summary:
      'Take a tour of the Elysium Sanctuary & Bioluminescent Gardens built collaboratively in survival mode over six weeks.',
    content:
      'Congratulations to LunaBlocks, KiraGuides, and the 14 survival contributors who gathered over 180,000 stone, dark oak, and sea lantern blocks to complete the Elysium Sanctuary!\n\nYou can visit the sanctuary in-game using /warp sanctuary or inspect high-resolution screenshots in the Community Build Gallery. Our next collaborative town project begins next Friday—join the #builders-guild channel on Discord to claim a plot.',
    imageUrl: BUILD_GARDENS_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'news_3',
    title: 'Fair Play Reminder & Client Optimization Guide',
    publishDate: 'September 12, 2026',
    authorName: 'ValkyrieAdmin',
    category: 'Announcements',
    summary:
      'A quick refresher on approved performance mods (Sodium, Lithium, Iris) and our zero-tolerance policy for unfair macros.',
    content:
      'At PRO PLAYERS, keeping survival and arena combat fair for both Java and Bedrock players is our top priority.\n\nApproved Mods:\n- Frame-rate boosters: Sodium, Lithium, FerriteCore, OptiFine\n- Visuals: Iris Shaders, Continuity, fullbright resource packs\n\nProhibited Modifications:\n- Auto-clickers, macro keys, X-Ray packs, cave finders, and movement hacks.\n\nIf you ever have a question about whether a specific Fabric or Forge mod is allowed, open a quick ticket on Discord before joining!',
    imageUrl: BUILD_CITADEL_ASSET,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'soc_discord',
    platform: 'Discord',
    label: 'Official PRO PLAYERS Discord',
    url: 'https://discord.gg/proplayers',
    description:
      'Our primary community hub! Join for live server wake-up requests, voice channels, tournament signups, support tickets, and trading.',
    colorHex: '#5865F2',
    isPrimary: true,
    order: 1,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'soc_youtube',
    platform: 'YouTube',
    label: 'PRO PLAYERS YouTube Channel',
    url: 'https://youtube.com/@proplayersmc',
    description:
      'Watch cinematic build timelapses, PvP tournament highlights, and Season IV update trailers.',
    colorHex: '#EF4444',
    isPrimary: false,
    order: 2,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'soc_instagram',
    platform: 'Instagram',
    label: 'PRO PLAYERS Instagram',
    url: 'https://instagram.com/proplayersmc',
    description:
      'Daily shader screenshots, player build spotlights, and quick event reminders.',
    colorHex: '#EC4899',
    isPrimary: false,
    order: 3,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'soc_facebook',
    platform: 'Facebook',
    label: 'PRO PLAYERS Community Page',
    url: 'https://facebook.com/proplayersmc',
    description:
      'Connect with fellow Minecraft players, share survival stories, and follow major community announcements.',
    colorHex: '#3B82F6',
    isPrimary: false,
    order: 4,
    published: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

// Helper for Admins to seed all default data into Cloud Firestore
export async function seedDatabaseToFirestore(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Site Settings
  try {
    const { id: _id, ...settingsData } = DEFAULT_SITE_SETTINGS;
    await setDoc(doc(db, 'site_settings', 'main'), {
      ...settingsData,
      updatedAt: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
  }

  // Helper to seed a list of documents in parallel
  async function seedCollection<T extends { id: string }>(
    colName: string,
    items: T[]
  ) {
    await Promise.all(
      items.map(async (item) => {
        const { id, ...rest } = item;
        try {
          await setDoc(doc(db, colName, id), {
            ...rest,
            updatedAt: now,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `${colName}/${id}`);
        }
      })
    );
  }

  await Promise.all([
    seedCollection('features', SEED_FEATURES),
    seedCollection('stories', SEED_STORIES),
    seedCollection('rules', SEED_RULES),
    seedCollection('commands', SEED_COMMANDS),
    seedCollection('join_steps', SEED_JOIN_STEPS),
    seedCollection('faqs', SEED_FAQS),
    seedCollection('game_modes', SEED_GAME_MODES),
    seedCollection('leaderboards', SEED_LEADERBOARDS),
    seedCollection('staff', SEED_STAFF),
    seedCollection('gallery', SEED_GALLERY),
    seedCollection('testimonials', SEED_TESTIMONIALS),
    seedCollection('events', SEED_EVENTS),
    seedCollection('news', SEED_NEWS),
    seedCollection('social_links', SEED_SOCIAL_LINKS),
  ]);
}
