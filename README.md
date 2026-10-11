# PRO PLAYERS — Official Minecraft Server Community Web Application

**PRO PLAYERS** is a production-ready, cross-platform Minecraft server community web application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Firebase Authentication**, **Cloud Firestore**, and **Firebase Storage**.

---

## Key Features

- **Live Java & Bedrock Server Status**: Separate real-time status checks via `mcstatus.io` (`https://api.mcstatus.io/v2/status/java/{host}:{port}` and `https://api.mcstatus.io/v2/status/bedrock/{host}:{port}`) with 60-second refresh throttling, manual refresh button, copyable IP buttons, and graceful standby/offline handling.
- **Complete Information Hub**: Server Story timeline, categorized Server Rules (`General`, `PvP`, `Building`, `Chat`, `Prohibited Activities`), side-by-side Java (`25565`) & Bedrock (`19132`) connection guide, playable Game Modes with copyable commands, detailed Features, and interactive FAQ accordion.
- **Community Showcase**: Admin-curated Leaderboards across 6 competitive tabs (`PvP Master`, `Master Builder`, `Minigame Champion`, `Play Time Legend`, `Community Helper`, `Event Winner`), Build Gallery with accessible keyboard-friendly Lightbox, Upcoming & Past Events, News & Updates reader modal, Team/Staff roster, Player Testimonials, and safe Public Player Profile Cards.
- **Email/Password Authentication & Private Profiles**: Registration, Login, Logout, Forgot Password, and Email Verification using Firebase Auth. Users can edit only their own profile fields; `role` is strictly locked to `"user"` on sign-up and private email addresses are never exposed publicly.
- **Role-Protected Admin CMS (`/admin`)**: Full Create, Read, Update, Delete (CRUD) with delete-confirmation modals for all 14 CMS collections, Firebase Storage image uploads, and dynamic Site Settings for replacing the Official Website Logo, Theme Reference Image, background image, and accent colors.

---

## 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create or select your Firebase project.
2. Register a **Web App** in Project Settings and copy your Firebase configuration values.
3. Copy `.env.example` to `.env` (for local development) or configure the environment variables in your hosting dashboard:
   ```env
   VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
   VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
   VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
   VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
   VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
   VITE_ADMIN_EMAIL_TO_SET_MANUALLY="ADMIN_EMAIL_TO_SET_MANUALLY"
   ```

---

## 2. Enabling Email/Password Authentication

1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Navigate to **Build > Authentication > Sign-in method**.
3. Click **Add new provider** (or select **Email/Password**), toggle **Enable**, and click **Save**.
   *(Note: Do not enable anonymous sign-in or unrequested social providers.)*

---

## 3. Firestore and Storage Setup

1. In the Firebase Console, navigate to **Build > Firestore Database** and create your database in production mode.
2. Navigate to **Build > Storage** and click **Get started** to initialize your default Firebase Storage bucket.
3. All 15 Firestore collections used by the app are documented in `firebase-blueprint.json`:
   - `users`, `site_settings`, `stories`, `rules`, `join_steps`, `faqs`, `features`, `game_modes`, `leaderboards`, `staff`, `gallery`, `testimonials`, `events`, `news`, `social_links`.

---

## 4. How to Set the First Admin Safely (`ADMIN_EMAIL_TO_SET_MANUALLY`)

Users can **never** select, assign, or upgrade their own role from the public UI. Every newly registered account is strictly assigned `role: "user"`.

To set your own account as the administrator:
1. Register a normal account on the website at `/register` using your owner email (`ADMIN_EMAIL_TO_SET_MANUALLY`).
2. Open **Firebase Console > Firestore Database > Data**.
3. Open the `users` collection and click your user document (`users/{your_uid}`).
4. Edit the `role` field from `"user"` to `"admin"` and click **Update**.
5. Refresh the website—you will now see the **Admin** link in the navbar and have full access to `/admin`.
6. Inside `/admin`, click **"Initialize & Seed Default Content to Firestore"** on the Dashboard tab to populate all 14 CMS collections with the starter records.

---

## 5. How to Configure Java & Bedrock Status Values

1. Sign in as an admin and navigate to `/admin` &rarr; **Site Settings & Theme**.
2. Under **Java & Bedrock Live Status Endpoints (mcstatus.io)**, set:
   - **Java Host**: e.g. `play.proplayers.gg`
   - **Java Port**: `25565` (default) or your custom Java port
   - **Bedrock Host**: e.g. `bedrock.proplayers.gg`
   - **Bedrock Port**: `19132` (default) or your custom Bedrock port
3. Click **Save Site Settings**. The Home page and Information page will immediately use these values to query:
   - Java: `https://api.mcstatus.io/v2/status/java/{javaHostOrHostPort}`
   - Bedrock: `https://api.mcstatus.io/v2/status/bedrock/{bedrockHostOrHostPort}`

---

## 6. How to Deploy Firestore & Storage Security Rules

Security rules are located in the project root:
- **Firestore Rules**: `/firestore.rules`
- **Storage Rules**: `/storage.rules`

To validate and deploy them using the Firebase CLI:
```bash
# Validate Firestore rules with ESLint
npx eslint firestore.rules

# Deploy Firestore and Storage security rules
firebase deploy --only firestore:rules,storage
```

---

## 7. How to Sync to GitHub

1. Ensure `.env` is listed in `.gitignore` so private environment files are never committed.
2. Initialize and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial release of PRO PLAYERS community web application"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pro-players-web.git
   git push -u origin main
   ```

---

## 8. How to Deploy the Frontend to Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages > Create application > Pages > Connect to Git**.
2. Select your GitHub repository.
3. Configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add your `VITE_FIREBASE_*` environment variables under **Environment variables**.
5. For SPA routing compatibility on Cloudflare Pages, create a `public/_redirects` file (already included in `/public/_redirects`) with `/* /index.html 200`.
6. Click **Save and Deploy**.

---

## 9. How to Replace the Theme Reference Image and Official Website Logo

1. Log in with your admin account and navigate to `/admin` &rarr; **Site Settings & Theme**.
2. Under **1. Official Website Logo & Theme Reference Images**:
   - **Official Website Logo**: Paste a new URL or click **Upload New Logo** to upload directly to Firebase Storage (`cms/branding/...`). This updates the logo in the navbar, hero section, footer, login/register screens, profile header, and browser favicon.
   - **Theme Reference Image**: Paste a new URL or click **Upload Theme Reference** to update the visual identity showcase image.
   - **Site Background Image**: Upload or paste a new full-page background texture; the site automatically maintains a high-contrast dark scrim overlay so text remains crisp and readable.
3. Optionally adjust the **Primary Accent Color** and **Secondary Glow Color** pickers, then click **Save Site Settings**.
