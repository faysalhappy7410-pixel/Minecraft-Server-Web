export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  minecraftUsername: string;
  discordUsername: string;
  bio: string;
  instagramUrl: string;
  facebookUrl: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPlayerProfile {
  uid: string;
  minecraftUsername: string;
  bio: string;
  avatarUrl?: string;
  discordUsername?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  badges?: string[];
}

export type GlobalAnnouncementType = 'news' | 'maintenance' | 'event' | 'alert';

export interface SiteSettings {
  id?: string;
  siteName: string;
  tagline: string;
  description: string;
  officialLogoUrl: string;
  themeReferenceUrl: string;
  backgroundImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  javaHost: string;
  javaPort: number;
  bedrockHost: string;
  bedrockPort: number;
  minecraftVersion: string;
  discordUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  announcementEnabled?: boolean;
  announcementType?: GlobalAnnouncementType;
  announcementTitle?: string;
  announcementMessage?: string;
  announcementLinkText?: string;
  announcementLinkUrl?: string;
  customizedCollections?: Record<string, boolean>;
  published: boolean;
  updatedAt: string;
}

export interface StoryItem {
  id: string;
  title: string;
  dateLabel: string;
  description: string;
  milestoneType: string;
  imageUrl: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleCategory =
  | 'General Rules'
  | 'Building/Griefing Rules'
  | 'Chat & Behavior Etiquette'
  | 'PvP/Fair Play'
  | 'General'
  | 'PvP'
  | 'Building'
  | 'Chat'
  | 'Prohibited Activities';

export interface RuleItem {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommandCategory =
  | 'Teleport'
  | 'Survival & Land'
  | 'Economy'
  | 'Combat & Social'
  | 'General';

export interface ServerCommandItem {
  id: string;
  command: string;
  category: CommandCategory;
  description: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JoinStepItem {
  id: string;
  edition: 'Java' | 'Bedrock';
  stepNumber: number;
  title: string;
  description: string;
  highlightText: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  category: string;
  iconName: string;
  showOnHome: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameModeItem {
  id: string;
  name: string;
  description: string;
  accessCommand: string;
  iconName: string;
  imageUrl: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LeaderboardCategory =
  | 'PvP Master'
  | 'Master Builder'
  | 'Minigame Champion'
  | 'Play Time Legend'
  | 'Community Helper'
  | 'Event Winner';

export interface LeaderboardEntryItem {
  id: string;
  category: LeaderboardCategory;
  rank: number;
  minecraftUsername: string;
  statLabel: string;
  statValue: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StaffRoleTitle = 'Owner' | 'Admin' | 'Moderator' | 'Builder' | 'Helper';

export interface StaffMemberItem {
  id: string;
  minecraftUsername: string;
  roleTitle: StaffRoleTitle;
  bio: string;
  discordHandle: string;
  avatarUrl: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  builderCredit: string;
  description: string;
  completionDate: string;
  imageUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialItem {
  id: string;
  minecraftUsername: string;
  quote: string;
  rating: number;
  playingSince: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityEventItem {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  description: string;
  prize: string;
  discordLink: string;
  isPast: boolean;
  winnerSummary: string;
  imageUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticleItem {
  id: string;
  title: string;
  publishDate: string;
  authorName: string;
  category: string;
  summary: string;
  content: string;
  imageUrl: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  label: string;
  url: string;
  description: string;
  colorHex: string;
  isPrimary: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveServerStatus {
  online: boolean;
  host: string;
  port: number;
  playersOnline: number;
  playersMax: number;
  version: string;
  motdClean: string;
  lastCheckedAt: string;
  error?: string;
}
