/**
 * PRO PLAYERS — Firestore Security Rules Verification Specification
 * Verifies that all "Dirty Dozen" adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation on Registration (role = admin)',
    operation: 'create',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: false },
    payload: {
      uid: 'user_123',
      email: 'player@example.com',
      firstName: 'Alex',
      minecraftUsername: 'AlexBuilder',
      discordUsername: '',
      bio: '',
      instagramUrl: '',
      facebookUrl: '',
      role: 'admin',
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role Mutation on Profile Update',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      role: 'admin',
      updatedAt: '2026-10-10T01:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'PII Leak via Cross-User Get',
    operation: 'get',
    path: '/users/user_other_456',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Scraping via Unfiltered User List',
    operation: 'list',
    path: '/users',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on User Profile',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      firstName: 'Alex',
      isVerified: true,
      updatedAt: '2026-10-10T01:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Email Mutation by User',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      email: 'spoofed@example.com',
      updatedAt: '2026-10-10T01:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid Minecraft Username Format',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      minecraftUsername: 'invalid name!@#',
      updatedAt: '2026-10-10T01:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized CMS Write by Standard User',
    operation: 'create',
    path: '/news/article_1',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      title: 'Hacked News',
      publishDate: '2026-10-10',
      authorName: 'Attacker',
      category: 'Announcement',
      summary: 'Summary',
      content: 'Content',
      imageUrl: '',
      published: true,
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unpublished CMS Read by Public Visitor',
    operation: 'get',
    path: '/news/draft_article_1',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet Oversized Bio Payload',
    operation: 'update',
    path: '/users/user_123',
    auth: { uid: 'user_123', email: 'player@example.com', email_verified: true },
    payload: {
      bio: 'A'.repeat(1000),
      updatedAt: '2026-10-10T01:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Malformed Document ID Poisoning',
    operation: 'create',
    path: '/stories/bad$id!@#',
    auth: { uid: 'admin_1', email: 'faysalhappy7410@gmail.com', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'CMS Update with Invalid Type',
    operation: 'update',
    path: '/rules/rule_1',
    auth: { uid: 'admin_1', email: 'faysalhappy7410@gmail.com', email_verified: true },
    payload: {
      order: 'not_a_number',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
