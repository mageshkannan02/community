# Nexus Community Platform Frontend

Modern, high-performance community frontend built with **Next.js 16 (App Router)** and **React 19**, tailored specifically for the Express + Prisma backend at `../community_platform_backend`.

---

## 🌟 Key Features

- **Full Backend API Parity**:
  - **Authentication**: JWT login, registration, token refresh, and user session management (`/api/v1/auth/*`).
  - **Communities Hub**: List, explore, search, filter, and create communities (`/api/v1/communities/*`).
  - **Community Following**: Real-time follow/unfollow and follower counts (`/api/v1/community-followers/*`).
  - **Discussions & Forum**: Community discussions feed, pinned topics, and discussion detail views (`/api/v1/discussions/*`).
  - **Threaded Replies**: Interactive discussion replies composer and real-time reply stream (`/api/v1/discussion-replies/*`).
  - **User Profiles**: Profile views, role badges (Admin, Moderator, Member), and bio editor.
- **Dual Live & Preview Engine**:
  - Connects directly to `http://localhost:3000/api/v1` when the backend is running.
  - Automatically activates high-fidelity local demo fallback when the backend is offline so developers can test UI immediately without crashes.
  - One-click health check and backend reconnect button in the top navbar.
  - One-click demo profile switcher (Alex Rivera, Dr. Sarah Chen, Marcus Vance).
- **Design & UX**:
  - Dark-mode glassmorphic theme with glowing ambient accents, smooth transitions, and responsive mobile-first layouts.
  - Toast notification system for instant feedback on user actions.

---

## 🚀 Getting Started

### 1. Run the Backend (Express + Prisma)

In a separate terminal:
```bash
cd ..\community_platform_backend
npm start
```
The backend server runs on `http://localhost:3000`.

### 2. Run the Frontend (Next.js)

In this directory:
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

> **Note**: The frontend is pre-configured to run on port `3001` so it never conflicts with the backend running on port `3000`.

---

## 📁 Project Architecture

- `app/`
  - `page.tsx`: Homepage with hero banner, category pills, search bar, community grid, and discussion feed.
  - `communities/[id]/page.tsx`: Community hub with cover banner, statistics, discussions list, member directory, and discussion composer.
  - `communities/[id]/discussions/[discussionId]/page.tsx`: Discussion thread page with full post view and replies composer.
  - `login/page.tsx`: Sign-in screen with JWT integration and 1-click test profiles.
  - `register/page.tsx`: User registration form.
  - `profile/page.tsx`: User profile management and followed spaces.
- `app/lib/`
  - `api.ts`: API client with JWT header injection, response parsing, and offline fallback.
  - `auth-context.tsx`: Auth state provider (login, register, logout, user session).
  - `toast-context.tsx`: Global toast notifications.
  - `demo-data.ts`: Mock initial state matching Prisma schema.
  - `types.ts`: TypeScript interfaces mirroring backend models.
- `app/components/`
  - `Navbar.tsx`: Sticky navigation bar with live API status, search, and user menu.
  - `CommunityCard.tsx`: Community card with follow button and stats.
  - `DiscussionCard.tsx`: Discussion thread preview with tags and replies count.
  - `CreateCommunityModal.tsx`: Modal for creating communities with banner presets.
  - `CreateDiscussionModal.tsx`: Modal for starting discussions.
