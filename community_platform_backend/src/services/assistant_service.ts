import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { generateTextEmbedding, cosineSimilarity } from "./embedding_service";

export interface AssistantSource {
  id: string;
  discussion_id: string;
  community_id: string;
  community_name: string;
  title: string;
  author_name: string;
  author_avatar?: string | null;
  excerpt: string;
  relevance_score: number;
  is_verified_solution?: boolean;
  reply_id?: string;
  url: string;
}

export interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  is_community_backed?: boolean;
  missing_information_note?: string;
  sources?: AssistantSource[];
  suggested_followups?: string[];
  corrected_query?: string | null;
  did_you_mean?: string | null;
  suggested_queries?: string[];
}

export interface AssistantConversation {
  id: string;
  title: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  messages: AssistantChatMessage[];
  community_id?: string;
}

export interface AssistantUserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  interests?: string[];
  permissions?: string[];
}

export interface AssistantChatOptions {
  message: string;
  conversation_id?: string;
  community_id?: string;
  user_id?: string;
  user_profile?: AssistantUserProfile;
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export interface AssistantChatResponse {
  answer: string;
  is_community_backed: boolean;
  missing_information_note?: string;
  sources: AssistantSource[];
  suggested_followups: string[];
  conversation_id: string;
  corrected_query?: string | null;
  did_you_mean?: string | null;
  suggested_queries?: string[];
}

// In-memory conversation store for multi-turn sessions
const conversationStore = new Map<string, AssistantConversation>();

// Pre-seeded community knowledge base for guaranteed offline / bootstrap resilience
const DEFAULT_COMMUNITY_KNOWLEDGE = [
  {
    id: "d-103",
    community_id: "c-001",
    community_name: "AI Engineering & MLOps",
    title: "How do you structure your daily routine for sustainable engineering focus and deep work?",
    content: "Balancing high-cognitive coding tasks with team communication and energy levels. Strategies include time-blocking 9am-11:30am for hardest problems, delaying caffeine 60-90 minutes, getting early morning natural light, and setting a hard 5:30pm shutdown routine with tomorrow's top 3 priorities.",
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    tags: ["Productivity", "Habits", "DeepWork", "EngineeringRoutine"],
    replies: [
      {
        author_name: "Alex Rivera",
        content: "The 3-Block Daily System: 1. Deep Work Block (9:00 AM - 11:30 AM): Strict no-meetings window for hardest architectural problems. 2. Collaboration & Reviews (1:00 PM - 3:00 PM): PR reviews, sprint syncs, mentoring. 3. Shutdown Routine (5:00 PM - 5:30 PM): Review next day's top 3 priorities, close tabs, physical disconnection.",
        is_verified_solution: true,
      },
      {
        author_name: "Dr. Sarah Chen",
        content: "Circadian Rhythm and Morning Routine: Getting 15 minutes of outdoor natural light within 30 minutes of waking resets cortisol levels and eliminated my 3 PM brain fog. Delay caffeine intake 60-90 minutes after waking to avoid the adenosine crash.",
        is_verified_solution: true,
      },
    ],
  },
  {
    id: "d-101",
    community_id: "c-001",
    community_name: "AI Engineering & MLOps",
    title: "Strategies for reducing LLM inference latency in multi-turn agents",
    content: "Techniques for low-latency agent responses: Semantic Caching for 42% latency drop on repeated queries, vLLM PagedAttention v2 for 2.3x throughput gain, and speculative decoding for 1.7x faster first token generation.",
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    tags: ["MLOps", "Performance", "LLM", "Inference"],
    replies: [
      {
        author_name: "Dr. Sarah Chen",
        content: "KV-cache quantization to FP8 combined with prefix caching saved us 60% memory bandwidth on 8k+ token prompts.",
        is_verified_solution: true,
      },
    ],
  },
  {
    id: "d-201",
    community_id: "c-002",
    community_name: "Fullstack Next.js & React 19",
    title: "Patterns for State Management in React 19 Server Actions & Optimistic UI",
    content: "Using useActionState and useOptimistic as first-class primitives in React 19. Completely eliminates boilerplate by combining Server Actions with optimistic feedback for community threads and like toggles.",
    author_name: "Dr. Sarah Chen",
    author_avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
    tags: ["React19", "NextJS", "StateManagement"],
    replies: [
      {
        author_name: "Alex Rivera",
        content: "Always wrap form submissions in startTransition and handle error rollbacks gracefully with toast notifications.",
        is_verified_solution: false,
      },
    ],
  },
  {
    id: "d-301",
    community_id: "c-003",
    community_name: "Cloud Native & Kubernetes Core",
    title: "Zero-Downtime Database Schema Migrations on K8s with Prisma",
    content: "Running automated Prisma migrations inside Kubernetes init-containers can cause race conditions. Adopt distributed advisory locks and isolated rollout jobs for zero-downtime column migrations.",
    author_name: "Marcus Vance",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    tags: ["DevOps", "Prisma", "Kubernetes", "PostgreSQL"],
    replies: [
      {
        author_name: "David Thorne",
        content: "Use expand-and-contract pattern: never drop or rename a column in the same release that updates code.",
        is_verified_solution: true,
      },
    ],
  },
  {
    id: "d-401",
    community_id: "c-002",
    community_name: "Fullstack Next.js & React 19",
    title: "How to configure CORS middleware in FastAPI and React",
    content: "Configure CORSMiddleware with specific origins, allow_credentials=True, and allow_methods=['*'] to resolve cross-origin preflight errors.",
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    tags: ["FastAPI", "CORS", "Security"],
    replies: [
      {
        author_name: "Dr. Sarah Chen",
        content: "Make sure origins does not contain trailing slashes (use 'http://localhost:3000' not 'http://localhost:3000/').",
        is_verified_solution: true,
      },
    ],
  },
  {
    id: "d-501",
    community_id: "c-003",
    community_name: "Cloud Native & Kubernetes Core",
    title: "My electricity bill has suddenly increased even though my usage hasn't changed",
    content: "Diagnosing sudden 65% power spikes. Culprit was an electric water heater with a grounded element running 24/7 without tripping breakers.",
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    tags: ["Household", "Diagnostics", "Energy"],
    replies: [
      {
        author_name: "David Thorne",
        content: "Test element resistance to ground with multimeter. Replace lower heating element to eliminate continuous 4.5 kW draw.",
        is_verified_solution: true,
      },
    ],
  },
];

export interface CommunityDetailedKnowledge {
  id: string;
  name: string;
  category: string;
  leaders: string[];
  members_count: number;
  description: string;
  rules: string[];
  polls: Array<{
    id: string;
    question: string;
    is_multiple_choice: boolean;
    is_closed: boolean;
    total_votes: number;
    options: Array<{ text: string; votes: number; percentage: number }>;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    author: string;
    is_pinned: boolean;
    date: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    is_online: boolean;
    meeting_link: string;
    host: string;
    attendees: number;
    max_attendees: number;
    description: string;
  }>;
  resources: Array<{
    id: string;
    title: string;
    description: string;
    file_type: string;
    file_size: string;
    category: string;
    downloads: number;
    url: string;
  }>;
}

export const COMMUNITY_DETAILED_REGISTRY: Record<string, CommunityDetailedKnowledge> = {
  "c-001": {
    id: "c-001",
    name: "AI Engineering & MLOps",
    category: "Artificial Intelligence & Systems",
    leaders: ["Dr. Sarah Chen (Lead Architect)", "Alex Rivera (Senior AI Engineer)"],
    members_count: 890,
    description: "A global community of ML practitioners, researchers, and engineers scaling models, fine-tuning LLMs, and building reliable evaluation pipelines.",
    rules: [
      "1. Reproducible Benchmark Standards: Always share hardware specs (GPU, VRAM), batch sizes, and p50/p95/p99 latency percentiles when reporting inference or fine-tuning benchmarks.",
      "2. Strict Secret Sanitization: Never publish confidential customer prompts, proprietary model weights, or private API keys.",
      "3. Empirical Verification: Only mark solutions as verified after reproducing them on standardized evaluation datasets (e.g. MMLU, GSM8K, or custom test sets).",
      "4. Respectful Peer Review: Provide constructive, actionable feedback on prompt architectures and evaluation pipelines."
    ],
    polls: [
      {
        id: "poll-001",
        question: "Which inference optimization delivers the highest speedup in your production stack?",
        is_multiple_choice: false,
        is_closed: false,
        total_votes: 296,
        options: [
          { text: "vLLM PagedAttention v2", votes: 142, percentage: 48 },
          { text: "Semantic Caching via Redis", votes: 92, percentage: 31 },
          { text: "Speculative Decoding", votes: 41, percentage: 14 },
          { text: "FP8 Quantization", votes: 21, percentage: 7 }
        ]
      },
      {
        id: "poll-002",
        question: "Preferred LLM Evaluation Framework in 2026?",
        is_multiple_choice: false,
        is_closed: false,
        total_votes: 210,
        options: [
          { text: "Ragas", votes: 88, percentage: 42 },
          { text: "DeepEval", votes: 62, percentage: 30 },
          { text: "Promptfoo", votes: 38, percentage: 18 },
          { text: "Custom Python test suite", votes: 22, percentage: 10 }
        ]
      }
    ],
    announcements: [
      {
        id: "ann-001",
        title: "🚀 vLLM PagedAttention v2 Live Demo Session",
        content: "Join Lead Architect Dr. Sarah Chen this Friday at 4:00 PM UTC for a live walkthrough of FP8 quantization and continuous batching benchmarks.",
        author: "Dr. Sarah Chen",
        is_pinned: true,
        date: "2026-10-28"
      },
      {
        id: "ann-002",
        title: "New Enterprise LLM Serving Comparison Matrix Released",
        content: "Check out the new comprehensive matrix comparing vLLM, TensorRT-LLM, and TGI in our Community Resources tab.",
        author: "Alex Rivera",
        is_pinned: false,
        date: "2026-10-25"
      }
    ],
    events: [
      {
        id: "ev-001",
        title: "Mastering Low-Latency Agent Architectures",
        date: "Friday, Nov 14, 2026",
        time: "16:00 - 17:30 UTC",
        location: "Virtual Meeting Room",
        is_online: true,
        meeting_link: "https://meet.google.com/nexus-ai-eng",
        host: "Dr. Sarah Chen",
        attendees: 85,
        max_attendees: 100,
        description: "Hands-on workshop covering KV-cache prefix caching, speculative decoding, and streaming UI state management."
      },
      {
        id: "ev-002",
        title: "Bi-Weekly AMA: MLOps Guardrails, Eval, & Human-in-the-Loop",
        date: "Thursday, Nov 27, 2026",
        time: "17:00 - 18:00 UTC",
        location: "Virtual Meeting Room",
        is_online: true,
        meeting_link: "https://meet.google.com/nexus-ai-ama",
        host: "Alex Rivera",
        attendees: 42,
        max_attendees: 60,
        description: "Open Q&A on production hallucination detection, prompt regression suites, and fine-tuning small models."
      }
    ],
    resources: [
      {
        id: "res-001",
        title: "Enterprise LLM Inference Optimization Architecture Blueprint",
        description: "Comprehensive blueprint detailing memory bandwidth sizing, paged attention memory tables, and latency budgets.",
        file_type: "PDF",
        file_size: "2.4 MB",
        category: "Architecture",
        downloads: 342,
        url: "/communities/c-001?tab=resources"
      },
      {
        id: "res-002",
        title: "vLLM Production Docker Compose & Kubernetes Helm Template",
        description: "Ready-to-deploy Helm charts with auto-scaling based on queue depth and GPU memory pressure.",
        file_type: "ZIP",
        file_size: "1.1 MB",
        category: "DevOps/Deployment",
        downloads: 518,
        url: "/communities/c-001?tab=resources"
      }
    ]
  },
  "c-002": {
    id: "c-002",
    name: "Fullstack Next.js & React 19",
    category: "Web Development & Frameworks",
    leaders: ["Alex Rivera (Senior AI/Fullstack Engineer)", "Dr. Sarah Chen"],
    members_count: 1420,
    description: "Deep dives into React Server Components, Turbopack, App Router architecture, and building lightning-fast web applications.",
    rules: [
      "1. Provide Minimal Reproductions: Link a minimal GitHub repo, CodeSandbox, or complete reproduction snippet for hydration and Server Action issues.",
      "2. Transition Discipline: Wrap all optimistic UI state updates and mutations inside React 19 startTransition or useActionState.",
      "3. Server/Client Boundary Security: Never expose sensitive server environment variables to Client Components (maintain strict 'use client' discipline).",
      "4. CORS & Preflight Best Practices: Follow official Nexus CORS origin configurations (avoid trailing slashes and wildcard credentials)."
    ],
    polls: [
      {
        id: "poll-101",
        question: "What is your primary state management approach in React 19 / Next.js 16 App Router?",
        is_multiple_choice: false,
        is_closed: false,
        total_votes: 347,
        options: [
          { text: "Server Actions + useActionState + useOptimistic", votes: 188, percentage: 54 },
          { text: "Zustand", votes: 90, percentage: 26 },
          { text: "TanStack Query", votes: 52, percentage: 15 },
          { text: "Redux Toolkit", votes: 17, percentage: 5 }
        ]
      }
    ],
    announcements: [
      {
        id: "ann-101",
        title: "⚡ React 19 Server Actions & Optimistic UI Migration Guide",
        content: "Read our comprehensive upgrade notes in Discussions detailing useActionState, useOptimistic, and transition patterns.",
        author: "Alex Rivera",
        is_pinned: true,
        date: "2026-10-27"
      },
      {
        id: "ann-102",
        title: "FastAPI & Express 5 CORS Preflight Best Practices",
        content: "Updated guide for handling cross-origin cookie authentication and credentials with Next.js 16.",
        author: "Alex Rivera",
        is_pinned: false,
        date: "2026-10-24"
      }
    ],
    events: [
      {
        id: "ev-101",
        title: "Hands-on Workshop: Building Resilient React 19 Optimistic UIs",
        date: "Wednesday, Nov 12, 2026",
        time: "18:00 - 19:30 UTC",
        location: "Virtual Meeting Room",
        is_online: true,
        meeting_link: "https://meet.google.com/nexus-nextjs",
        host: "Alex Rivera",
        attendees: 120,
        max_attendees: 150,
        description: "Live interactive coding session building a fullstack optimistic thread updater with server action error rollback."
      }
    ],
    resources: [
      {
        id: "res-101",
        title: "React 19 Server Actions & Optimistic UI State Flow Chart",
        description: "Visual architectural flow chart illustrating request cycles, transition queues, and optimistic rollbacks.",
        file_type: "PDF",
        file_size: "3.2 MB",
        category: "Architecture",
        downloads: 620,
        url: "/communities/c-002?tab=resources"
      },
      {
        id: "res-102",
        title: "FastAPI + Next.js 16 Secure Auth Template (HttpOnly, CORS, JWT)",
        description: "Production boilerplate with secure session handling, refresh token rotation, and preflight headers.",
        file_type: "ZIP",
        file_size: "4.5 MB",
        category: "Boilerplate",
        downloads: 789,
        url: "/communities/c-002?tab=resources"
      }
    ]
  },
  "c-003": {
    id: "c-003",
    name: "Cloud Native & Kubernetes Core",
    category: "Infrastructure & DevOps",
    leaders: ["Marcus Vance (DevOps & SRE Lead)", "David Thorne (Platform Admin)"],
    members_count: 650,
    description: "DevOps pros sharing production incident post-mortems, GitOps setups, service mesh best practices, and Helm chart patterns.",
    rules: [
      "1. Blameless Incident Post-Mortems: All production outage reports must focus on architecture and systemic safeguards, never individual blame.",
      "2. Two-Phase Database Migrations: Adhere strictly to the expand-and-contract pattern for zero-downtime Prisma migrations; never drop columns in live rollout steps.",
      "3. Sanitize Infrastructure Manifests: Redact all IP addresses, hostnames, SSL certificates, and Kubernetes secrets before sharing.",
      "4. Hardware Diagnostic Rigor: Include voltage/resistance readings and multimeter steps when reporting electrical or power anomalies."
    ],
    polls: [
      {
        id: "poll-201",
        question: "How does your team execute database migrations in production Kubernetes?",
        is_multiple_choice: false,
        is_closed: false,
        total_votes: 178,
        options: [
          { text: "Isolated Pre-Deploy K8s Job with Advisory Locks", votes: 110, percentage: 62 },
          { text: "Kubernetes Init Containers", votes: 32, percentage: 18 },
          { text: "External CI/CD Pipeline (GitHub Actions)", votes: 25, percentage: 14 },
          { text: "Manual Bastion Execution", votes: 11, percentage: 6 }
        ]
      }
    ],
    announcements: [
      {
        id: "ann-201",
        title: "🛡️ Production Post-Mortem Archive: Zero-Downtime Prisma Migration",
        content: "Read the full analysis of distributed advisory locking and race conditions during Kubernetes rollouts.",
        author: "Marcus Vance",
        is_pinned: true,
        date: "2026-10-26"
      },
      {
        id: "ann-202",
        title: "Cluster Maintenance: Staging Upgrade to Kubernetes v1.31",
        content: "Scheduled maintenance this Sunday at 02:00 UTC. Ingress traffic will fail over automatically.",
        author: "David Thorne",
        is_pinned: false,
        date: "2026-10-22"
      }
    ],
    events: [
      {
        id: "ev-201",
        title: "Zero-Downtime Database Schema Migrations on K8s with Prisma",
        date: "Tuesday, Nov 18, 2026",
        time: "17:00 - 18:30 UTC",
        location: "Virtual Meeting Room",
        is_online: true,
        meeting_link: "https://meet.google.com/nexus-k8s",
        host: "Marcus Vance",
        attendees: 64,
        max_attendees: 100,
        description: "Live architecture walkthrough covering distributed PostgreSQL locks, dual-write stages, and canary rollouts."
      }
    ],
    resources: [
      {
        id: "res-201",
        title: "Production Kubernetes Cluster Security Hardening & Pre-Flight Checklist",
        description: "Checklist for pod security standards, network policies, and RBAC lockdown.",
        file_type: "PDF",
        file_size: "5.1 MB",
        category: "Security",
        downloads: 410,
        url: "/communities/c-003?tab=resources"
      },
      {
        id: "res-202",
        title: "Prisma Distributed Advisory Lock Migration Scripts for Helm Charts",
        description: "Production Bash and TypeScript scripts to coordinate pre-install Helm migration hooks safely.",
        file_type: "ZIP",
        file_size: "850 KB",
        category: "Scripts",
        downloads: 532,
        url: "/communities/c-003?tab=resources"
      }
    ]
  },
  "c-004": {
    id: "c-004",
    name: "Design Systems & UI Engineering",
    category: "Design & Frontend Systems",
    leaders: ["Elena Rostova (UI Architecture Lead)", "David Thorne"],
    members_count: 920,
    description: "Designers and frontend engineers crafting high-fidelity design tokens, accessible components, micro-interactions, and motion systems.",
    rules: [
      "1. Universal Accessibility (WCAG 2.2 AA): Every component and pattern shared must support keyboard navigation, ARIA labels, and high-contrast dark/light modes.",
      "2. Token-First System Design: Never use hardcoded arbitrary pixel or hex values; strictly bind to Nexus design tokens.",
      "3. 60 FPS Animation Budget: Micro-interactions must utilize GPU-accelerated transforms and opacity to avoid layout thrashing."
    ],
    polls: [
      {
        id: "poll-301",
        question: "Which styling solution does your team prefer for enterprise design systems in 2026?",
        is_multiple_choice: false,
        is_closed: false,
        total_votes: 232,
        options: [
          { text: "Tailwind CSS v4 + Class Variance Authority (CVA)", votes: 134, percentage: 58 },
          { text: "CSS Modules", votes: 51, percentage: 22 },
          { text: "Vanilla Extract", votes: 28, percentage: 12 },
          { text: "StyleX", votes: 19, percentage: 8 }
        ]
      }
    ],
    announcements: [
      {
        id: "ann-301",
        title: "🎨 Nexus Glassmorphism 2.0 Design Tokens Released!",
        content: "Full support for responsive contrast, glass surfaces, and smooth theme transitions in dark and light modes.",
        author: "Elena Rostova",
        is_pinned: true,
        date: "2026-10-25"
      }
    ],
    events: [
      {
        id: "ev-301",
        title: "Crafting Accessible, High-Performance Micro-Interactions in React 19",
        date: "Thursday, Nov 20, 2026",
        time: "15:00 - 16:30 UTC",
        location: "Virtual Meeting Room",
        is_online: true,
        meeting_link: "https://meet.google.com/nexus-design",
        host: "Elena Rostova",
        attendees: 75,
        max_attendees: 100,
        description: "Hands-on tutorial building accessible spring-physics drawer and modal animations."
      }
    ],
    resources: [
      {
        id: "res-301",
        title: "Nexus Glassmorphic Design System Figma Component Library & Token Spec",
        description: "Complete Figma design file including design tokens, dark/light component variants, and interactive states.",
        file_type: "ZIP",
        file_size: "12.4 MB",
        category: "Design Files",
        downloads: 890,
        url: "/communities/c-004?tab=resources"
      },
      {
        id: "res-302",
        title: "WCAG 2.2 AA Accessibility Audit Checklist for Frontend Components",
        description: "Actionable checklist with ARIA guidelines, screen-reader testing commands, and contrast thresholds.",
        file_type: "PDF",
        file_size: "1.8 MB",
        category: "Guidelines",
        downloads: 615,
        url: "/communities/c-004?tab=resources"
      }
    ]
  }
};

/**
 * Levenshtein distance for typo detection & fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Common typo, misspelling, and informal shorthand dictionary
 */
export const TYPO_AND_GRAMMAR_MAP: Record<string, string> = {
  // Common grammatical / informal shorthands
  "how 2": "how to",
  "wht": "what",
  "wat": "what",
  "ur": "your",
  "u": "you",
  "r": "are",
  "nd": "and",
  "plz": "please",
  "pls": "please",
  "im": "I am",
  "shold": "should",
  "recorrect": "correct",
  "gramitical": "grammatical",
  "undertand": "understand",
  "wnats": "wants",
  "fi": "if",
  "mistaes": "mistakes",
  "inlcude": "include",
  "inclue": "include",
  "inprove": "improve",
  "improv": "improve",
  "dily": "daily",
  "rotine": "routine",
  "routen": "routine",
  "habts": "habits",
  "caffine": "caffeine",
  "prodctivity": "productivity",
  "letency": "latency",
  "latensy": "latency",
  "infrence": "inference",
  "infernce": "inference",
  "stratigies": "strategies",
  "strategis": "strategies",
  "redue": "reduce",
  "redusing": "reducing",
  "multiturn": "multi-turn",
  "quantizaton": "quantization",
  "fastpi": "fastapi",
  "fatapi": "fastapi",
  "corse": "cors",
  "errros": "errors",
  "erros": "errors",
  "middlware": "middleware",
  "midleware": "middleware",
  "prefligt": "preflight",
  "origns": "origins",
  "kubernets": "kubernetes",
  "kubernetis": "kubernetes",
  "kubernestes": "kubernetes",
  "prism": "prisma",
  "prisam": "prisma",
  "migraton": "migration",
  "migratoin": "migration",
  "postgress": "postgres",
  "downtm": "downtime",
  "comunity": "community",
  "communit": "community",
  "commmunity": "community",
  "communuty": "community",
  "apllpllucation": "application",
  "applicatoon": "application",
  "remonber": "remember",
  "persmisons": "permissions",
  "permisions": "permissions",
  "permissons": "permissions",
  "permisons": "permissions",
  "resctriceted": "restricted",
  "restriceted": "restricted",
  "resticted": "restricted",
  "deatisla": "details",
  "detials": "details",
  "uiser": "user",
  "memners": "members",
  "admn": "admin",
  "personlized": "personalized",
  "polss": "polls",
  "pollss": "polls",
  "plls": "polls",
  "votin": "voting",
  "voiting": "voting",
  "announcemnts": "announcements",
  "annicomenst": "announcements",
  "anouncemnts": "announcements",
  "evnts": "events",
  "evnets": "events",
  "evnt": "event",
  "webnar": "webinar",
  "resorce": "resources",
  "resourcs": "resources",
  "downlaod": "download",
  "dwonload": "download",
  "bluprint": "blueprint",
  "bonzai": "bonsai",
  "bonsay": "bonsai",
  "cultivte": "cultivate",
  "reules": "rules",
  "rulez": "rules",
  "guidlines": "guidelines",
};

/**
 * Domain vocabulary used for fuzzy Levenshtein distance recovery
 */
export const DOMAIN_KEYWORDS: string[] = [
  "routine", "daily", "improve", "habits", "productivity", "circadian", "caffeine",
  "latency", "inference", "quantization", "speculative", "decoding", "strategies", "reducing",
  "agent", "agents", "models", "serving", "pipeline", "cache",
  "fastapi", "cors", "middleware", "headers", "origins", "credentials", "errors",
  "kubernetes", "prisma", "migration", "locks", "postgres", "downtime", "deployment",
  "community", "communities", "discussions", "replies", "solutions", "verified", "propose",
  "polls", "voting", "surveys", "ballot", "results",
  "announcements", "broadcast", "pinned", "updates",
  "events", "workshops", "webinar", "schedule", "registration", "rsvp", "meeting",
  "resources", "download", "blueprints", "architecture", "templates", "whitepaper",
  "permissions", "restrictions", "profile", "member", "administrator", "governance", "roles",
  "unanswered", "urgency", "expert", "routing",
  "bonsai", "cultivate", "indoor", "watering", "pruning", "rules", "guidelines", "conduct"
];

/**
 * Curated suggestions for similar query formulations
 */
export const SUGGESTED_QUERY_INTENTS = [
  {
    triggers: ["routine", "daily", "improve", "productivity", "habit", "focus", "caffeine"],
    suggestions: [
      "How can I improve my daily routine?",
      "What is the 3-Block deep work system for engineers?",
      "Managing caffeine timing and circadian rhythms",
    ],
  },
  {
    triggers: ["latency", "inference", "llm", "quantization", "vllm", "cache", "speculative"],
    suggestions: [
      "Strategies for reducing LLM inference latency in multi-turn agents",
      "How to implement FP8 KV-cache quantization with vLLM",
      "Speculative decoding performance benchmarks",
    ],
  },
  {
    triggers: ["cors", "fastapi", "middleware", "header", "origin", "credentials", "react"],
    suggestions: [
      "How to configure CORS middleware in FastAPI and React?",
      "Troubleshooting preflight OPTIONS 405 errors in FastAPI",
      "Handling credentials and cookies across cross-origin requests",
    ],
  },
  {
    triggers: ["kubernetes", "k8s", "prisma", "migration", "lock", "advisory", "postgres"],
    suggestions: [
      "Zero-downtime Prisma migrations in Kubernetes clusters",
      "How to resolve PostgreSQL advisory lock timeouts",
      "Blue-green database deployment strategies",
    ],
  },
  {
    triggers: ["who am i", "my role", "my name", "my profile", "permission", "restriction", "member", "admin"],
    suggestions: [
      "Who am I, what is my role, and what are my permissions?",
      "What actions are regular members restricted from doing?",
      "How does RBAC role promotion work in Nexus?",
    ],
  },
  {
    triggers: ["poll", "voting", "survey", "ballot"],
    suggestions: [
      "What are the active community polls?",
      "How do I vote in community polls?",
      "View live poll results and percentage breakdown",
    ],
  },
  {
    triggers: ["announcement", "pinned", "broadcast", "news"],
    suggestions: [
      "What are the latest pinned announcements?",
      "Who has permissions to post announcements?",
      "Scheduled community maintenance alerts",
    ],
  },
  {
    triggers: ["event", "workshop", "rsvp", "ama", "webinar"],
    suggestions: [
      "What upcoming workshops and AMAs can I RSVP for?",
      "How do I claim a QR attendance ticket?",
      "Joining the Google Meet live event link",
    ],
  },
  {
    triggers: ["resource", "download", "blueprint", "template", "whitepaper"],
    suggestions: [
      "Where can I download community architecture blueprints?",
      "Production Docker Compose and Helm templates",
      "Kubernetes cluster security hardening checklist",
    ],
  },
  {
    triggers: ["unanswered", "urgency", "expert"],
    suggestions: [
      "How does AI urgency scoring work for unanswered questions?",
      "Where is the prioritized unanswered questions feed?",
      "How to become a recognized community expert",
    ],
  },
  {
    triggers: ["bonsai", "tree", "plant", "cultivate"],
    suggestions: [
      "How do I cultivate organic Bonsai trees indoors?",
      "Best soil mix and watering schedule for Bonsai",
      "Pruning and wiring techniques for indoor Bonsai",
    ],
  },
];

/**
 * Derives 2-4 similar query suggestions based on query intent
 */
export function deriveSuggestedQueries(query: string): string[] {
  const q = query.toLowerCase();
  for (const item of SUGGESTED_QUERY_INTENTS) {
    if (item.triggers.some((t) => q.includes(t))) {
      return item.suggestions;
    }
  }

  // Fallback platform suggestions
  return [
    "How can I improve my daily routine?",
    "Strategies for reducing LLM inference latency",
    "Who am I, what is my role, and what are my permissions?",
  ];
}

/**
 * Analyzes natural language input, recorrects spelling & grammatical mistakes,
 * and recovers the user's intended meaning.
 */
export function analyzeAndCorrectQuery(rawQuery: string): {
  correctedQuery: string;
  hasCorrections: boolean;
  didYouMean: string | null;
  suggestedQueries: string[];
  correctionsMade: Array<{ original: string; corrected: string }>;
} {
  const trimmed = (rawQuery || "").trim();
  if (!trimmed) {
    return {
      correctedQuery: "",
      hasCorrections: false,
      didYouMean: null,
      suggestedQueries: [],
      correctionsMade: [],
    };
  }

  let text = trimmed;
  const correctionsMade: Array<{ original: string; corrected: string }> = [];

  // Multi-word phrase substitutions first
  const phrasePairs: [RegExp, string, string][] = [
    [/\bhow\s+2\b/gi, "how to", "how 2"],
    [/\bi\s*m\b/gi, "I am", "im"],
    [/\bwht\s+r\b/gi, "what are", "wht r"],
    [/\bwho\s+r\b/gi, "who are", "who r"],
  ];
  for (const [regex, replacement, original] of phrasePairs) {
    if (regex.test(text)) {
      text = text.replace(regex, replacement);
      correctionsMade.push({ original, corrected: replacement });
    }
  }

  // Word-level substitution and fuzzy matching
  const words = text.split(/\s+/);
  const correctedWords: string[] = [];

  for (const rawWord of words) {
    // Preserve trailing punctuation (e.g. "?", "!", ".")
    const punctMatch = rawWord.match(/([^\w]*)$/);
    const trailingPunct = punctMatch ? punctMatch[0] : "";
    const cleanWord = rawWord.slice(0, rawWord.length - trailingPunct.length).toLowerCase();

    if (!cleanWord) {
      correctedWords.push(rawWord);
      continue;
    }

    // Direct mapping
    if (TYPO_AND_GRAMMAR_MAP[cleanWord]) {
      const target = TYPO_AND_GRAMMAR_MAP[cleanWord];
      correctedWords.push(target + trailingPunct);
      correctionsMade.push({ original: cleanWord, corrected: target });
      continue;
    }

    // Fuzzy matching against domain dictionary
    let matchedDomain: string | null = null;
    if (cleanWord.length >= 4 && !DOMAIN_KEYWORDS.includes(cleanWord)) {
      let lowestDist = Infinity;
      for (const d of DOMAIN_KEYWORDS) {
        const maxAllowed = cleanWord.length <= 5 ? 1 : 2;
        const dist = levenshteinDistance(cleanWord, d);
        if (dist <= maxAllowed && dist < lowestDist) {
          lowestDist = dist;
          matchedDomain = d;
        }
      }
    }

    if (matchedDomain) {
      correctedWords.push(matchedDomain + trailingPunct);
      correctionsMade.push({ original: cleanWord, corrected: matchedDomain });
    } else {
      correctedWords.push(rawWord);
    }
  }

  let reconstructed = correctedWords.join(" ");

  // Grammatically capitalize first letter
  if (reconstructed.length > 0) {
    reconstructed = reconstructed.charAt(0).toUpperCase() + reconstructed.slice(1);
  }

  // Question mark normalization if starts with interrogative
  const lowerRec = reconstructed.toLowerCase();
  const isQuestion = /^(how|what|why|who|where|when|can|is|are|do|does|will|could|should)\b/.test(lowerRec);
  if (isQuestion && !reconstructed.endsWith("?") && !reconstructed.endsWith(".") && !reconstructed.endsWith("!")) {
    reconstructed += "?";
  }

  const hasCorrections = correctionsMade.length > 0;
  const didYouMean = hasCorrections
    ? reconstructed.endsWith("?")
      ? `Did you mean: "${reconstructed}"`
      : `Did you mean: "${reconstructed}"?`
    : null;

  // Generate suggested queries matching intent
  const suggestedQueries = deriveSuggestedQueries(reconstructed || rawQuery);

  return {
    correctedQuery: reconstructed,
    hasCorrections,
    didYouMean,
    suggestedQueries,
    correctionsMade,
  };
}

/**
 * Extract meaningful keyword tokens from natural language text
 */
function extractTokens(text: string, alternateText?: string): string[] {
  const stopwords = new Set([
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "into", "over", "after", "is", "am", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can",
    "could", "should", "would", "how", "what", "why", "when", "where", "who", "which",
    "i", "my", "me", "you", "your", "we", "our", "it", "its", "their", "this", "that"
  ]);

  const combined = `${text || ""} ${alternateText || ""}`;
  return combined
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopwords.has(word));
}

/**
 * Calculate lexical match score between query and document text
 */
function calculateLexicalScore(queryTokens: string[], docText: string): number {
  if (queryTokens.length === 0 || !docText) return 0;
  const docLower = docText.toLowerCase();
  let matches = 0;

  for (const token of queryTokens) {
    if (docLower.includes(token)) {
      matches++;
    }
  }

  return matches / queryTokens.length;
}

/**
 * Detect queries about communities, their rules, polls, announcements, events, resources, or platform features
 */
function checkCommunityAndPlatformQuery(query: string, communityId?: string): { isPlatform: boolean; sources: AssistantSource[] } {
  const q = query.toLowerCase();
  const platformKeywords = [
    "nexus", "platform", "community", "communities", "create community", "new community",
    "verified solution", "verify solution", "problem classification", "duplicate detection",
    "duplicate question", "event", "events", "ama", "rsvp", "poll", "polls", "survey", "surveys",
    "resource", "resources", "unanswered", "expert", "urgency", "rbac", "admin", "moderator",
    "role", "roles", "dark mode", "light mode", "theme", "david thorne", "sarah chen",
    "alex rivera", "marcus vance", "elena rostova", "dual-mode", "offline", "shortcut", "ctrl+k", "feature",
    "features", "app", "application", "how to use", "what is this", "architecture", "rule", "rules",
    "guideline", "guidelines", "code of conduct", "policy", "policies", "announcement", "announcements",
    "broadcast", "pinned", "download", "whitepaper", "blueprint", "cheat sheet"
  ];

  const matches = platformKeywords.some((k) => q.includes(k));
  if (!matches) {
    return { isPlatform: false, sources: [] };
  }

  const sources: AssistantSource[] = [];

  // Determine targeted community
  let targetCommId = communityId;
  if (!targetCommId) {
    if (q.includes("ai engineering") || q.includes("mlops") || q.includes("gemma") || q.includes("vllm")) {
      targetCommId = "c-001";
    } else if (q.includes("fullstack") || q.includes("next.js") || q.includes("nextjs") || q.includes("react")) {
      targetCommId = "c-002";
    } else if (q.includes("cloud native") || q.includes("kubernetes") || q.includes("k8s") || q.includes("devops")) {
      targetCommId = "c-003";
    } else if (q.includes("design systems") || q.includes("ui engineering") || q.includes("figma") || q.includes("token")) {
      targetCommId = "c-004";
    }
  }

  const defaultComm = targetCommId && COMMUNITY_DETAILED_REGISTRY[targetCommId]
    ? COMMUNITY_DETAILED_REGISTRY[targetCommId]
    : COMMUNITY_DETAILED_REGISTRY["c-001"];

  // 0. Member Role Scope & Restrictions
  if ((q.includes("member") || q.includes("user")) && (q.includes("restrict") || q.includes("permission") || q.includes("role") || q.includes("can") || q.includes("allowed") || q.includes("limit") || q.includes("only have"))) {
    sources.push({
      id: "src-rbac-member-restrictions",
      discussion_id: "rbac-roles",
      community_id: defaultComm.id,
      community_name: "Nexus RBAC & Governance",
      title: "Role-Based Access Control: Member Role Scope & Restrictions",
      author_name: "David Thorne (Platform Administrator)",
      excerpt: "Members are restricted from creating/deleting communities, posting announcements, and accessing /admin. Members can join, discuss, reply, vote in polls, RSVP to events, and download resources.",
      relevance_score: 0.99,
      is_verified_solution: true,
      url: `/admin`,
    });
  }

  // 1. Community Rules & Code of Conduct
  if (q.includes("rule") || q.includes("guideline") || q.includes("code of conduct") || q.includes("policy") || q.includes("moderation")) {
    sources.push({
      id: `src-rules-${defaultComm.id}`,
      discussion_id: `rules-${defaultComm.id}`,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: `${defaultComm.name}: Community Guidelines & Code of Conduct`,
      author_name: defaultComm.leaders[0] || "Community Governance",
      excerpt: defaultComm.rules.slice(0, 2).join(" ") + "...",
      relevance_score: 0.98,
      is_verified_solution: true,
      url: `/communities/${defaultComm.id}?tab=about`,
    });
  }

  // 2. Polls & Surveys
  if (q.includes("poll") || q.includes("vote") || q.includes("voting") || q.includes("survey")) {
    const topPoll = defaultComm.polls[0];
    sources.push({
      id: `src-polls-${defaultComm.id}`,
      discussion_id: `polls-${defaultComm.id}`,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: `${defaultComm.name}: Live Community Poll - "${topPoll ? topPoll.question : 'Active Poll'}"`,
      author_name: "Community Engagement",
      excerpt: topPoll
        ? `Active options: ${topPoll.options.map((o) => `${o.text} (${o.percentage}%)`).join(", ")}. Total votes: ${topPoll.total_votes}.`
        : "Real-time voting and polls module.",
      relevance_score: 0.97,
      is_verified_solution: true,
      url: `/communities/${defaultComm.id}?tab=polls`,
    });
  }

  // 3. Announcements
  if (q.includes("announcement") || q.includes("announcements") || q.includes("broadcast") || q.includes("pinned") || q.includes("news")) {
    const topAnn = defaultComm.announcements[0];
    sources.push({
      id: `src-ann-${defaultComm.id}`,
      discussion_id: `ann-${defaultComm.id}`,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: `${defaultComm.name}: Pinned Announcement - "${topAnn ? topAnn.title : 'Updates'}"`,
      author_name: topAnn ? topAnn.author : "Community Lead",
      excerpt: topAnn ? topAnn.content : "Official pinned updates and broadcasts.",
      relevance_score: 0.97,
      is_verified_solution: true,
      url: `/communities/${defaultComm.id}?tab=announcements`,
    });
  }

  // 4. Events & AMAs
  if (q.includes("event") || q.includes("workshop") || q.includes("rsvp") || q.includes("ama") || q.includes("webinar") || q.includes("schedule")) {
    const topEvent = defaultComm.events[0];
    sources.push({
      id: "src-platform-events",
      discussion_id: `event-${topEvent ? topEvent.id : 'global'}`,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: topEvent ? `${topEvent.title} (${topEvent.date})` : "Interactive Events & Virtual Workshops Hub",
      author_name: topEvent ? topEvent.host : "Platform Director",
      excerpt: topEvent
        ? `${topEvent.description} Date: ${topEvent.date} at ${topEvent.time}. Online meeting link: ${topEvent.meeting_link}. RSVP: ${topEvent.attendees}/${topEvent.max_attendees} registered.`
        : "Browse upcoming live workshops, track RSVPs, and join Google Meet virtual sessions directly at /events.",
      relevance_score: 0.98,
      is_verified_solution: true,
      url: topEvent ? `/communities/${defaultComm.id}?tab=events` : "/events",
    });
  }

  // 5. Downloadable Resources
  if (q.includes("resource") || q.includes("download") || q.includes("whitepaper") || q.includes("blueprint") || q.includes("cheat sheet") || q.includes("file")) {
    const topRes = defaultComm.resources[0];
    sources.push({
      id: `src-res-${defaultComm.id}`,
      discussion_id: `res-${defaultComm.id}`,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: `${defaultComm.name}: Download Resource - "${topRes ? topRes.title : 'Repository'}"`,
      author_name: "Community Artifacts",
      excerpt: topRes
        ? `${topRes.description} Format: ${topRes.file_type} (${topRes.file_size}). ${topRes.downloads} total downloads.`
        : "Download architecture blueprints, production cheat sheets, and deployment scripts.",
      relevance_score: 0.96,
      is_verified_solution: true,
      url: `/communities/${defaultComm.id}?tab=resources`,
    });
  }

  // 6. Urgency & Unanswered
  if (q.includes("unanswered") || q.includes("urgent") || q.includes("expert") || q.includes("routing") || q.includes("aging")) {
    sources.push({
      id: "src-platform-unanswered",
      discussion_id: "unanswered",
      community_id: "c-global",
      community_name: "Prioritized Unanswered Feed",
      title: "AI Urgency Prioritization & Expert Routing Engine",
      author_name: "Lead Architect Dr. Sarah Chen",
      excerpt: "Dynamically prioritizes unanswered questions using an algorithmic urgency score (0-100) and routes notifications to verified domain experts at /unanswered.",
      relevance_score: 0.95,
      is_verified_solution: true,
      url: "/unanswered",
    });
  }

  // 7. Admin & RBAC & User Identity
  if (q.includes("admin") || q.includes("role") || q.includes("rbac") || q.includes("permission") || q.includes("create community") || q.includes("new community") || q.includes("who am i") || q.includes("my profile") || q.includes("my account") || q.includes("user detail") || q.includes("my name")) {
    sources.push({
      id: "src-platform-admin",
      discussion_id: "admin",
      community_id: "c-global",
      community_name: "Admin & Governance Portal",
      title: "Role-Based Access Control (RBAC) & User Profile Session",
      author_name: "David Thorne (Admin)",
      excerpt: "Personalized user session details, active platform role, permissions matrix, and community governance controls.",
      relevance_score: 0.98,
      is_verified_solution: true,
      url: "/profile",
    });
  }

  // 8. Verified Solutions
  if (q.includes("verified solution") || q.includes("solution") || q.includes("problem classification") || q.includes("propose")) {
    sources.push({
      id: "src-platform-solutions",
      discussion_id: "d-501",
      community_id: "c-003",
      community_name: "Cloud Native & Kubernetes Core",
      title: "Problem Classification & Solution Verification Workflow",
      author_name: "Alex Rivera",
      excerpt: "Discussions can be classified as 'problem', 'question', or 'discussion'. Members submit proposed solutions with step-by-step checklists, and the OP marks them verified with 1-5 star ratings.",
      relevance_score: 0.93,
      is_verified_solution: true,
      url: "/communities/c-003/discussions/d-501",
    });
  }

  // 9. AI Duplicate Detection
  if (q.includes("duplicate") || q.includes("similarity")) {
    sources.push({
      id: "src-platform-duplicate",
      discussion_id: "d-401",
      community_id: "c-002",
      community_name: "Fullstack Next.js & React 19",
      title: "Real-time AI Duplicate Question Detection",
      author_name: "AI Engineering Core",
      excerpt: "As you compose a discussion title and content, semantic embedding analysis proactively searches for duplicate questions to prevent redundant threads.",
      relevance_score: 0.94,
      is_verified_solution: true,
      url: "/communities/c-002/discussions/d-401",
    });
  }

  if (sources.length === 0) {
    sources.push({
      id: `src-${defaultComm.id}-overview`,
      discussion_id: defaultComm.id,
      community_id: defaultComm.id,
      community_name: defaultComm.name,
      title: `${defaultComm.name}: Directory & Overview`,
      author_name: defaultComm.leaders[0] || "Nexus Community Lead",
      excerpt: defaultComm.description,
      relevance_score: 0.92,
      is_verified_solution: true,
      url: `/communities/${defaultComm.id}`,
    });
  }

  return { isPlatform: true, sources };
}

/**
 * Search relevant community discussions & replies from DB and fallback knowledge
 */
async function retrieveCommunityContext(
  query: string,
  communityId?: string,
  history?: Array<{ role: string; content: string }>,
  correctedQuery?: string
): Promise<{ sources: AssistantSource[]; bestScore: number }> {
  // If query is a follow-up, blend recent context
  let contextBlendedQuery = query;
  if (history && history.length > 0) {
    const recentUserMessages = history
      .filter((h) => h.role === "user")
      .slice(-2)
      .map((h) => h.content)
      .join(" ");
    contextBlendedQuery = `${query} ${recentUserMessages}`;
  }

  const queryTokens = extractTokens(contextBlendedQuery, correctedQuery);
  const sources: AssistantSource[] = [];
  let bestScore = 0;

  // Check if query is about communities, rules, polls, announcements, events, resources, or platform features
  const platformCheck = checkCommunityAndPlatformQuery(
    correctedQuery ? `${query} ${correctedQuery}` : query,
    communityId
  );
  if (platformCheck.isPlatform) {
    sources.push(...platformCheck.sources);
    bestScore = Math.max(bestScore, 0.92);
  }

  // 1. Try querying Prisma database first
  try {
    const dbDiscussions = await prisma.discussions.findMany({
      where: communityId ? { community_id: communityId } : undefined,
      take: 20,
      orderBy: { created_at: "desc" },
      include: {
        author: {
          select: { id: true, full_name: true, avatar_url: true },
        },
        community: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        replies: {
          take: 3,
          include: {
            author: { select: { id: true, full_name: true, avatar_url: true } },
          },
        },
      },
    });

    for (const d of dbDiscussions) {
      const tagsStr = ((d as any).tags || []).map((t: any) => t.tag?.name).filter(Boolean).join(" ");
      const repliesStr = (d.replies || []).map((r: any) => `${r.author?.full_name}: ${r.content}`).join(" ");
      const combinedDoc = `${d.title} ${d.content} ${tagsStr} ${repliesStr}`;

      const lexScore = calculateLexicalScore(queryTokens, combinedDoc);
      let simScore = 0;

      // Optional semantic similarity
      try {
        const [qEmb, dEmb] = await Promise.all([
          generateTextEmbedding(query),
          generateTextEmbedding(d.title + " " + d.content.slice(0, 300)),
        ]);
        if (qEmb && dEmb) {
          simScore = Math.max(0, cosineSimilarity(qEmb.embedding, dEmb.embedding));
        }
      } catch (_) {}

      const compositeScore = simScore > 0 ? simScore * 0.65 + lexScore * 0.35 : lexScore;

      if (compositeScore > bestScore) {
        bestScore = compositeScore;
      }

      // Check if relevant enough
      if (compositeScore >= 0.28 || lexScore >= 0.35) {
        sources.push({
          id: `src-${d.id}`,
          discussion_id: d.id,
          community_id: d.community_id,
          community_name: d.community?.name || "Community Space",
          title: d.title,
          author_name: d.author?.full_name || "Community Member",
          author_avatar: d.author?.avatar_url,
          excerpt: d.content.slice(0, 180) + (d.content.length > 180 ? "..." : ""),
          relevance_score: Math.min(1, Math.round(compositeScore * 100) / 100),
          is_verified_solution: (d as any).verified_solution_id != null,
          url: `/communities/${d.community_id}/discussions/${d.id}`,
        });
      }
    }
  } catch (err: any) {
    console.warn("DB query during assistant retrieval failed or DB empty, checking fallback knowledge base:", err.message);
  }

  // 2. Supplement / Fallback with curated default community knowledge
  for (const item of DEFAULT_COMMUNITY_KNOWLEDGE) {
    if (communityId && item.community_id !== communityId) continue;

    const tagsStr = item.tags.join(" ");
    const repliesStr = item.replies.map((r) => `${r.author_name}: ${r.content}`).join(" ");
    const combinedDoc = `${item.title} ${item.content} ${tagsStr} ${repliesStr}`;

    const lexScore = calculateLexicalScore(queryTokens, combinedDoc);
    let simScore = 0;

    // Check key phrase matches (e.g. daily routine, productivity, habits, llm latency, cors, etc.)
    const lowerQuery = `${query} ${contextBlendedQuery}`.toLowerCase();
    let semanticBoost = 0;
    if (lowerQuery.includes("routine") || lowerQuery.includes("daily") || lowerQuery.includes("productivity") || lowerQuery.includes("habit") || lowerQuery.includes("circadian") || lowerQuery.includes("caffeine") || lowerQuery.includes("deep work") || lowerQuery.includes("morning")) {
      if (item.id === "d-103") semanticBoost = 0.65;
    } else if (lowerQuery.includes("latency") || lowerQuery.includes("llm") || lowerQuery.includes("infer") || lowerQuery.includes("cache")) {
      if (item.id === "d-101") semanticBoost = 0.65;
    } else if (lowerQuery.includes("react") || lowerQuery.includes("server action") || lowerQuery.includes("optimistic")) {
      if (item.id === "d-201") semanticBoost = 0.65;
    } else if (lowerQuery.includes("cors") || lowerQuery.includes("cross-origin") || lowerQuery.includes("fastapi")) {
      if (item.id === "d-401") semanticBoost = 0.65;
    } else if (lowerQuery.includes("k8s") || lowerQuery.includes("migration") || lowerQuery.includes("prisma")) {
      if (item.id === "d-301") semanticBoost = 0.65;
    } else if (lowerQuery.includes("electricity") || lowerQuery.includes("bill") || lowerQuery.includes("energy")) {
      if (item.id === "d-501") semanticBoost = 0.65;
    }

    const compositeScore = Math.max(lexScore, semanticBoost);

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
    }

    if (compositeScore >= 0.35 && !sources.some((s) => s.discussion_id === item.id)) {
      const topReply = item.replies[0];
      sources.push({
        id: `src-${item.id}`,
        discussion_id: item.id,
        community_id: item.community_id,
        community_name: item.community_name,
        title: item.title,
        author_name: item.author_name,
        author_avatar: item.author_avatar,
        excerpt: (topReply ? topReply.content : item.content).slice(0, 180) + "...",
        relevance_score: Math.min(1, Math.round(compositeScore * 100) / 100),
        is_verified_solution: item.replies.some((r) => r.is_verified_solution),
        url: `/communities/${item.community_id}/discussions/${item.id}`,
      });
    }
  }

  // Sort sources by relevance score descending
  sources.sort((a, b) => b.relevance_score - a.relevance_score);

  return { sources: sources.slice(0, 3), bestScore };
}

/**
 * Generate context-aware follow-up suggestions
 */
function generateFollowUpSuggestions(query: string, isCommunityBacked: boolean): string[] {
  const q = query.toLowerCase();

  if (q.includes("rule") || q.includes("guideline") || q.includes("conduct") || q.includes("policy")) {
    return [
      "What are the rules for AI Engineering vs Cloud Native?",
      "How do guidelines enforce solution verification honesty?",
      "Where can I review full community policies?",
    ];
  }

  if (q.includes("poll") || q.includes("vote") || q.includes("survey")) {
    return [
      "How do I create a new poll in my community?",
      "What are the current poll results in React 19?",
      "Can members vote multiple times or change their vote?",
    ];
  }

  if (q.includes("announcement") || q.includes("news") || q.includes("broadcast") || q.includes("pinned")) {
    return [
      "Who has permissions to post pinned announcements?",
      "What is the latest announcement in AI Engineering?",
      "Are there scheduled cluster maintenance notices?",
    ];
  }

  if (q.includes("event") || q.includes("workshop") || q.includes("rsvp") || q.includes("ama") || q.includes("schedule")) {
    return [
      "How do I RSVP and view my digital QR ticket?",
      "What virtual platform is used for live workshops?",
      "Where can I find the full global events calendar?",
    ];
  }

  if (q.includes("resource") || q.includes("download") || q.includes("whitepaper") || q.includes("blueprint")) {
    return [
      "Where can I download the vLLM Helm template?",
      "Are community resources free to download?",
      "How do I upload a new technical guide?",
    ];
  }

  if (q.includes("nexus") || q.includes("platform") || q.includes("community") || q.includes("feature") || q.includes("admin") || q.includes("create")) {
    return [
      "How do verified solutions work?",
      "How can admins create a new community?",
      "How does the unanswered questions algorithm work?",
      "What are the upcoming technical events?",
    ];
  }

  if (q.includes("routine") || q.includes("daily") || q.includes("habit") || q.includes("productivity")) {
    return [
      "How do I structure the 3-Block deep work window?",
      "What are the best tips to beat afternoon brain fog?",
      "Can you show me the discussion on circadian rhythms?",
      "How do you design an effective shutdown routine?",
    ];
  }

  if (q.includes("latency") || q.includes("llm") || q.includes("infer") || q.includes("streaming")) {
    return [
      "How does speculative decoding improve first-token latency?",
      "What are recommended tools for semantic caching?",
      "How does FP8 KV-cache quantization affect model accuracy?",
    ];
  }

  if (q.includes("cors") || q.includes("cross-origin") || q.includes("fastapi")) {
    return [
      "What CORS settings are required for authentication cookies?",
      "How do I debug preflight HTTP OPTIONS 405 errors?",
      "Can you provide a minimal FastAPI CORSMiddleware snippet?",
    ];
  }

  if (q.includes("react") || q.includes("next") || q.includes("action") || q.includes("optimistic")) {
    return [
      "How does useOptimistic handle rollback on server errors?",
      "When should I use Server Actions vs Route Handlers?",
      "Can you share best practices for React 19 transitions?",
    ];
  }

  if (q.includes("bill") || q.includes("electric") || q.includes("power") || q.includes("water heater")) {
    return [
      "How do I test water heater elements with a multimeter?",
      "What is the step-by-step breaker isolation test?",
      "How can I check if my utility switched to Time-of-Use rates?",
    ];
  }

  if (!isCommunityBacked) {
    return [
      "Would you like recommendations on starting a discussion for this?",
      "Can you suggest a related Nexus community to join?",
      "Can you provide actionable next steps on this topic?",
    ];
  }

  return [
    "Can you explain the first recommendation in more detail?",
    "Are there other community members who solved this problem?",
    "What troubleshooting steps are recommended next?",
  ];
}

/**
 * Synthesizes concise, helpful answer
 */
function synthesizeResponse(
  query: string,
  sources: AssistantSource[],
  isCommunityBacked: boolean,
  history?: Array<{ role: string; content: string }>,
  user_profile?: AssistantUserProfile,
  correctedQuery?: string
): { answer: string; missingInfoNote?: string } {
  const effectiveQuery = (correctedQuery ? `${query} ${correctedQuery}` : query).toLowerCase();
  const q = effectiveQuery;
  const userName = user_profile?.name ? user_profile.name.split(" ")[0] : "";
  const greeting = userName ? `Hi ${userName}! ` : "";
  const isAdmin = user_profile?.role?.toLowerCase() === "admin";
  const interpretationPrefix =
    correctedQuery && correctedQuery.toLowerCase() !== query.toLowerCase()
      ? `> 💡 **Did you mean:** *"${correctedQuery}"*  \n*(Automatically corrected typos & grammatical mistakes in your input)*\n\n`
      : "";

  // 0. User Profile & Identity Intent Check
  const isProfileQuery =
    q.includes("who am i") ||
    q.includes("my name") ||
    q.includes("my role") ||
    q.includes("my profile") ||
    q.includes("my account") ||
    q.includes("my detail") ||
    q.includes("what is my role") ||
    q.includes("what is my name") ||
    q.includes("who is logged in") ||
    q.includes("what are my permission") ||
    q.includes("what can i do") ||
    q.includes("about me");

  if (isProfileQuery && user_profile && user_profile.name) {
    const roleLabel = isAdmin ? "Administrator" : "Member";
    return {
      answer: `${greeting}Here are your active **Nexus Account & Profile Details** loaded into this AI session:

### 👤 User Identity & Profile:
* **Full Name**: **${user_profile.name}**
* **Email Address**: \`${user_profile.email || "Not specified"}\`
* **Account Role**: **${roleLabel}** ${isAdmin ? "🛡️ *(Full Administrative Access)*" : "👤 *(Standard Community Member)*"}
* **Bio / Technical Focus**: ${user_profile.bio || "Software Engineer & Community Participant"}
* **Session Status**: 🟢 Active & Authenticated

---

### 🔐 Your Role & Platform Permissions (${roleLabel}):
${
  isAdmin
    ? `As an **Administrator**, you have unrestricted platform governance capabilities:
* **Admin Control Center**: Access \`/admin\` to inspect platform metrics, audit trails, and user management.
* **Role Governance**: Promote or demote user roles between Member and Administrator.
* **Community Creation & Management**: Create new community hubs via the navbar or \`/admin\`, edit metadata, and archive/delete spaces.
* **Moderation & Announcements**: Pin, lock, or delete any discussion thread, and broadcast global announcements.
* **Content Participation**: Propose solutions, vote on polls, host live workshops, and upload architecture resources.`
    : `As a **Member**, your account is configured for collaborative participation with standard community guardrails:
* **Allowed Actions**:
  - Join and follow technical communities (\`/communities\`).
  - Create technical discussions and format posts with markdown code blocks.
  - Propose solutions to open problems with step-by-step checklists.
  - Vote in active community polls and see real-time vote percentage tallies.
  - RSVP for live workshops and AMAs to claim digital QR tickets.
  - Download verified community resources, blueprints, and templates.
* **Role Restrictions**:
  - Regular members cannot create new community spaces (reserved for Administrators).
  - Regular members cannot post platform/community announcements.
  - Regular members cannot access \`/admin\` or alter other members' posts, polls, or roles.`
}

Feel free to ask me any questions tailored to your **${roleLabel}** capabilities!`,
    };
  }

  // SCENARIO 1: Relevant community content found!
  if (isCommunityBacked && sources.length > 0) {
    // 0. Member Role Scope & Restrictions
    if ((q.includes("member") || q.includes("user")) && (q.includes("restrict") || q.includes("permission") || q.includes("limit") || q.includes("allow") || q.includes("can member") || q.includes("only have") || q.includes("scope"))) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      return {
        answer: `${greeting}In **Nexus Community Platform**, the **Member** role is intentionally **restricted** to ensure structured community governance, prevent spam, and maintain technical integrity:

### 🚫 Restricted Actions (What Members CANNOT Do):
1. **Cannot Create Communities**: Founding new technical communities is strictly restricted to platform **Administrators** (via \`/admin\` or the \`+ New Community\` button).
2. **Cannot Broadcast Announcements**: Publishing pinned, high-priority announcements is restricted to **Administrators** and verified **Community Owners**. Regular members cannot broadcast announcements.
3. **Cannot Access Admin Control Center**: Accessing \`/admin\`, suspending accounts, promoting roles, or altering the RBAC permissions matrix is restricted to **Administrators**.
4. **Cannot Delete or Modify Other Users' Content**: Members cannot delete, edit, or lock discussions, replies, polls, or events created by other members.
5. **Cannot Alter Community Metadata**: Modifying community names, banners, join rules, or visibility settings (\`public\` / \`private\`) is restricted to **Administrators**.

---

### ✅ Permitted Actions (What Members CAN Do):
* **Join & Follow Spaces**: Join any public community and participate in technical discourse.
* **Create Discussions**: Ask questions, post technical findings, and share code snippets with rich markdown formatting.
* **Propose Solutions**: Submit step-by-step checklists to resolve community problem threads.
* **Vote in Polls**: Cast live ballots on active community polls and view real-time vote percentage distributions.
* **Register for Events**: RSVP for upcoming workshops & AMAs and claim digital QR attendance tickets.
* **Download Resources**: Access and download community architecture blueprints, Helm charts, and design token packages.

${
  !isAdmin
    ? `\n> **Notice for your account**: Your current profile is assigned the **Member** role, so the administrative restrictions above apply to your account.`
    : `\n> **Notice for your account**: You are currently signed in with the **Administrator** role, granting you unrestricted access across all platform modules.`
}

Review full governance policies under the **About** tab at \`/communities/${targetComm.id}?tab=about\` or in the **Admin Portal** at \`/admin\`.`,
      };
    }
    // 1. Community Rules & Code of Conduct
    if (q.includes("rule") || q.includes("guideline") || q.includes("code of conduct") || q.includes("policy")) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      return {
        answer: `${greeting}Here are the official **Community Rules & Standards** for **${targetComm.name}** (and Nexus platform governance):

### Community Rules (${targetComm.name}):
${targetComm.rules.map((r) => `* **${r.split(":")[0]}**: ${r.split(":").slice(1).join(":")}`).join("\n")}

### Universal Nexus Platform Code of Conduct:
* **Constructive Collaboration**: Critique architectures, code snippets, and system designs—never individuals.
* **Reproduction Standards**: When posting technical problems, always include minimal code reproductions, runtime versions, and sanitized stack traces.
* **Verification Honesty**: Mark solutions as **Verified** only after you have tested and confirmed they work in practice.
* **Security & Confidentiality**: Never post production API secrets, private encryption keys, or customer PII.

Review full community details under the **About** tab at \`/communities/${targetComm.id}?tab=about\`.`,
      };
    }

    // 2. Polls & Voting
    if (q.includes("poll") || q.includes("voting") || q.includes("survey")) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      const poll = targetComm.polls[0];
      return {
        answer: `${greeting}Here are the active community polls in **${targetComm.name}**:

### 📊 Active Poll: "${poll.question}"
* **Total Votes**: **${poll.total_votes} votes recorded**
* **Format**: Single-Choice Real-time Poll

**Live Results Breakdown:**
${poll.options.map((o) => `* **${o.text}**: ${o.percentage}% (${o.votes} votes)`).join("\n")}

${targetComm.polls[1] ? `### Secondary Poll: "${targetComm.polls[1].question}"
* **Total Votes**: ${targetComm.polls[1].total_votes} votes
* **Leader**: ${targetComm.polls[1].options[0].text} (${targetComm.polls[1].options[0].percentage}%)` : ""}

### How Polls Work in Nexus:
* **Vote Live**: Head to the **Polls** tab on any community page to vote and see percentage bars update instantly.
* **Create a Poll**: Community members can launch polls using the **+ Create Poll** button inside the polls widget.

Participate directly in the **Polls tab** at \`/communities/${targetComm.id}?tab=polls\`!`,
      };
    }

    // 3. Announcements
    if (q.includes("announcement") || q.includes("news") || q.includes("broadcast") || q.includes("pinned")) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      return {
        answer: `${greeting}Here are the official announcements from **${targetComm.name}**:

${targetComm.announcements.map((a) => `### ${a.title} ${a.is_pinned ? "📌 *(Pinned)*" : ""}
* **Published by**: ${a.author} on ${a.date}
* **Details**: ${a.content}`).join("\n\n")}

### Community Broadcasts:
Community admins and leads pin crucial architecture decisions and release dates under the **Announcements** tab at \`/communities/${targetComm.id}?tab=announcements\`.`,
      };
    }

    // 4. Events & AMAs
    if (q.includes("event") || q.includes("workshop") || q.includes("rsvp") || q.includes("ama") || q.includes("webinar") || q.includes("schedule")) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      return {
        answer: `${greeting}Here are upcoming workshops and live AMAs in **${targetComm.name}** and across the Nexus Platform:

${targetComm.events.map((e) => `### 🗓️ ${e.title}
* **Host**: ${e.host}
* **Date & Time**: ${e.date} (${e.time})
* **Location**: ${e.is_online ? "🌐 Virtual (Google Meet)" : "🏢 In-Person"} | [Meeting Room](${e.meeting_link})
* **RSVP Status**: **${e.attendees} / ${e.max_attendees} spots reserved**
* **Session Brief**: ${e.description}`).join("\n\n")}

### Nexus Event Features:
* **One-Click RSVP**: Confirm registration and receive a digital ticket with a QR code for check-in.
* **Virtual Integration**: Automated Google Meet calendar notifications.
* **Live Analytics**: Hosts can monitor real-time attendance velocity and waitlists.

Reserve your spot in the **Events Hub** at \`/events\` or the community tab at \`/communities/${targetComm.id}?tab=events\`!`,
      };
    }

    // 5. Downloadable Resources
    if (q.includes("resource") || q.includes("download") || q.includes("whitepaper") || q.includes("blueprint") || q.includes("cheat sheet") || q.includes("file")) {
      let targetComm = COMMUNITY_DETAILED_REGISTRY["c-001"];
      if (q.includes("next") || q.includes("react") || q.includes("fullstack")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-002"];
      else if (q.includes("kubernetes") || q.includes("k8s") || q.includes("cloud native") || q.includes("devops")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-003"];
      else if (q.includes("design") || q.includes("ui") || q.includes("token") || q.includes("figma")) targetComm = COMMUNITY_DETAILED_REGISTRY["c-004"];

      return {
        answer: `${greeting}Here are the verified architecture blueprints and guides available in **${targetComm.name}**:

${targetComm.resources.map((r) => `### 📦 ${r.title}
* **Category**: ${r.category} | **Format**: \`${r.file_type}\` (${r.file_size})
* **Downloads**: ${r.downloads} downloads
* **Description**: ${r.description}`).join("\n\n")}

### How to Access:
Navigate to the **Resources** tab at \`/communities/${targetComm.id}?tab=resources\` to download any package directly!`,
      };
    }
    if (q.includes("create community") || q.includes("new community") || q.includes("how to create a community")) {
      return {
        answer: `${greeting}In **Nexus Community Platform**, creating a new community space is governed by Role-Based Access Control (RBAC):

1. **Permission Check**: ${
          isAdmin
            ? "**You are currently an Administrator**, so you have full permissions to create and manage communities directly!"
            : "Creating a community is an administrative action reserved for platform **Admins** (such as David Thorne)."
        }
2. **Creation Workflow**:
   * Click the purple **+ New Community** button in the top navigation bar, or navigate to the **Admin Portal** (\`/admin\`).
   * Complete the modal fields: Community Name, Topic Category, Rich Description, Public/Private visibility, and join rules.
   * Choose a high-resolution banner preset or custom URL.
3. **Auto-Provisioning**: Upon creation, discussion threads, poll widgets, event calendars, and resource distribution repositories are automatically initialized for that community space.

Explore the **Admin Portal** link below to manage spaces and permissions!`,
      };
    }

    if (q.includes("verified solution") || q.includes("verify solution") || q.includes("problem classification")) {
      return {
        answer: `${greeting}**Verified Solutions & Problem Classification** is a core technical feature of Nexus:

* **Post Classification**: Every discussion can be tagged as a **Problem**, **Question**, or **Discussion**.
* **Problem Lifecycle**: Problems advance through clear states: \`open\` ➔ \`solution_proposed\` ➔ \`verified_solved\` (or \`unresolved\`).
* **Solution Proposals**: Any community member can submit a structured solution containing step-by-step reproduction instructions and expected outcomes.
* **Author Verification**: The original poster can review proposed fixes and mark them as **Verified Solution**, assigning an effectiveness rating (1–5 stars) and a feedback note.
* **Proactive Retrieval**: When users type new problem symptoms, our AI engine proactively surfaces verified solutions to resolve issues before posting duplicates!

See the verified solution discussions linked below for real-world examples.`,
      };
    }

    if (q.includes("unanswered") || q.includes("urgency") || q.includes("expert routing")) {
      return {
        answer: `${greeting}The **Unanswered Questions & Expert Prioritization** module (\`/unanswered\`) prevents technical questions from being abandoned:

* **Urgency Scoring (0–100)**: Computes dynamic urgency based on time elapsed without replies, post classification, complexity, and member engagement.
* **Smart Expert Routing**: Matches question tags with community member expertise profiles (based on past helpful answers and topic scores).
* **Automated Notifications**: Dispatches high-priority notifications to matched experts to accelerate time-to-first-answer.
* **Evaluation Metrics**: Tracks platform-wide metrics (reducing average resolution time from 38.4h to 4.6h).

Check out the **Prioritized Unanswered Feed** at \`/unanswered\` to contribute your expertise!`,
      };
    }

    if (q.includes("event") || q.includes("workshop") || q.includes("rsvp") || q.includes("ama")) {
      return {
        answer: `${greeting}The **Nexus Events & AMAs** module (\`/events\`) hosts live technical workshops and webinars:

* **Interactive Calendar**: Browse upcoming virtual sessions, community AMAs, and architecture roundtables across all spaces.
* **One-Click RSVP**: Track attendee counts, manage your registration, and receive automated schedule notifications.
* **Virtual Integration**: Direct Google Meet and calendar integrations for live workshops.

Visit the **Events Calendar** at \`/events\` to explore upcoming sessions!`,
      };
    }

    if (q.includes("what is nexus") || q.includes("about nexus") || q.includes("features of nexus") || q.includes("what communities") || q.includes("communities available")) {
      return {
        answer: `${greeting}**Nexus Community Platform** is an enterprise-grade collaborative hub for engineers, creators, systems architects, and technology leaders.

### Core Communities Available:
1. **AI Engineering & MLOps** (\`/communities/c-001\`): Fine-tuning LLMs, inference latency optimization, and evaluation pipelines.
2. **Fullstack Next.js & React 19** (\`/communities/c-002\`): React Server Components, App Router, useActionState, useOptimistic, and CORS configuration.
3. **Cloud Native & Kubernetes Core** (\`/communities/c-003\`): Production incident post-mortems, GitOps, zero-downtime Prisma migrations, and hardware diagnostics.
4. **Design Systems & UI Engineering** (\`/communities/c-004\`): Design tokens, micro-interactions, accessible UI components.

### Platform Highlights:
* **Interactive Modules**: Technical discussions, live events & AMAs, real-time polls & surveys, downloadable resources.
* **Verified Solutions**: Step-by-step checklists, 1–5 star ratings, and proactive solution discovery.
* **AI Duplicate Question Detection**: Semantic checks prevent redundant threads.
* **AI-Powered Urgency Routing**: High-urgency unanswered question prioritization at \`/unanswered\`.
* **Dual-Mode Engine**: Real-time PostgreSQL database with seamless offline demo preview engine.
* **Theme Support**: Dark & Light mode toggle in the header.`,
      };
    }

    if (q.includes("circadian") || q.includes("caffeine") || q.includes("morning light") || q.includes("adenosine")) {
      return {
        answer: `${greeting}In **AI Engineering & MLOps**, Dr. Sarah Chen shared her community-verified morning protocol:

* **Morning Natural Light (0–30 min upon waking)**: Getting 15 minutes of outdoor sunlight resets the master circadian clock (SCN) and anchors your cortisol rhythm, eliminating the 3:00 PM energy slump.
* **Delayed Caffeine Window (60–90 min post-waking)**: Adenosine levels are still clearing in the first hour after waking. Waiting 60–90 minutes before your first coffee prevents adenosine rebound crashes later in the day.
* **Hydration Protocol**: Rehydrate with 500ml of water and electrolytes before your first deep work session.

Refer to the source discussion and comments below for the full discussion thread!`,
      };
    }

    // Check specific topics
    if (q.includes("routine") || q.includes("daily") || q.includes("productivity") || q.includes("habit") || q.includes("deep work") || q.includes("focus")) {
      return {
        answer: `${greeting}Based on discussions in the **AI Engineering & MLOps** community, here are the most effective, community-verified strategies to optimize your daily routine:

### 1. The 3-Block Deep Work System (Recommended by Alex Rivera)
* **Block 1: Deep Work (9:00 AM – 11:30 AM)**: Strict no-meetings window dedicated solely to your highest-complexity architectural problems.
* **Block 2: Collaboration & Reviews (1:00 PM – 3:00 PM)**: Group code reviews, sprint syncs, and mentorship when cognitive energy naturally dips.
* **Block 3: Shutdown Routine (5:00 PM – 5:30 PM)**: Review tomorrow's top 3 priorities, close tabs, and achieve clean mental disconnection.

### 2. Circadian Rhythm & Energy Management (Recommended by Dr. Sarah Chen)
* **Morning Light Exposure**: Get 15 minutes of outdoor sunlight within 30 minutes of waking to anchor cortisol and eliminate the 3:00 PM brain fog.
* **Delayed Caffeine Intake**: Delay your first coffee by 60–90 minutes post-waking to avoid midday adenosine crashes.

Check out the original community discussions and comments below for complete implementation details and peer discussion!`,
      };
    }

    if (q.includes("latency") || q.includes("llm") || q.includes("infer") || q.includes("streaming")) {
      return {
        answer: `According to community benchmarks shared in **AI Engineering & MLOps**, here are proven production techniques to slash LLM multi-turn latency:

1. **Semantic Caching**: Yields a **42% reduction** in latency for repeated or overlapping contextual queries.
2. **vLLM PagedAttention v2**: Delivers **2.3x throughput gains** under high concurrent user loads.
3. **Speculative Decoding**: Accelerates first-token generation by **1.7x** with minimal compute overhead.
4. **FP8 KV-Cache Quantization**: (Verified by Dr. Sarah Chen) Cuts memory bandwidth by up to **60%** on 8k+ token prompts.

Explore the linked source discussions below for benchmark scripts and configuration examples.`,
      };
    }

    if (q.includes("cors") || q.includes("cross-origin") || q.includes("fastapi")) {
      return {
        answer: `Community members in **Fullstack Next.js & React 19** have documented verified fixes for cross-origin errors:

* **Configure FastAPI \`CORSMiddleware\`**: Set explicit origins (e.g., \`["http://localhost:3000"]\`), avoid trailing slashes, and set \`allow_credentials=True\`.
* **Handle Custom Headers**: Ensure headers like \`Authorization\` and \`Content-Type\` are in \`allow_headers\`.
* **Preflight Requests**: Ensure your server handles HTTP \`OPTIONS\` requests without requiring authentication credentials.

See the linked post and troubleshooting steps below.`,
      };
    }

    if (q.includes("react") || q.includes("next") || q.includes("action") || q.includes("optimistic")) {
      return {
        answer: `In **Fullstack Next.js & React 19**, Dr. Sarah Chen and community engineers recommend:

* **React 19 Server Actions with \`useActionState\`**: Replace heavy client state boilerplate with direct server mutations.
* **Instant Feedback with \`useOptimistic\`**: Immediately update UI state (e.g. comment counts, votes) before server response.
* **Graceful Rollback**: Wrap transitions with error boundaries and automatic state recovery on network timeouts.

Refer to the source discussions below for code snippets and transition rollback patterns.`,
      };
    }

    if (q.includes("k8s") || q.includes("migration") || q.includes("prisma")) {
      return {
        answer: `In **Cloud Native & Kubernetes Core**, DevOps lead Marcus Vance recommends:

* **Distributed Advisory Locks**: Prevent race conditions when multiple pods run migrations in init-containers.
* **Isolated Rollout Jobs**: Separate DB migrations from pod lifecycle into Kubernetes \`Job\` manifests.
* **Expand-and-Contract Pattern**: Never alter existing columns in the same release as code changes.

Review the full architectural post below.`,
      };
    }

    if (q.includes("electricity") || q.includes("bill") || q.includes("energy") || q.includes("water heater")) {
      return {
        answer: `Based on a verified solution in **Cloud Native & Kubernetes Core** by Alex Rivera and David Thorne:

* **Diagnose Grounded Water Heater Element**: A corroded heating element can pull a continuous 4.5 kW load 24/7 without tripping any circuit breakers.
* **Step-by-Step Test**: Turn off the double-pole water heater breaker and inspect your electric meter pulse rate for an immediate baseline drop.
* **Resistance Check**: Disconnect power and measure terminal resistance to ground with a multimeter. Replacing the element ($25 part) restored normal bills.

Review the original diagnostic checklist and comments linked below.`,
      };
    }

    // Generic community-grounded synthesis
    const sourceTitles = sources.map((s, idx) => `[${idx + 1}] **${s.title}** (by ${s.author_name} in *${s.community_name}*)`).join("\n");
    return {
      answer: `Here are the key takeaways from relevant Nexus community discussions:

${sources.map((s) => `* **${s.title}**: ${s.excerpt}`).join("\n\n")}

**Source Discussions:**
${sourceTitles}

You can click any of the source cards below to read the original discussions and contribute your own insights.`,
    };
  }

  // SCENARIO 2: No relevant community content exists -> Handle honestly & provide General AI Guidance
  const missingNote = "No specific Nexus community discussions directly match this topic yet.";

  return {
    missingInfoNote: missingNote,
    answer: `I searched the Nexus community discussions, but couldn't find any threads discussing this specific question yet.

### 💡 General AI Guidance
*(Note: The following recommendations are general AI-generated knowledge, not backed by verified Nexus community discussions.)*

Here is a structured, practical approach to address your question:

1. **Clarify Your Objectives**: Clearly define your target outcome, constraints, and baseline metrics before making changes.
2. **Apply Iterative Increments**: Make small, verifiable modifications rather than overhaul systems or routines all at once.
3. **Measure & Validate Feedback**: Track signals for at least 7–14 days to observe real trends rather than short-term fluctuations.
4. **Leverage Peer Collaboration**: Discussing edge cases with peers consistently surfaces hidden pitfalls and faster shortcuts.

---
**💡 Pro Tip:** If this is an important topic for your team, consider starting a new discussion thread in one of our technical communities (such as **AI Engineering & MLOps** or **Fullstack Next.js**). Our active members frequently share real-world architectures and case studies!`,
  };
}

/**
 * Generate augmented synthesis via local Ollama gemma3:1b
 */
async function generateOllamaGemmaResponse(
  query: string,
  sources: AssistantSource[],
  isCommunityBacked: boolean,
  history?: Array<{ role: string; content: string }>,
  user_profile?: AssistantUserProfile,
  correctedQuery?: string
): Promise<{ answer: string; suggestedFollowups?: string[] } | null> {
  if (env.OLLAMA_ENABLED !== "true") {
    return null;
  }

  const baseUrl = env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = env.OLLAMA_MODEL || "gemma3:1b";

  try {
    let systemInstruction = "";
    let userPromptWithContext = "";

    const userProfileText = user_profile && user_profile.name ? `
### CURRENT ACTIVE USER PROFILE (HIGH PERSONALIZATION REQUIRED):
- Full Name: ${user_profile.name}
- Email: ${user_profile.email || "Not specified"}
- Role on Nexus: ${user_profile.role || "Member"}
- Bio / Expertise: ${user_profile.bio || "Software Engineer & Community Participant"}
- Personalization Directives:
  * You know the user's exact details! When the user asks "who am I?", "what is my role?", "what is my name?", "what are my permissions?", or asks about their account details, answer immediately and accurately with their loaded details above (Full Name: ${user_profile.name}, Email: ${user_profile.email || "Registered account"}, Role: ${user_profile.role || "Member"}).
  * Address the user naturally by their first name (e.g., "${user_profile.name.split(" ")[0]}") in your greeting and responses.
  * Adjust technical depth and permission context specifically for their role (e.g., if Admin, highlight administrative authority and governance; if Member, explain their participation abilities and role restrictions).
  * Remember and respect their profile details and personal goals across the conversation.` : `
### CURRENT ACTIVE USER PROFILE:
- Guest / Community Participant
- Personalization Directives: Be welcoming, helpful, and encourage active community engagement.`;

    const basePlatformKnowledge = `You are the Nexus Community AI Assistant, powered by local Gemma 3.
You have COMPLETE and IN-DEPTH knowledge of the Nexus Community Platform, all its communities, features, workflows, and architecture.
You also possess CONTINUOUS CONVERSATION MEMORY. You remember EVERYTHING the user has told you in this conversation (their name, their questions, projects, technical preferences, and prior remarks). When asked about previous topics, always recall them accurately.
${userProfileText}

### CRITICAL DIRECTIVE: QUERY UNDERSTANDING, GRAMMATICAL RECORRECTION & SUGGESTIONS:
Users may type fast with spelling mistakes, grammatical errors, informal abbreviations, or typographical slips (e.g., "how 2 inprove my dily rotine", "stratigies to redue infrence letency", "fastpi corse errros", "who am i nd wht r my persmisons", "polss", "announcemnts").
1. **Intelligent Intent Recovery**: Discern the user's intended objective regardless of typographical or grammatical errors.
2. **Graceful Query Interpretation**: If noticeable spelling or grammatical errors were detected in their input, begin your response with:
   > 💡 *Interpreted query: **"[Clean, grammatically corrected query]"***
3. **Thorough & Accurate Assistance**: Address their underlying question directly, drawing upon the community knowledge, verified solutions, or platform guides.
4. **Relevant Suggestions**: Provide 2-3 cleanly phrased related search suggestions that the user can explore next.

### NEXUS PLATFORM ARCHITECTURE & USER GUIDE:
1. **Overview & Tech Stack**:
   Nexus is an enterprise technical community platform for engineers and architects built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Express.js 5, PostgreSQL (Prisma ORM), Redis, and AWS S3.
2. **Communities Available**:
   - "AI Engineering & MLOps" (/communities/c-001): Scaling LLMs, evaluation pipelines, MLOps, latency benchmarks. Led by Dr. Sarah Chen & Alex Rivera.
   - "Fullstack Next.js & React 19" (/communities/c-002): Server Components, App Router, useActionState, useOptimistic, FastAPI CORS. Led by Alex Rivera.
   - "Cloud Native & Kubernetes Core" (/communities/c-003): Production post-mortems, GitOps, zero-downtime Prisma migrations, power diagnostics. Led by Marcus Vance & David Thorne.
   - "Design Systems & UI Engineering" (/communities/c-004): Design tokens, accessible components, micro-interactions.
3. **Key Interactive Modules & Workflows**:
   - **Technical Discussions**: Markdown posts, tags, code snippets, threaded replies, and solution proposals.
   - **Problem Classification & Verified Solutions**: Discussions can be classified as 'problem', 'question', or 'discussion'. Problem statuses are: 'open', 'solution_proposed', 'verified_solved', 'unresolved'. Community members submit proposed solutions with step-by-step checklists and expected outcomes. The original poster can verify solutions with an effectiveness rating (1-5 stars) and feedback note.
   - **Proactive Related Solutions Retrieval**: Automatically surfaces verified solutions in real-time as users type problem symptoms in the discussion creation modal.
   - **AI Duplicate Question Detection**: Semantic embedding analysis checks similarity before submission to prevent redundant questions.
   - **Events & AMAs (/events)**: Live workshops, virtual webinars, Google Meet integration, calendar view, one-click RSVP tracking.
   - **Polls & Surveys**: Real-time voting with interactive percentage bars, single/multi-choice polls, multi-step user surveys.
   - **Community Resources**: Downloadable whitepapers, architecture diagrams, code packages with download counters.
   - **Announcements**: Pinned broadcast alerts with priority badges.
   - **Unanswered Questions & Expert Prioritization (/unanswered)**: Urgency scoring algorithm (0-100), aging weights, expertise matching matrix, notification triggers for matched experts.
   - **RBAC & Admin Portal (/admin)**: Roles: Admin, Moderator, Member. Admins can create communities using the "New Community" button in the navbar or at /admin.
   - **Dual-Mode Engine**: Seamless automatic fallback between live PostgreSQL API and high-fidelity demo data (with top navbar indicator and health retry button).
   - **Theme Switcher**: Dark and Light themes with instant toggle in the navbar.
   - **Keyboard Shortcut**: Ctrl+K opens the floating AI Chat Assistant anytime.
4. **Key Platform Leaders**:
   - David Thorne: Platform Administrator & Community Director (admin@nexus.community). Full RBAC access.
   - Alex Rivera: Senior AI Engineer, contributor in AI Engineering and Fullstack Next.js.
   - Dr. Sarah Chen: Lead Architect & Community Founder. Expert in React 19, distributed systems, and circadian routines.
   - Marcus Vance: DevOps & Site Reliability Lead. Kubernetes, Terraform, zero-downtime migrations.
   - Elena Rostova: UI Architecture & Design Systems Lead. Figma tokens, WCAG 2.2 AA.

### CRITICAL NEXUS RBAC DIRECTIVE: THE MEMBER ROLE IS STRICTLY RESTRICTED:
In Nexus Community Platform, regular accounts have the "Member" role, which has strictly RESTRICTED permissions:
- Members CANNOT create communities (strictly reserved for Administrators).
- Members CANNOT broadcast announcements or pin alerts (strictly reserved for Administrators and Community Owners).
- Members CANNOT access the /admin portal or alter user roles/permissions.
- Members CANNOT delete or modify other members' polls, discussions, or events.
- What Members ARE allowed to do: Join public communities, start technical discussions, reply and propose verified solutions, vote in active polls, register for events & claim QR tickets, and download resources.
Always clearly state and enforce these restrictions whenever the user asks about member permissions or administrative operations.

### IN-DEPTH COMMUNITY DIRECTORY (RULES, POLLS, ANNOUNCEMENTS, EVENTS, RESOURCES):

1. **AI Engineering & MLOps (/communities/c-001)**:
   - Leaders: Dr. Sarah Chen & Alex Rivera | 890 Members | Category: Artificial Intelligence & Systems
   - Official Rules:
     * 1. Reproducible Benchmark Standards: Always share hardware specs (GPU, VRAM), batch sizes, and p50/p95/p99 latency percentiles when discussing benchmarks.
     * 2. Strict Secret Sanitization: Never publish confidential customer prompts, proprietary model weights, or private API keys.
     * 3. Empirical Verification: Only mark solutions as verified after reproducing them on standardized evaluation datasets (e.g. MMLU, GSM8K).
     * 4. Respectful Peer Review: Provide constructive, actionable feedback on prompt architectures and evaluation pipelines.
   - Active Polls:
     * "Which inference optimization delivers the highest speedup in your production stack?": vLLM PagedAttention v2 (48% - 142 votes), Semantic Caching via Redis (31% - 92 votes), Speculative Decoding (14% - 41 votes), FP8 Quantization (7% - 21 votes). Total: 296 votes.
     * "Preferred LLM Evaluation Framework in 2026?": Ragas (42%), DeepEval (30%), Promptfoo (18%), Custom Python (10%). Total: 210 votes.
   - Announcements:
     * [PINNED] "🚀 vLLM PagedAttention v2 Live Demo Session: Join Dr. Sarah Chen this Friday at 4:00 PM UTC for a live walkthrough of FP8 quantization and continuous batching."
     * "New Enterprise LLM Serving Comparison Matrix Released in Resources."
   - Events:
     * "Mastering Low-Latency Agent Architectures" with Dr. Sarah Chen. Friday, Nov 14, 2026 at 16:00 UTC. Virtual Google Meet (https://meet.google.com/nexus-ai-eng). 85/100 RSVPs.
     * "Bi-Weekly AMA: MLOps Guardrails, Eval, & Human-in-the-Loop" with Alex Rivera. Thursday, Nov 27, 2026 at 17:00 UTC.
   - Resources:
     * "Enterprise LLM Inference Optimization Architecture Blueprint" (PDF, 2.4 MB, 342 downloads).
     * "vLLM Production Docker Compose & Kubernetes Helm Template" (ZIP, 1.1 MB, 518 downloads).

2. **Fullstack Next.js & React 19 (/communities/c-002)**:
   - Leaders: Alex Rivera & Dr. Sarah Chen | 1420 Members | Category: Web Development & Frameworks
   - Official Rules:
     * 1. Provide Minimal Reproductions: Link a minimal GitHub repo, CodeSandbox, or complete reproduction snippet for hydration and Server Action issues.
     * 2. Transition Discipline: Wrap all optimistic UI state updates inside React 19 startTransition or useActionState.
     * 3. Server/Client Boundary Security: Never expose sensitive server environment variables to Client Components ('use client').
     * 4. CORS & Preflight Best Practices: Follow official Nexus CORS origin configurations (avoid trailing slashes and wildcard credentials).
   - Active Polls:
     * "What is your primary state management approach in React 19 / Next.js 16 App Router?": Server Actions + useActionState + useOptimistic (54% - 188 votes), Zustand (26% - 90 votes), TanStack Query (15% - 52 votes), Redux Toolkit (5% - 17 votes). Total: 347 votes.
   - Announcements:
     * [PINNED] "⚡ React 19 Server Actions & Optimistic UI Migration Guide published in Discussions."
     * "FastAPI & Express 5 CORS Preflight Best Practices updated for cross-origin cookies."
   - Events:
     * "Hands-on Workshop: Building Resilient React 19 Optimistic UIs" with Alex Rivera. Wednesday, Nov 12, 2026 at 18:00 UTC. Virtual Google Meet (https://meet.google.com/nexus-nextjs). 120/150 RSVPs.
   - Resources:
     * "React 19 Server Actions & Optimistic UI State Flow Chart" (PDF, 3.2 MB, 620 downloads).
     * "FastAPI + Next.js 16 Secure Auth Template (HttpOnly, CORS, JWT)" (ZIP, 4.5 MB, 789 downloads).

3. **Cloud Native & Kubernetes Core (/communities/c-003)**:
   - Leaders: Marcus Vance & David Thorne | 650 Members | Category: Infrastructure & DevOps
   - Official Rules:
     * 1. Blameless Incident Post-Mortems: Focus on systemic improvements, never individual blame.
     * 2. Two-Phase Database Migrations: Adhere strictly to the expand-and-contract pattern for zero-downtime Prisma migrations; never drop columns in live rollouts.
     * 3. Sanitize Infrastructure Manifests: Redact all IP addresses, hostnames, SSL certificates, and Kubernetes secrets.
     * 4. Hardware Diagnostic Rigor: Include voltage/resistance readings and multimeter steps when reporting electrical anomalies.
   - Active Polls:
     * "How does your team execute database migrations in production Kubernetes?": Isolated Pre-Deploy K8s Job with Advisory Locks (62% - 110 votes), Kubernetes Init Containers (18% - 32 votes), External CI/CD Pipeline (14% - 25 votes), Manual Bastion Execution (6% - 11 votes). Total: 178 votes.
   - Announcements:
     * [PINNED] "🛡️ Production Post-Mortem Archive: Zero-Downtime Prisma Migration published."
     * "Cluster Maintenance: Dev/Staging Kubernetes cluster upgrade to v1.31 scheduled for Sunday at 02:00 UTC."
   - Events:
     * "Zero-Downtime Database Schema Migrations on K8s with Prisma" with Marcus Vance. Tuesday, Nov 18, 2026 at 17:00 UTC. Virtual Google Meet (https://meet.google.com/nexus-k8s). 64/100 RSVPs.
   - Resources:
     * "Production Kubernetes Cluster Security Hardening Checklist" (PDF, 5.1 MB, 410 downloads).
     * "Prisma Distributed Advisory Lock Migration Scripts for Helm Charts" (ZIP, 850 KB, 532 downloads).

4. **Design Systems & UI Engineering (/communities/c-004)**:
   - Leaders: Elena Rostova & David Thorne | 920 Members | Category: Design & Frontend Systems
   - Official Rules:
     * 1. Universal Accessibility (WCAG 2.2 AA): Every component must pass keyboard navigation, ARIA roles, and contrast standards.
     * 2. Token-First System Design: Never use arbitrary hex values; strictly bind to Nexus design tokens.
     * 3. 60 FPS Animation Budget: Micro-interactions must utilize GPU-accelerated transforms and opacity.
   - Active Polls:
     * "Which styling solution does your team prefer for enterprise design systems in 2026?": Tailwind CSS v4 + CVA (58% - 134 votes), CSS Modules (22% - 51 votes), Vanilla Extract (12% - 28 votes), StyleX (8% - 19 votes). Total: 232 votes.
   - Announcements:
     * [PINNED] "🎨 Nexus Glassmorphism 2.0 Design Tokens Released with dark and light theme tokens."
   - Events:
     * "Crafting Accessible, High-Performance Micro-Interactions in React 19" with Elena Rostova. Thursday, Nov 20, 2026 at 15:00 UTC. Virtual Google Meet (https://meet.google.com/nexus-design). 75/100 RSVPs.
   - Resources:
     * "Nexus Glassmorphic Design System Figma Component Library" (ZIP, 12.4 MB, 890 downloads).
     * "WCAG 2.2 AA Accessibility Audit Checklist" (PDF, 1.8 MB, 615 downloads).`;

    if (isCommunityBacked && sources.length > 0) {
      systemInstruction = `${basePlatformKnowledge}

Your task is to answer the user's question with authority, clarity, and conciseness.
Rules:
1. When answering community or technical questions, ground your response in the retrieved community discussions and verified solutions below.
2. Directly credit authors (e.g. Alex Rivera, Dr. Sarah Chen) and mention the community name or platform section.
3. If the user asks about the application itself (creating a community, verified solutions, events, etc.), explain the exact workflow step-by-step with relevant page routes (e.g. /events, /unanswered, /admin).
4. Use clean markdown: bullet points, bold key terms, and short paragraphs.
5. Do not fabricate facts. End with a line encouraging the user to check the original source discussions or platform modules linked below.`;

      const formattedContext = sources
        .map(
          (s, idx) =>
            `[Source ${idx + 1}] "${s.title}" in community "${s.community_name}" by ${s.author_name}${
              s.is_verified_solution ? " (Verified Solution)" : ""
            }:\n${s.excerpt}`
        )
        .join("\n\n");

      const disambiguationPrefix =
        correctedQuery && correctedQuery.toLowerCase() !== query.toLowerCase()
          ? `[DISAMBIGUATION CONTEXT: Raw user input had typos: "${query}". Disambiguated intended query: "${correctedQuery}"]\n\n`
          : "";

      userPromptWithContext = `${disambiguationPrefix}Retrieved Community Discussions and Solutions:\n${formattedContext}\n\nUser Question: ${correctedQuery || query}`;
    } else {
      systemInstruction = `${basePlatformKnowledge}

The user is asking a question outside the Nexus community discussions and application features.
Rules:
1. Start by honestly stating: "I searched the Nexus community discussions, but couldn't find any threads discussing this specific question yet."
2. Then provide concise, structured general advice under a header "### 💡 General AI Guidance".
3. Add a small note that this is general AI advice rather than a community-verified answer.
4. Conclude with a helpful suggestion on which technical community in Nexus might be suitable to start a discussion about this.`;

      const disambiguationPrefix =
        correctedQuery && correctedQuery.toLowerCase() !== query.toLowerCase()
          ? `[DISAMBIGUATION CONTEXT: Raw user input had typos: "${query}". Disambiguated intended query: "${correctedQuery}"]\n\n`
          : "";

      userPromptWithContext = `${disambiguationPrefix}User Question: ${correctedQuery || query}`;
    }

    const messagesPayload: Array<{ role: string; content: string }> = [
      { role: "system", content: systemInstruction },
    ];

    // Include up to 20 previous conversation history turns so it remembers everything
    if (history && history.length > 0) {
      const recent = history.slice(-20);
      for (const h of recent) {
        if (h.role === "user" || h.role === "assistant") {
          messagesPayload.push({
            role: h.role,
            content: h.content,
          });
        }
      }
    }

    messagesPayload.push({
      role: "user",
      content: userPromptWithContext,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout for fast response

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messagesPayload,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 600,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Ollama responded with status ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    const rawContent = data.message?.content?.trim();

    if (!rawContent) {
      return null;
    }

    return {
      answer: rawContent,
    };
  } catch (err: any) {
    console.warn(`Ollama Gemma 3:1b call failed: ${err.message}. Falling back to standard synthesis.`);
    return null;
  }
}

/**
 * Primary assistant chat handler
 */
export async function processAssistantChat(
  options: AssistantChatOptions
): Promise<AssistantChatResponse> {
  const { message, conversation_id, community_id, user_id, user_profile, history } = options;
  const conversationId = conversation_id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 0. Grammatical error recorrection & intent disambiguation
  const analysis = analyzeAndCorrectQuery(message);
  const correctedQuery = analysis.hasCorrections ? analysis.correctedQuery : undefined;

  // 1. Retrieve relevant community content using raw & corrected query
  const { sources, bestScore } = await retrieveCommunityContext(
    message,
    community_id,
    history,
    correctedQuery
  );

  // 2. Determine if community backed (score >= 0.35)
  const isCommunityBacked = bestScore >= 0.35 && sources.length > 0;

  // 3. Generate answer via local Ollama gemma3:1b if available, or fall back to synthesis
  let answer: string;
  let missingInfoNote: string | undefined;
  let suggestedFollowups: string[] = [];

  const ollamaResult = await generateOllamaGemmaResponse(
    message,
    sources,
    isCommunityBacked,
    history,
    user_profile,
    correctedQuery
  );

  if (ollamaResult && ollamaResult.answer) {
    answer = ollamaResult.answer;
    if (!isCommunityBacked) {
      missingInfoNote = "No specific Nexus community discussions directly match this topic yet.";
    }
    suggestedFollowups = ollamaResult.suggestedFollowups && ollamaResult.suggestedFollowups.length > 0
      ? ollamaResult.suggestedFollowups
      : generateFollowUpSuggestions(correctedQuery || message, isCommunityBacked);
  } else {
    // Graceful fallback to built-in synthesis
    const synthesized = synthesizeResponse(
      message,
      sources,
      isCommunityBacked,
      history,
      user_profile,
      correctedQuery
    );
    answer = synthesized.answer;
    missingInfoNote = synthesized.missingInfoNote;
    suggestedFollowups = generateFollowUpSuggestions(correctedQuery || message, isCommunityBacked);
  }

  // Ensure answer highlights the interpreted query if typos were detected and not already noted
  if (analysis.hasCorrections && !answer.includes("Interpreted") && !answer.includes("Did you mean")) {
    answer = `> 💡 **Did you mean:** *"${analysis.correctedQuery}"*  \n*(Automatically corrected typos & grammatical mistakes in your input)*\n\n${answer}`;
  }

  // 5. Store / update conversation session
  let conv = conversationStore.get(conversationId);
  const now = new Date().toISOString();

  if (!conv) {
    const firstFiveWords = (correctedQuery || message).split(/\s+/).slice(0, 5).join(" ");
    conv = {
      id: conversationId,
      title: firstFiveWords.length > 0 ? firstFiveWords + "..." : "New Conversation",
      user_id,
      community_id,
      created_at: now,
      updated_at: now,
      messages: [],
    };
    conversationStore.set(conversationId, conv);
  }

  // Add user message
  conv.messages.push({
    id: `msg-u-${Date.now()}`,
    role: "user",
    content: message,
    timestamp: now,
  });

  // Add assistant message
  conv.messages.push({
    id: `msg-a-${Date.now()}`,
    role: "assistant",
    content: answer,
    timestamp: now,
    is_community_backed: isCommunityBacked,
    missing_information_note: missingInfoNote,
    sources: isCommunityBacked ? sources : [],
    suggested_followups: suggestedFollowups,
    corrected_query: analysis.hasCorrections ? analysis.correctedQuery : null,
    did_you_mean: analysis.didYouMean,
    suggested_queries: analysis.suggestedQueries,
  });

  conv.updated_at = now;

  return {
    answer,
    is_community_backed: isCommunityBacked,
    missing_information_note: missingInfoNote,
    sources: isCommunityBacked ? sources : [],
    suggested_followups: suggestedFollowups,
    conversation_id: conversationId,
    corrected_query: analysis.hasCorrections ? analysis.correctedQuery : null,
    did_you_mean: analysis.didYouMean,
    suggested_queries: analysis.suggestedQueries,
  };
}

/**
 * Get all conversations
 */
export function getConversations(userId?: string): AssistantConversation[] {
  const list = Array.from(conversationStore.values());
  if (userId) {
    return list.filter((c) => !c.user_id || c.user_id === userId);
  }
  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

/**
 * Get conversation by ID
 */
export function getConversationById(id: string): AssistantConversation | undefined {
  return conversationStore.get(id);
}

/**
 * Delete a conversation
 */
export function deleteConversation(id: string): boolean {
  return conversationStore.delete(id);
}
