# PRO PLAYERS — Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Unmatched paths (`/{document=**}`) deny all read and write access (`allow read, write: if false;`).
2. **PII Isolation (`users/{userId}`)**:
   - User documents store `email` (PII) and `role` (RBAC).
   - `get` is strictly limited to `isOwner(userId) || isAdmin()`.
   - `list` is strictly limited to `resource.data.uid == request.auth.uid || isAdmin()`. Blanket `isSignedIn()` reads on `users` are forbidden.
3. **Self-Assigned Role Prevention**:
   - On `users/{userId}` creation, `incoming().role == 'user'` is strictly enforced unless `isAdmin()`.
   - On `users/{userId}` update by a non-admin owner, `incoming().role == existing().role`, `incoming().uid == existing().uid`, `incoming().email == existing().email`, and `incoming().createdAt == existing().createdAt` are enforced along with `affectedKeys().hasOnly(...)`.
4. **CMS Published Filtering & Admin-Only Mutations**:
   - All 14 CMS collections (`site_settings`, `stories`, `rules`, `join_steps`, `faqs`, `features`, `game_modes`, `leaderboards`, `staff`, `gallery`, `testimonials`, `events`, `news`, `social_links`) allow `get` and `list` only when `resource.data.published == true || isAdmin()`.
   - Only `isAdmin()` can `create`, `update`, or `delete` documents in any CMS collection, and every `create`/`update` must pass its strict `isValid[Entity](incoming())` schema validator.
5. **Path Variable & String Size Hardening**:
   - Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
   - Every string field enforces `.size()` bounds matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Privilege Escalation on Registration**: Authenticated non-admin creates `/users/{uid}` with `"role": "admin"` -> `PERMISSION_DENIED`.
2. **Role Mutation on Profile Update**: Authenticated user updates `/users/{uid}` changing `"role": "admin"` -> `PERMISSION_DENIED`.
3. **PII Leak via User Get**: Authenticated user `uid_A` reads `/users/uid_B` -> `PERMISSION_DENIED`.
4. **PII Scraping via User List**: Unauthenticated or non-admin user queries `/users` without owner filter -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on User Profile**: User updates `/users/{uid}` with extra field `"isVerified": true` -> `PERMISSION_DENIED`.
6. **Email Mutation by User**: User updates `/users/{uid}` attempting to change `"email"` or `"createdAt"` -> `PERMISSION_DENIED`.
7. **Invalid Minecraft Username Format**: User creates/updates `/users/{uid}` with `"minecraftUsername": "bad name!@#"` -> `PERMISSION_DENIED`.
8. **Unauthorized CMS Write**: Normal signed-in user attempts to `create` or `update` `/news/article_1` -> `PERMISSION_DENIED`.
9. **Unpublished CMS Read**: Unauthenticated visitor or normal user attempts to read `/news/draft_1` where `published == false` -> `PERMISSION_DENIED`.
10. **Denial-of-Wallet Oversized Bio**: User updates `/users/{uid}` with a 10,000-character `bio` (exceeding max 500) -> `PERMISSION_DENIED`.
11. **Malformed Document ID Poisoning**: Request attempts to create `/stories/bad$id!@#` -> `PERMISSION_DENIED`.
12. **CMS Update Missing Required Schema Keys**: Admin updates `/rules/rule_1` with `"order": "not_a_number"` -> `PERMISSION_DENIED`.
