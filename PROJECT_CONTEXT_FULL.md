# Nexus Community Platform — Complete Technical & Architectural Documentation

> **Document Type:** Full Project Context, Feature Catalog & Technical Architecture Specification  
> **Project Name:** Nexus Community Platform  
> **Repository:** `community_platform_frontend` & `community_platform_backend`  
> **Frameworks:** Next.js 16 (App Router) + React 19 (Frontend) | Express.js 5 + TypeScript + Prisma 7 (Backend)  
> **Database:** PostgreSQL (with Redis Caching & AWS S3 Object Storage)  
> **Last Updated:** October 2026  

---

## 📑 Table of Contents

1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [High-Level Architecture & Dual-Mode Runtime Engine](#2-high-level-architecture--dual-mode-runtime-engine)
3. [Technology Stack & Dependency Encyclopedia](#3-technology-stack--dependency-encyclopedia)
4. [Complete Directory & File Anatomy](#4-complete-directory--file-anatomy)
5. [Prisma Database Schema & Relational Data Models](#5-prisma-database-schema--relational-data-models)
6. [Deep-Dive Feature Specifications (17 Comprehensive Modules)](#6-deep-dive-feature-specifications)
   - [Feature 1: Authentication, Identity & Session Management](#feature-1-authentication-identity--session-management)
   - [Feature 2: Community Workspaces & Lifecycle Management](#feature-2-community-workspaces--lifecycle-management)
   - [Feature 3: Community Member Governance & Administrative Access Controls](#feature-3-community-member-governance--administrative-access-controls)
   - [Feature 4: Technical Discussions & Hierarchical Nested Replies](#feature-4-technical-discussions--hierarchical-nested-replies)
   - [Feature 5: Technical Events, AMAs & RSVP Attendance System](#feature-5-technical-events-amas--rsvp-attendance-system)
   - [Feature 6: Real-Time Community Polls & Voting Analytics](#feature-6-real-time-community-polls--voting-analytics)
   - [Feature 7: Multi-Question Community Surveys & Form Aggregations](#feature-7-multi-question-community-surveys--form-aggregations)
   - [Feature 8: Community Resource Repository & Asset Distribution](#feature-8-community-resource-repository--asset-distribution)
   - [Feature 9: Broadcast Announcements & Maintainer Alerts](#feature-9-broadcast-announcements--maintainer-alerts)
   - [Feature 10: AI Technical Copilot & Interactive Assistant](#feature-10-ai-technical-copilot--interactive-assistant)
   - [Feature 11: Semantic Vector Search & Similarity Matcher](#feature-11-semantic-vector-search--similarity-matcher)
   - [Feature 12: Automated Post Classification & Urgency Engine](#feature-12-automated-post-classification--urgency-engine)
   - [Feature 13: Duplicate Question Detection & Knowledge De-duplication](#feature-13-duplicate-question-detection--knowledge-de-duplication)
   - [Feature 14: Verified Solutions System & Expert Attribution](#feature-14-verified-solutions-system--expert-attribution)
   - [Feature 15: Unanswered Questions Triage & Community Health Queue](#feature-15-unanswered-questions-triage--community-health-queue)
   - [Feature 16: User Profiles, Social Graph & Bookmarking](#feature-16-user-profiles-social-graph--bookmarking)
   - [Feature 17: Platform Administration & Role-Based Access Control (RBAC)](#feature-17-platform-administration--role-based-access-control-rbac)
7. [Complete Backend API Specification (Exhaustive Endpoint Catalog)](#7-complete-backend-api-specification)
8. [Backend Controllers, Services & Middlewares](#8-backend-controllers-services--middlewares)
9. [Role-Based Access Control (RBAC) Matrix & Permission Logic](#9-role-based-access-control-rbac-matrix--permission-logic)
10. [Background Scheduled Tasks (Cron Jobs)](#10-background-scheduled-tasks-cron-jobs)
11. [Frontend Interactive Widgets & Component Breakdown](#11-frontend-interactive-widgets--component-breakdown)
12. [State Management, Authentication & Context Providers](#12-state-management-authentication--context-providers)
13. [API Client, Resiliency & Offline Fallback Mechanics](#13-api-client-resiliency--offline-fallback-mechanics)
14. [Design System, Glassmorphic Styling & CSS Variables](#14-design-system-glassmorphic-styling--css-variables)
15. [Master Data, System Roles & Database Seeding](#15-master-data-system-roles--database-seeding)
16. [Environment Variables & Configuration Parameters](#16-environment-variables--configuration-parameters)
17. [Local Development, Docker & Deployment Guide](#17-local-development-docker--deployment-guide)
18. [Automated Test Suite & Verification Matrix](#18-automated-test-suite--verification-matrix)

---

## 1. Executive Summary & Product Vision

**Nexus Community Platform** is an enterprise-grade, high-performance community platform designed specifically for engineers, systems architects, DevOps specialists, and technical creators. Traditional forums are either too informal or lack modern multimedia tooling; Nexus bridges this gap by combining:
- High-velocity threaded technical discussions with Markdown, syntax highlighting, and code snippets.
- Interactive community micro-apps: real-time live polls, multi-question surveys, event calendars with Google Meet integration, and document resource repositories.
- An AI-powered problem-solving engine featuring semantic vector search, duplicate question detection, automatic categorization, and verified solutions.
- Robust Role-Based Access Control (RBAC) ensuring space creators and platform administrators have full governance over content and memberships.
- A resilient dual-mode architecture that connects to a live PostgreSQL/Express backend while providing a zero-crash demo fallback engine for smooth offline testing and presentation.

---

## 2. High-Level Architecture & Dual-Mode Runtime Engine

The platform operates as a cohesive decoupled system where the Next.js frontend interfaces seamlessly with the Express/Prisma backend:

```mermaid
flowchart TB
    subgraph Client ["Frontend: Next.js 16 + React 19 (Port 3001)"]
        UI["UI Pages (Dashboard, Spaces, Threads, Calendar, Assistant)"]
        AuthG["AuthGuard & Session Context (JWT Persistence)"]
        APIClient["API Client Layer (api.ts - AbortController 5s/25s)"]
        DemoFallback["Offline Fallback Engine (demo-data.ts)"]
        AISuite["AI Engine (Semantic Search, Classifiers, Verified Solutions)"]
    end

    subgraph Server ["Backend: Express 5 + TypeScript (Port 3000)"]
        Router["Express Router (/api/v1)"]
        AuthM["Auth Middleware & Error Boundary"]
        Controllers["Controllers & Zod Request Validators"]
        Services["Services Layer (Prisma Queries & Business Logic)"]
        Cron["Cron Scheduler (Token Blacklist, Expiration Checks)"]
    end

    subgraph Storage ["Storage & Persistence Layer"]
        PG[("PostgreSQL Database (Prisma ORM - 25+ Tables)")]
        Redis[("Redis Cache (Tokens, Sessions, Rate Limiting)")]
        S3[("AWS S3 (Attachments & Technical Documents)")]
    end

    UI --> AuthG
    AuthG --> APIClient
    APIClient -- "Live REST Fetch (Bearer JWT + x-user-id)" --> Router
    APIClient -. "Network Error / Timeout Fallback" .-> DemoFallback
    DemoFallback -.-> UI
    UI <--> AISuite

    Router --> AuthM
    AuthM --> Controllers
    Controllers --> Services
    Services --> PG
    Services --> Redis
    Services --> S3
    Cron --> PG
```

### Dual-Mode Runtime Mechanics:
1. **Live Production Mode (`isBackendLive: true`)**:
   - The frontend issues standard HTTP fetch requests to `http://localhost:3000/api/v1`.
   - Headers include `Authorization: Bearer <jwt_token>` and `x-user-id` retrieved from browser `localStorage` (`cp_auth_token`, `cp_user`).
   - Mutations (creating communities, discussions, events, votes, replies, adding/removing members) write directly to the PostgreSQL database.
   - When connected, member and candidate user lists query active database records directly (with zero synthetic dummy users injected).
2. **Preview Mode (`isBackendLive: false`)**:
   - Every network call is guarded by an `AbortController` with a 5000ms timeout (extended to 25000ms for AI assistant inference).
   - If the backend is offline, unreachable, or times out, the client falls back to an in-memory mock engine seeded from `demo-data.ts`.
   - The top navigation bar presents a dynamic health indicator: 🟢 **Live API Connected** (emerald) vs 🟡 **Demo Mode Active** (amber) with a manual health refresh trigger (`checkBackendHealth()`).

---

## 3. Technology Stack & Dependency Encyclopedia

### Frontend Architecture (`community_platform_frontend`)
| Package / Dependency | Version | Architectural Role |
| :--- | :--- | :--- |
| **Next.js** | `16.0.0` (App Router) | React Server Components, server actions, route handlers, dynamic layout hierarchy |
| **React** | `19.0.0` | Core rendering runtime, optimistic UI updates, concurrent features |
| **Tailwind CSS** | `^4.0.0` | Atomic utility classes, dark-mode styling, glassmorphism filters |
| **Lucide React** | `^1.16.0` | Comprehensive UI iconography (switches, badges, actions, arrows) |
| **TypeScript** | `^5.8.0` | Strict end-to-end interface and type enforcement |
| **Fetch API & AbortController** | Native | Resilient REST client with auto-timeout cancellation |

### Backend Architecture (`community_platform_backend`)
| Package / Dependency | Version | Architectural Role |
| :--- | :--- | :--- |
| **Express.js** | `5.1.0` | High-throughput asynchronous HTTP REST API server |
| **Prisma ORM** | `7.1.0` | Type-safe schema definition, database migrations, and PostgreSQL client |
| **PostgreSQL** | `v14+` / `v16` | Relational database engine supporting UUID keys, JSONB columns, foreign keys |
| **Zod** | `^4.3.0` | Strict runtime schema parsing and validation for headers, query params, and bodies |
| **jsonwebtoken** | `^9.0.2` | Cryptographic JWT access and refresh token signing and verification |
| **bcryptjs** | `^3.0.3` | Salted one-way hashing for secure password storage |
| **ioredis** | `^5.9.3` | In-memory key-value cache for token blacklisting, sessions, and rate limiting |
| **@aws-sdk/client-s3** | `^3.896.0` | S3 presigned URL generation for secure, direct multimedia uploads and downloads |
| **node-cron** | `^4.0.6` | In-process cron scheduler for automated background maintenance tasks |
| **cors & helmet** | Latest | Security headers, cross-origin resource sharing controls |
| **dotenv & dotenvx** | Latest | Secure environment variable injection and encryption |

---

## 4. Complete Directory & File Anatomy

```text
goML/
├── community_platform_frontend/
│   ├── .env.local                               # Local frontend env (API URL, Port 3001)
│   ├── package.json                             # Dependencies & scripts ("dev": "next dev -p 3001")
│   ├── tsconfig.json                            # TypeScript configuration with path aliases
│   ├── next.config.ts                           # Next.js bundler settings
│   ├── app/
│   │   ├── globals.css                          # Design tokens, glassmorphism styles, scrollbars
│   │   ├── layout.tsx                           # Universal layout with AuthProvider & ToastProvider
│   │   ├── page.tsx                             # Dashboard: Hero, categories, spaces grid, discussions
│   │   ├── login/page.tsx                       # Authentication, health pill & test account switcher
│   │   ├── register/page.tsx                    # Account creation with validation
│   │   ├── profile/page.tsx                     # User profile, role badges, bio editor, followed spaces
│   │   ├── events/page.tsx                      # Global technical events calendar & RSVP
│   │   ├── assistant/page.tsx                   # AI Technical Copilot & conversational assistant
│   │   ├── unanswered/page.tsx                  # Unanswered questions triage & expert routing
│   │   ├── admin/page.tsx                       # Platform administration panel & user management
│   │   ├── communities/[id]/
│   │   │   ├── page.tsx                         # Space Hub: Discussions, Events, Polls, Members, About
│   │   │   └── discussions/[discussionId]/
│   │   │       └── page.tsx                     # Discussion thread & threaded reply stream
│   │   ├── components/
│   │   │   ├── Navbar.tsx                       # Header with live health indicator & user menu
│   │   │   ├── AuthGuard.tsx                    # Route protection barrier & redirects
│   │   │   ├── CommunityCard.tsx                # Space preview card with follow toggle
│   │   │   ├── DiscussionCard.tsx               # Discussion preview with pin badges & metrics
│   │   │   ├── CreateCommunityModal.tsx         # Space creation composer with gradient presets
│   │   │   ├── EditCommunityModal.tsx           # Space editing modal (Owner / Admin only)
│   │   │   ├── DeleteCommunityModal.tsx         # Space deletion modal (Owner / Admin only)
│   │   │   ├── AddCommunityMemberModal.tsx      # Add member modal with role selection & search
│   │   │   ├── RemoveCommunityMemberModal.tsx   # Remove member modal with creator/admin protection
│   │   │   ├── CreateDiscussionModal.tsx        # Discussion composer with tags & validation
│   │   │   ├── EventsWidget.tsx                 # Community calendar & RSVP widget
│   │   │   ├── PollsWidget.tsx                  # Interactive polling widget
│   │   │   ├── ResourcesWidget.tsx              # Technical file downloads widget
│   │   │   ├── AnnouncementsWidget.tsx          # Broadcast announcements widget
│   │   │   └── UnansweredWidget.tsx             # Unanswered triage widget
│   │   └── lib/
│   │       ├── api.ts                           # REST client with JWT headers & fallback
│   │       ├── auth-context.tsx                 # React auth context & token management
│   │       ├── toast-context.tsx                # Toast notifications context
│   │       ├── rbac.ts                          # Role-Based Access Control logic & helpers
│   │       ├── problem-solving-engine.ts        # AI solution validation & classifier engine
│   │       ├── semantic-search.ts               # Semantic vector search & cosine similarity
│   │       ├── demo-data.ts                     # High-fidelity mock dataset
│   │       └── types.ts                         # Universal TypeScript definitions
│   └── community_platform_backend/
│       ├── .env                                 # Backend environment variables
│       ├── server.ts                            # Express application setup & listener (Port 3000)
│       ├── test_all_endpoints.ts                # 32-assertion automated test suite
│       ├── prisma/
│       │   ├── schema.prisma                    # 25+ relational database models
│       │   └── seed.ts                          # Master data seeder (roles, tags, categories)
│       └── src/
│           ├── config/                          # Env, Prisma, Redis, and S3 configs
│           ├── controllers/                     # 20 Express request controllers
│           ├── services/                        # Business logic & Prisma query services
│           ├── validators/                      # Zod validation schemas
│           ├── middlewares/                     # Auth & centralized error handling
│           ├── routes/v1/                       # 19 API router modules mounted under /api/v1
│           └── jobs/                            # node-cron scheduled background tasks
```

---

## 5. Prisma Database Schema & Relational Data Models

The database is built on PostgreSQL with strict relational integrity, cascade deletes, unique indices, and UUID primary keys.

```mermaid
erDiagram
    Users ||--o{ Communities : "owns"
    Users ||--o{ CommunityMembers : "member_of"
    Users ||--o{ CommunityFollowers : "follows"
    Users ||--o{ Discussions : "authors"
    Users ||--o{ DiscussionReply : "replies"
    Users ||--o{ Event : "creates"
    Users ||--o{ EventRegistration : "rsvps"
    Users ||--o{ PollVote : "casts"
    Users ||--o{ SurveyResponse : "submits"
    Users ||--o{ CommunityResource : "uploads"
    Users }o--|| RolesMaster : "assigned_role"

    Communities ||--o{ CommunityMembers : "has_members"
    Communities ||--o{ CommunityFollowers : "has_followers"
    Communities ||--o{ Discussions : "contains"
    Communities ||--o{ Event : "hosts"
    Communities ||--o{ Poll : "features"
    Communities ||--o{ Survey : "conducts"
    Communities ||--o{ CommunityResource : "stores"
    Communities ||--o{ Announcement : "publishes"

    Discussions ||--o{ DiscussionReply : "contains_replies"
    Discussions ||--o{ DiscussionTags : "tagged_with"
    DiscussionReply ||--o{ DiscussionReply : "nested_under"

    Poll ||--o{ PollOption : "has_options"
    PollOption ||--o{ PollVote : "receives_votes"

    Survey ||--o{ SurveyQuestion : "has_questions"
    Survey ||--o{ SurveyResponse : "receives_answers"
```

### Relational Entity Specifications

#### 1. `Users` (`@@map("users")`)
- `id` (`Uuid`, PK, `@default(uuid())`): Unique user identifier.
- `full_name` (`String`, Unique): Display name.
- `email` (`String`, Unique): Login email address.
- `password` (`String`): Salted Bcrypt password hash.
- `role_id` (`Uuid`, FK -> `RolesMaster.id`): System role identifier.
- `avatar_url` (`String?`): Hosted profile photo URL.
- `bio` (`String?`): Professional summary or technical focus.
- `bio_visibility` (`Visibility`, default: `public`): Privacy toggle (`public` | `private`).
- `is_active` (`Boolean`, default: `true`): Soft-deletion and deactivation state.
- `created_at` (`DateTime`, `default(now())`), `updated_at` (`DateTime`).

#### 2. `Communities` (`@@map("communities")`)
- `id` (`Uuid`, PK, `@default(uuid())`): Space identifier.
- `owner_id` (`Uuid`, FK -> `Users.id`, `onDelete: Cascade`): User who created the space.
- `name` (`String`): Space name (e.g., "Full-Stack Developers Hub").
- `description` (`String?`): Purpose, focus, and guidelines of the space.
- `banner_url` (`String?`): Header cover banner image URL.
- `logo_url` (`String?`): Space avatar icon URL.
- `is_visible_public` (`Visibility`, default: `public`): Public vs. Private space.
- `anyone_can_join` (`Boolean`, default: `true`): Open join vs. Approval required.
- `created_at` (`DateTime`), `updated_at` (`DateTime`).

#### 3. `CommunityMembers` (`@@map("community_members")`)
- `id` (`Uuid`, PK): Membership record ID.
- `community_id` (`Uuid`, FK -> `Communities.id`, `onDelete: Cascade`).
- `user_id` (`Uuid`, FK -> `Users.id`, `onDelete: Cascade`).
- `role` (`Uuid`, FK -> `RolesMaster.id`): Membership role (Member, Moderator, Admin).
- `joined_at` (`DateTime`, `default(now())`).
- `leaved_at` (`DateTime?`): Timestamp when user departed or was removed.
- `isDeleted` (`Boolean`, default: `false`): Soft delete flag for historical audits.

#### 4. `RolesMaster` (`@@map("roles_masters")`)
- `id` (`Uuid`, PK): Fixed system UUIDs:
  - **Admin**: `22222222-2222-4222-a222-222222222222`
  - **Member**: `11111111-1111-4111-a111-111111111111`
  - **Moderator**: `33333333-3333-4333-a333-333333333333`
- `name` (`String`): Name of role.
- `description` (`String?`): Explanatory summary of privileges.
- `permissions` (`Json`): Granular capability matrix.
- `is_active` (`Boolean`, default: `true`).

#### 5. `Discussions` & `DiscussionReply`
- **`Discussions`** (`@@map("discussions")`): Top-level threads with `title`, `content`, `is_pinned` (amber badge highlighting), `is_locked`, `author_id`, `community_id`.
- **`DiscussionReply`** (`@@map("discussion_replies")`): Threaded responses with `parentReplyId` allowing infinite recursive hierarchy.

#### 6. `Event`, `Poll`, `Survey`, `CommunityResource`, `Announcement`
- **`Event`**: `title`, `description`, `location`, `is_online`, `meeting_link`, `start_time`, `end_time`, `max_attendees`, `is_cancelled`.
- **`EventRegistration`**: RSVP state tracking per user (`registered`, `waitlisted`, `cancelled`).
- **`Poll`** & **`PollOption`** & **`PollVote`**: Live voting with automated percentage counting.
- **`Survey`** & **`SurveyQuestion`** & **`SurveyResponse`**: JSON-based survey responses with multiple question types.
- **`CommunityResource`**: Shared documents and code packages with download tracking.
- **`Announcement`**: Pinned maintainer broadcasts with auto-expiration support.

---

## 6. Deep-Dive Feature Specifications

### Feature 1: Authentication, Identity & Session Management
- **Overview**: Provides stateless, cryptographic user authentication utilizing JWT access tokens and long-lived refresh tokens.
- **User Flow**:
  1. Users sign up via `/register` with full name, email, password, and optional technical bio.
  2. Users sign in via `/login`. Successful authentication returns access token (valid 1 day) and refresh token (valid 7 days).
  3. Tokens are stored in browser `localStorage` (`cp_auth_token`, `cp_refresh_token`, `cp_user`).
  4. `AuthGuard` continuously inspects active sessions. Unauthenticated requests are smoothly redirected to `/login?redirect=<target>`.
  5. The login page provides a **1-Click Test User Switcher** allowing instant switching between predefined accounts for testing.
  6. Logout revokes active tokens and writes their cryptographic hash to `RefreshTokenBlacklist`.

### Feature 2: Community Workspaces & Lifecycle Management
- **Overview**: Core collaboration hubs organized around specific technical topics, technologies, or engineering teams.
- **User Flow**:
  1. **Explore Spaces**: Users browse available communities on the dashboard with category filtering and keyword search.
  2. **Create Space**: Users click "+ Create Space" to open `CreateCommunityModal.tsx`. Allows picking name, description, privacy visibility (`public` vs `private`), and selecting from 6 preset gradient banners.
  3. **Edit Space**: Community Creators and Platform Admins can click "Edit Space" to open `EditCommunityModal.tsx` to modify name, description, privacy, and banner image.
  4. **Delete Space**: Community Creators and Platform Admins can click "Delete Space" to open `DeleteCommunityModal.tsx`, permanently deleting the space and cascading related threads.
  5. **Follow / Unfollow**: Users toggle the "Follow" button to subscribe to discussions and receive feed updates.

### Feature 3: Community Member Governance & Administrative Access Controls
- **Overview**: Real-time management of members belonging to a community workspace, protected by strict RBAC guards.
- **User Flow**:
  1. **Members Tab**: Shows the space Founder/Owner with a distinct badge, all registered database members fetched from `GET /communities/:id/members`, and the current user's join state.
  2. **Add Member**:
     - Accessible exclusively to the Community Creator and Platform Administrators.
     - Opens `AddCommunityMemberModal.tsx` showing all registered platform users.
     - Allows selecting a role: **Member**, **Moderator**, or **Admin**.
     - Translates role names to canonical UUIDs automatically.
     - Includes instant search by name or email, an eligible-candidate counter, and a manual email/ID fallback input.
  3. **Remove Member**:
     - Community Creators and Platform Admins can click the "Remove" icon on any member to open `RemoveCommunityMemberModal.tsx`.
     - Confirms deletion and dispatches `DELETE /communities/:id/members/:userId`.
     - Non-admin users cannot remove other members.

### Feature 4: Technical Discussions & Hierarchical Nested Replies
- **Overview**: Reddit/StackOverflow-style technical forum threads supporting Markdown, syntax-highlighted code blocks, and nested replies.
- **User Flow**:
  1. **Start Discussion**: Users click "Start Discussion" to open `CreateDiscussionModal.tsx`. Enter title, markdown content, and assign technical tags (e.g. `react`, `nextjs`, `docker`).
  2. **View Thread**: Displays author avatar, author bio, creation timestamp, view metrics, and full Markdown body.
  3. **Pin Thread**: Platform Admins and Space Owners can pin critical threads to the top with a distinctive amber badge.
  4. **Nested Threaded Replies**:
     - Users submit top-level replies or click "Reply" under an existing comment.
     - Child replies link via `parentReplyId` to construct recursive conversation trees.

### Feature 5: Technical Events, AMAs & RSVP Attendance System
- **Overview**: Community calendar for scheduling virtual workshops, live coding sessions, and architecture reviews.
- **User Flow**:
  1. **Schedule Event**: Enter title, description, cover image, virtual meeting link (Google Meet / Zoom), start time, and max attendees.
  2. **RSVP Registration**: Users click "Register / RSVP" which sends `POST /api/v1/events/:id/registrations`.
  3. **Capacity Management**: Live attendee counters increment dynamically. Once max capacity is reached, new RSVPs enter the waitlist.
  4. **Direct Join**: Attendees click "Join Virtual Meet" to launch the video conference link directly.

### Feature 6: Real-Time Community Polls & Voting Analytics
- **Overview**: Interactive polling widget for gathering engineering consensus, feedback, and architecture choices.
- **User Flow**:
  1. **Create Poll**: Maintainers formulate a question, add up to 6 options, toggle single vs multiple-choice, and specify an expiration date.
  2. **Vote**: Community members click their preferred option.
  3. **Visual Progress Bars**: Animated percentage bars render instantly displaying vote distribution and total participation counts.
  4. **Expirations**: Background cron automatically marks concluded polls as closed once expired.

### Feature 7: Multi-Question Community Surveys & Form Aggregations
- **Overview**: Advanced structured feedback engine supporting multi-step technical questionnaires.
- **User Flow**:
  1. **Draft Survey**: Create surveys featuring multiple questions with diverse input types: text input, radio buttons, checkboxes, and numerical rating scales (1-10).
  2. **Submit Responses**: Members answer questions and submit JSON-structured answer payloads.
  3. **Analytics**: Aggregate responses to evaluate developer sentiment and feature requests.

### Feature 8: Community Resource Repository & Asset Distribution
- **Overview**: Curated technical asset vault for whitepapers, architectural schematics, Dockerfiles, and code snippets.
- **User Flow**:
  1. **Upload Asset**: Upload documentation or code archives with title, category, and file URL.
  2. **Categorized Badges**: Files automatically display badges based on file extension (PDF, TypeScript, Zip, Markdown).
  3. **Download Tracking**: Clicking "Download" increments backend metrics and retrieves the asset via S3 presigned URLs.

### Feature 9: Broadcast Announcements & Maintainer Alerts
- **Overview**: Official channel for space maintainers to broadcast policy changes, release notices, and alerts.
- **User Flow**:
  1. **Publish Announcement**: Maintainers compose updates, set priority levels, and toggle top-pinning.
  2. **Pinned Banner**: Displays at the top of the community with distinct visual styling.
  3. **Auto-Expiration**: Unpins or archives automatically after the specified expiration timestamp.

### Feature 10: AI Technical Copilot & Interactive Assistant
- **Overview**: Multi-turn conversational engineering assistant accessible via `/assistant`.
- **User Flow**:
  1. Users chat with the AI Technical Copilot about architecture, debugging, database queries, and deployment.
  2. Context-aware prompt engine incorporates community discussion context and verified solutions.
  3. Formats responses with Markdown, formatted tables, and copyable code blocks.

### Feature 11: Semantic Vector Search & Similarity Matcher
- **Overview**: Advanced search engine utilizing semantic embeddings and cosine similarity.
- **User Flow**:
  1. Users enter queries in the global search bar or on `/unanswered`.
  2. The semantic engine computes term vectors and calculates cosine similarity against existing discussions:
     $$\text{Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|}$$
  3. Results are ordered by semantic relevance percentage with matching excerpt highlights.

### Feature 12: Automated Post Classification & Urgency Engine
- **Overview**: AI engine that automatically categorizes discussions and assesses production impact.
- **User Flow**:
  1. Evaluates post titles and bodies against keyword corpora for `architecture`, `debugging`, `devops`, `performance`, `security`.
  2. Computes urgency levels: **Critical** (production down, data loss), **High** (build broken), **Medium** (runtime error), or **Low** (general question).

### Feature 13: Duplicate Question Detection & Knowledge De-duplication
- **Overview**: Prevents knowledge fragmentation by identifying duplicate technical questions before posting.
- **User Flow**:
  1. As a user drafts a discussion title, the engine runs similarity scoring against existing questions.
  2. If similarity exceeds 75%, an alert suggests viewing existing discussions with verified solutions.

### Feature 14: Verified Solutions System & Expert Attribution
- **Overview**: Distinguishes tested, authoritative solutions from ordinary opinions.
- **User Flow**:
  1. Replies that resolve a problem can be marked as a **Verified Solution** by the author, moderator, or admin.
  2. Verified replies receive an emerald checkmark badge and are surfaced at the top of the reply stream.
  3. Displays verification score based on author credentials and community upvotes.

### Feature 15: Unanswered Questions Triage & Community Health Queue
- **Overview**: Dedicated triage portal at `/unanswered` ensuring no technical question goes unresolved.
- **User Flow**:
  1. Surfaces discussions with 0 replies or without a verified solution.
  2. Filter by urgency level (Critical, High) and domain category.
  3. Routes critical unanswered problems to matched domain experts.

### Feature 16: User Profiles, Social Graph & Bookmarking
- **Overview**: Comprehensive developer portfolio and social network.
- **User Flow**:
  1. View profiles at `/profile` showing bio, system role, and joined communities.
  2. Follow or unfollow other engineers to curate custom feeds.
  3. Bookmark valuable discussions and code resources for offline access.

### Feature 17: Platform Administration & Role-Based Access Control (RBAC)
- **Overview**: Administration control center accessible at `/admin`.
- **User Flow**:
  1. View all platform users, communities, and discussions.
  2. Promote or demote users between **Member** and **Admin** roles.
  3. Soft-delete deactivated users or inappropriate discussions.

---

## 7. Complete Backend API Specification

All endpoints are hosted at `http://localhost:3000/api/v1` and return standardized JSON responses:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### Comprehensive Endpoint Table

| Method | Endpoint | Authorization | Description & Request Payload |
| :--- | :--- | :--- | :--- |
| **AUTH** | | | |
| `POST` | `/auth/register` | Public | Body: `{ full_name, email, password, bio?, role_id? }` |
| `POST` | `/auth/login` | Public | Body: `{ email, password }` -> Returns JWT token & refresh token |
| `GET` | `/auth/me` | Bearer | Returns active authenticated user session profile |
| `POST` | `/auth/refresh-token` | Public | Body: `{ refresh_token }` -> Issues new access token |
| `POST` | `/auth/logout` | Bearer | Invalidates token and blacklists in Redis/DB |
| **USERS** | | | |
| `GET` | `/users` | Public | Query: `?limit=100&search=...` -> Case-insensitive active users |
| `GET` | `/users/:id` | Public | Returns user profile, bio, role, and statistics |
| `PUT` | `/users/:id` | Bearer | Body: `{ full_name?, bio?, avatar_url?, bio_visibility? }` |
| `DELETE`| `/users/:id` | Bearer/Admin | Soft deletes user (`is_active = false`) |
| **COMMUNITIES** | | | |
| `GET` | `/communities` | Public | Query: `?page=1&limit=20&search=...` -> Lists spaces |
| `POST` | `/communities` | Bearer | Body: `{ name, description, banner_url, is_visible_public }` |
| `GET` | `/communities/:id` | Public | Returns space details, owner, member & follower counts |
| `PUT` | `/communities/:id` | Owner/Admin | Body: `{ name?, description?, banner_url?, is_visible_public? }` |
| `DELETE`| `/communities/:id` | Owner/Admin | Permanently deletes space (verified via `verifyAdminAccess`) |
| **MEMBERS** | | | |
| `GET` | `/communities/:id/members` | Public | Returns official community members with user objects |
| `POST` | `/communities/:id/members` | Creator/Admin | Body: `{ user_id, role?, admin_id? }` (Auto-converts role names) |
| `DELETE`| `/communities/:id/members/:userId` | Creator/Admin | Removes member (verified via `verifyMemberManagementAccess`) |
| **DISCUSSIONS** | | | |
| `GET` | `/discussions/community/:id`| Public | Returns discussions for community (pinned first) |
| `POST` | `/discussions/community/:id`| Bearer | Body: `{ title, content, tag_ids? }` |
| `GET` | `/discussions/:id` | Public | Returns single discussion with author profile and tags |
| `PUT` | `/discussions/:id` | Author/Admin | Body: `{ title?, content?, is_pinned?, is_locked? }` |
| `DELETE`| `/discussions/:id` | Author/Admin | Deletes discussion and cascades replies |
| **REPLIES** | | | |
| `GET` | `/discussion-replies/discussion/:id` | Public | Returns nested threaded replies tree |
| `POST` | `/discussion-replies/discussion/:id` | Bearer | Body: `{ content, parentReplyId? }` |
| **EVENTS** | | | |
| `GET` | `/events` | Public | Lists all upcoming global events |
| `GET` | `/communities/:id/events` | Public | Lists upcoming events for specific space |
| `POST` | `/communities/:id/events` | Bearer | Body: `{ title, description, start_time, end_time, meeting_link }` |
| `POST` | `/events/:id/registrations`| Bearer | RSVP registration for an event |
| `DELETE`| `/events/:id/registrations`| Bearer | Cancels existing RSVP registration |
| **POLLS & SURVEYS** | | | |
| `GET` | `/polls` | Public | Query: `?community_id=...` -> Lists active polls |
| `POST` | `/polls` | Bearer | Body: `{ question, options: string[], expires_at }` |
| `POST` | `/polls/:id/votes` | Bearer | Body: `{ option_id }` -> Casts user vote |
| `GET` | `/surveys` | Public | Lists community surveys |
| `POST` | `/surveys/:id/responses`| Bearer | Body: `{ answers: Json }` -> Submits survey responses |
| **RESOURCES & ANNOUNCEMENTS** | | | |
| `GET` | `/communities/:id/resources`| Public | Lists downloadable documentation and code assets |
| `POST` | `/communities/:id/resources`| Bearer | Body: `{ title, description, file_url, file_type }` |
| `POST` | `/resources/:id/download` | Public | Increments asset download counter |
| `GET` | `/communities/:id/announcements` | Public | Lists maintainer announcements |
| `POST` | `/communities/:id/announcements` | Bearer | Body: `{ title, content, isPinned, expiresAt? }` |

---

## 8. Backend Controllers, Services & Middlewares

### Middlewares
1. **`auth_middleware.ts`**:
   - Inspects `req.headers.authorization` for `Bearer <token>`.
   - Validates cryptographic signature with `JWT_SECRET`.
   - Queries `RefreshTokenBlacklist` to reject revoked credentials.
   - Decodes token payload and attaches user context to `req.user`.
2. **`error_middleware.ts`**:
   - Centralized boundary catching all uncaught exceptions across controllers.
   - Formats Zod validation failures into descriptive 400 responses.
   - Maps Prisma `P2002` (unique constraint collisions) to clean 409 Conflicts.
   - Maps Prisma `P2025` (missing records) to 404 Not Found.

### Security Guards in Controllers
- **`verifyAdminAccess`** (`community_controller.ts`):
  Validates that the user requesting to edit or delete a community space is either the recorded `owner_id` or possesses the system `Admin` role.
- **`verifyMemberManagementAccess`** (`communitymember_controller.ts`):
  Ensures that self-joining/leaving is permitted, while adding or removing other members is strictly restricted to Community Creators and Platform Admins.
- **Role Name-to-UUID Converter**:
  Converts friendly strings (`"member"`, `"moderator"`, `"admin"`) directly into their corresponding UUID in `RolesMaster` before schema validation.

---

## 9. Role-Based Access Control (RBAC) Matrix & Permission Logic

Managed through [`app/lib/rbac.ts`](file:///c:/Users/mages/Downloads/goML/community_platform_frontend/app/lib/rbac.ts):

| Permission / Action | Platform Admin | Community Owner | Space Moderator | Standard Member |
| :--- | :---: | :---: | :---: | :---: |
| **Create Community Space** | ✅ | ✅ | ✅ | ✅ |
| **Edit Space Details (Name, Banner, Privacy)** | ✅ | ✅ (Own space) | ❌ | ❌ |
| **Delete Community Space** | ✅ | ✅ (Own space) | ❌ | ❌ |
| **Add Members to Space (With Roles)** | ✅ | ✅ (Own space) | ❌ | ❌ |
| **Remove Members from Space** | ✅ | ✅ (Own space) | ❌ | ❌ |
| **Pin / Unpin Discussion Threads** | ✅ | ✅ (Own space) | ✅ (Own space) | ❌ |
| **Lock / Unlock Discussion Threads** | ✅ | ✅ (Own space) | ✅ (Own space) | ❌ |
| **Post Discussions & Threaded Replies** | ✅ | ✅ | ✅ | ✅ |
| **Create Events, Polls & Resources** | ✅ | ✅ | ✅ | ✅ |
| **Vote in Polls & RSVP to Events** | ✅ | ✅ | ✅ | ✅ |

---

## 10. Background Scheduled Tasks (Cron Jobs)

Implemented using `node-cron` in `community_platform_backend/src/jobs/cron_jobs.ts`:

1. **Token Blacklist Cleanup (`*/15 * * * *`)**:
   Runs every 15 minutes to delete expired tokens from `RefreshTokenBlacklist` where `expires_at < new Date()`.
2. **Entity Expiration Watcher (`*/5 * * * *`)**:
   Runs every 5 minutes to automatically unpin expired announcements, mark concluded polls as closed, and flag concluded events.

---

## 11. Frontend Interactive Widgets & Component Breakdown

### Community Management
- **`EditCommunityModal.tsx`**: Modal allowing owners and admins to edit space details, description, visibility, and gradient banner.
- **`DeleteCommunityModal.tsx`**: Modal confirming permanent deletion of a community.
- **`AddCommunityMemberModal.tsx`**: Allows searching registered platform users, assigning roles (Member, Moderator, Admin), and adding members directly or via email fallback.
- **`RemoveCommunityMemberModal.tsx`**: Confirmation modal to remove a user from the space.
- **Dynamic Members Tab (`app/communities/[id]/page.tsx`)**:
  - Displays Founder/Owner badge.
  - Displays official members from PostgreSQL database.
  - Displays current user's joined state.
  - Zero fake/dummy profile injections.

### Multimedia Widgets
- **`EventsWidget.tsx`**: Interactive calendar supporting RSVP registrations and Google Meet launch.
- **`PollsWidget.tsx`**: Real-time polling with animated progress bars and percentage counts.
- **`ResourcesWidget.tsx`**: Documentation and file repository with download metrics.
- **`AnnouncementsWidget.tsx`**: Pinned maintainer broadcasts.
- **`UnansweredWidget.tsx`**: Unanswered questions triage widget.

---

## 12. State Management, Authentication & Context Providers

### 1. `auth-context.tsx` (`useAuth`)
Universal session management providing:
- `user`: Active user profile object (`User | null`).
- `token`: Active Bearer JWT string.
- `isBackendLive`: Real-time boolean health status of the backend API.
- `login(email, password)` / `register(payload)` / `logout()`.
- `switchDemoUser(user)`: Instant 1-click test user switcher.
- `refreshHealth()`: Triggers manual health check against `/health`.

### 2. `toast-context.tsx` (`useToast`)
Global non-blocking visual feedback providing `showToast(message, 'success' | 'error' | 'info')`.

---

## 13. API Client, Resiliency & Offline Fallback Mechanics

Implemented in [`app/lib/api.ts`](file:///c:/Users/mages/Downloads/goML/community_platform_frontend/app/lib/api.ts):
- **Universal Fetcher (`apiRequest<T>`)**: Automatically injects `Authorization: Bearer <token>` and `x-user-id` headers.
- **Timeout Protection**: Wraps calls with an `AbortController` timeout (5s standard, 25s for AI assistant).
- **Graceful Fallback**: If the server is offline or times out, seamlessly falls back to mock datasets in `demo-data.ts`.
- **Pure Live Data**: When connected to the live backend, `fetchUsers()` queries active database users without appending synthetic demo profiles.

---

## 14. Design System, Glassmorphic Styling & CSS Variables

- **Dark Glassmorphism Architecture**:
  - Panel Backgrounds: `rgba(14, 17, 29, 0.75)` with `backdrop-filter: blur(16px)`.
  - Borders: `1px solid rgba(255, 255, 255, 0.08)`.
  - Accent Color Palette: Vibrant orange (`#f97316`), warm amber (`#f59e0b`), deep indigo (`#6366f1`), and emerald (`#10b981`).
- **Typography & Accessibility**:
  - High-contrast text hierarchy (`text-zinc-100`, `text-zinc-400`, `text-zinc-500`).
  - Fluid mobile-responsive layout across all viewports.

---

## 15. Master Data, System Roles & Database Seeding

Configured in `community_platform_backend/prisma/seed.ts`:
- **Roles**:
  - `Member` (`11111111-1111-4111-a111-111111111111`)
  - `Admin` (`22222222-2222-4222-a222-222222222222`)
  - `Moderator` (`33333333-3333-4333-a333-333333333333`)
- **Categories**: Machine Learning & AI, DevOps & Cloud, Full-Stack Development, Distributed Systems, Cybersecurity.
- **Tags**: `react`, `nextjs`, `typescript`, `prisma`, `postgresql`, `docker`, `kubernetes`, `redis`.

---

## 16. Environment Variables & Configuration Parameters

### Backend (`community_platform_backend/.env`)
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/community_platform?schema=public
JWT_SECRET=super-secret-jwt-key-for-development-32chars
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=super-secret-refresh-jwt-key-32chars
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=community-platform-attachments
```

### Frontend (`community_platform_frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
PORT=3001
```

---

## 17. Local Development, Docker & Deployment Guide

### Start Backend (Port 3000)
```bash
cd community_platform_backend
npm install
npx prisma db push
npm run seed
npm start
```
*Backend health check runs at `http://localhost:3000/health`.*

### Start Frontend (Port 3001)
```bash
cd community_platform_frontend
npm install
npm run dev
```
*Access application in browser at `http://localhost:3001`.*

---

## 18. Automated Test Suite & Verification Matrix

The backend includes a comprehensive 32-step automated test suite in `community_platform_backend/test_all_endpoints.ts`.

To execute the test suite:
```bash
cd community_platform_backend
npx tsx test_all_endpoints.ts
```
*Expected Output: `🎉 ALL API ENDPOINTS ARE WORKING PERFECTLY! (100% Success Rate)`*

---

## Summary Quick Reference Table

| Key Attribute | Location / Configuration |
| :--- | :--- |
| **Frontend Root** | `c:\Users\mages\Downloads\goML\community_platform_frontend` |
| **Backend Root** | `c:\Users\mages\Downloads\goML\community_platform_frontend\community_platform_backend` |
| **Frontend Dev URL** | `http://localhost:3001` |
| **Backend API URL** | `http://localhost:3000/api/v1` |
| **Prisma Schema** | `community_platform_backend/prisma/schema.prisma` |
| **Automated Test** | `community_platform_backend/test_all_endpoints.ts` |
| **System Roles** | Admin (`22222222...`), Member (`11111111...`), Moderator (`33333333...`) |
| **Context Documentation** | `PROJECT_CONTEXT_FULL.md` |
