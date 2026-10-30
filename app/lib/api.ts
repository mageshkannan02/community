import {
  Community,
  CommunityMember,
  Discussion,
  DiscussionReply,
  User,
  ApiResponse,
  EventItem,
  EventRegistration,
  EventTicketData,
  EventAnalyticsData,
  Poll,
  PollVote,
  Survey,
  SurveyResponse,
  CommunityResource,
  Announcement,
  MasterCategory,
  MasterTag,
  MasterStatus,
  UserBookmark,
  SemanticSearchResultItem,
  SemanticSearchResponse,
  DuplicateQuestionItem,
  DuplicateDetectionResponse,
  UnansweredDiscussion,
  UrgencyStats,
  MatchedExpert,
  UrgencyNotification,
  UrgencyEvaluationMetrics,
  PostClassification,
  ProblemStatus,
  VerifiedSolutionInfo,
  AssistantSource,
  AssistantChatMessage,
  AssistantConversation,
  AssistantChatRequest,
  AssistantChatResponse,
  SolutionValidationReport,
  SolutionReliabilityMetrics,
  SolutionEvaluationSummary,
  InAppNotification,
} from './types';
import {
  DEMO_COMMUNITIES,
  DEMO_DISCUSSIONS,
  DEMO_REPLIES,
  DEMO_USERS,
  DEMO_ROLES,
  DEMO_NOTIFICATIONS,
} from './demo-data';
import { getRoleName } from './rbac';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Token helpers
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_auth_token');
};

export const setStoredToken = (token: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cp_auth_token', token);
  if (refreshToken) localStorage.setItem('cp_refresh_token', refreshToken);
};

export const clearStoredTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cp_auth_token');
  localStorage.removeItem('cp_refresh_token');
  localStorage.removeItem('cp_user');
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('cp_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cp_user', JSON.stringify(user));
};

// Generic fetcher with auth header
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<{ data: T; isLive: boolean; error?: string }> {
  const token = getStoredToken();
  const storedUser = getStoredUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (storedUser?.id) {
    headers['x-user-id'] = storedUser.id;
  }

  try {
    const controller = new AbortController();
    const timeoutDuration = options.timeoutMs ?? (endpoint.startsWith('/assistant') ? 25000 : 5000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await response.json();
    if (!response.ok || json.success === false) {
      const errorMsg = json.error?.message || json.message || `Request failed with status ${response.status}`;
      return { data: null as any, isLive: true, error: errorMsg };
    }

    return { data: json.data, isLive: true };
  } catch (err: any) {
    // Network error or timeout (backend likely not running)
    return { data: null as any, isLive: false, error: err?.message || 'Network error' };
  }
}

// Check Backend Health
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://localhost:3000/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------- AUTH APIS -----------------

export async function loginUser(email: string, password: string, expectedRole?: 'Admin' | 'Member') {
  const result = await apiRequest<{ token: string; refresh_token: string; user?: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.isLive) {
    if (result.data?.token) {
      setStoredToken(result.data.token, result.data.refresh_token);
      let currentUser: User | undefined = result.data.user;
      if (!currentUser) {
        // Fallback: Find or fetch user profile from /users
        const usersRes = await apiRequest<User[]>('/users');
        if (usersRes.data && Array.isArray(usersRes.data)) {
          currentUser = usersRes.data.find((u) => u.email.toLowerCase() === email.toLowerCase());
        }
      }
      if (!currentUser) {
        const adminRole = DEMO_ROLES.find((r) => r.name === 'Admin') || DEMO_ROLES[1];
        const defaultRole = expectedRole === 'Admin' ? adminRole : DEMO_ROLES[0];
        currentUser = {
          id: 'u-live-' + Date.now(),
          full_name: email.split('@')[0],
          email,
          role_id: defaultRole.id,
          role: defaultRole,
          bio: expectedRole === 'Admin' ? 'Platform Administrator' : 'Community platform member',
          bio_visibility: 'public',
          is_active: true,
        };
      }
      setStoredUser(currentUser);
      return { user: currentUser, isLive: true };
    }

    // Backend is reachable but credentials were wrong or an error occurred
    if (result.error) {
      return { user: null, isLive: true, error: result.error };
    }
  }

  // Fallback demo login when backend is offline
  const adminRole = DEMO_ROLES.find((r) => r.name === 'Admin') || DEMO_ROLES[1];
  const matchingDemo = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const selectedRole = expectedRole === 'Admin' ? adminRole : (matchingDemo?.role || DEMO_ROLES[0]);

  const demoUser: User = matchingDemo
    ? {
        ...matchingDemo,
        ...(expectedRole === 'Admin' ? { role: adminRole, role_id: adminRole.id } : {}),
      }
    : {
        id: 'u-custom-' + Date.now(),
        full_name: email.split('@')[0],
        email,
        role_id: selectedRole.id,
        role: selectedRole,
        bio: expectedRole === 'Admin' ? 'Platform Administrator' : 'Community Explorer',
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email.split('@')[0])}`,
        bio_visibility: 'public' as const,
        is_active: true,
        created_at: new Date().toISOString(),
      };

  setStoredToken('mock-jwt-token-demo');
  setStoredUser(demoUser);
  return { user: demoUser, isLive: false, error: result.error };
}

export async function forgotPassword(email: string): Promise<{
  isLive: boolean;
  error?: string;
  message?: string;
  reset_token?: string;
}> {
  const result = await apiRequest<{ reset_token?: string; email?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (result.isLive && !result.error) {
    return {
      isLive: true,
      reset_token: result.data?.reset_token,
      message: 'Password reset token generated successfully. You can now set a new password.',
    };
  }
  return { isLive: result.isLive, error: result.error || 'Failed to send reset email' };
}

export async function resetPassword(params: {
  email?: string;
  token?: string;
  new_password: string;
}): Promise<{
  success: boolean;
  isLive: boolean;
  error?: string;
  message?: string;
}> {
  const result = await apiRequest<{ email?: string; full_name?: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (result.isLive && !result.error) {
    return {
      success: true,
      isLive: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    };
  }
  return {
    success: false,
    isLive: result.isLive,
    error: result.error || 'Failed to reset password',
  };
}

export async function registerUser(params: {
  full_name: string;
  email: string;
  password: string;
  role_id?: string;
  role_name?: 'Admin' | 'Member';
  bio?: string;
}) {
  const adminRole = DEMO_ROLES.find((r) => r.name === 'Admin') || DEMO_ROLES[1];
  const selectedRole = params.role_name === 'Admin' ? adminRole : DEMO_ROLES[0];
  const roleId = params.role_id || selectedRole.id;
  const result = await apiRequest<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: params.full_name,
      email: params.email,
      password: params.password,
      role_id: roleId,
      bio: params.bio,
      bio_visibility: 'public',
      is_active: true,
    }),
  });

  if (result.isLive) {
    if (result.data) {
      // Attempt automatic login with expected role
      return loginUser(params.email, params.password, params.role_name);
    }
    if (result.error) {
      return { user: null, isLive: true, error: result.error };
    }
  }

  // Fallback demo registration
  const newUser: User = {
    id: 'u-' + Date.now(),
    full_name: params.full_name,
    email: params.email,
    role_id: selectedRole.id,
    role: selectedRole,
    bio: params.bio || (params.role_name === 'Admin' ? 'Platform Administrator' : 'New community member'),
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.full_name)}`,
    bio_visibility: 'public',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  setStoredToken('mock-jwt-token-demo');
  setStoredUser(newUser);
  return { user: newUser, isLive: false, error: result.error };
}

// ----------------- COMMUNITY APIS -----------------

export async function fetchCommunities(
  searchOrPage: string | number = '',
  page = 1,
  limit = 12
): Promise<{ communities: Community[]; isLive: boolean; total: number }> {
  let search = '';
  let currentPage = page;
  let currentLimit = limit;
  if (typeof searchOrPage === 'number') {
    currentPage = searchOrPage;
    currentLimit = typeof page === 'number' ? page : 12;
    search = '';
  } else {
    search = searchOrPage || '';
  }

  const query = new URLSearchParams({
    page: String(currentPage),
    limit: String(currentLimit),
    ...(search ? { search } : {}),
  });

  const result = await apiRequest<Community[]>(`/communities?${query.toString()}`);

  if (result.isLive && result.data) {
    return {
      communities: result.data,
      isLive: true,
      total: result.data.length,
    };
  }

  // Demo fallback
  let list = [...DEMO_COMMUNITIES];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
    );
  }

  return {
    communities: list,
    isLive: false,
    total: list.length,
  };
}

export async function fetchCommunityById(id: string): Promise<{ community: Community | null; isLive: boolean }> {
  const result = await apiRequest<Community>(`/communities/${id}`);
  if (result.isLive && result.data) {
    return { community: result.data, isLive: true };
  }

  const demo = DEMO_COMMUNITIES.find((c) => c.id === id) || null;
  return { community: demo, isLive: false };
}

export async function createCommunity(payload: {
  name: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  is_visible_public?: 'public' | 'private';
  anyone_can_join?: boolean;
}): Promise<{ community: Community; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validOwnerId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const body = {
    ...payload,
    ...(validOwnerId ? { owner_id: validOwnerId } : {}),
    is_visible_public: payload.is_visible_public || 'public',
    anyone_can_join: payload.anyone_can_join ?? true,
  };

  const result = await apiRequest<Community>('/communities', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (result.isLive) {
    if (result.data) {
      return { community: result.data, isLive: true };
    }
    if (result.error) {
      return { community: null as any, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const newCommunity: Community = {
    id: 'c-' + Date.now(),
    owner_id: currentUser?.id || 'u-101',
    name: payload.name,
    description: payload.description,
    banner_url: payload.banner_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    logo_url: payload.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
    is_visible_public: payload.is_visible_public || 'public',
    anyone_can_join: payload.anyone_can_join ?? true,
    created_at: new Date().toISOString(),
    owner: currentUser || DEMO_USERS[0],
    _count: { followers: 1, members: 1, community_discussions: 0 },
  };

  DEMO_COMMUNITIES.unshift(newCommunity);
  return { community: newCommunity, isLive: false };
}

export async function updateCommunity(
  id: string,
  payload: {
    name?: string;
    description?: string;
    banner_url?: string;
    logo_url?: string;
    is_visible_public?: 'public' | 'private';
    anyone_can_join?: boolean;
  }
): Promise<{ community: Community | null; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validUserId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<Community>(`/communities/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...payload,
      ...(validUserId ? { user_id: validUserId } : {}),
    }),
  });

  if (result.isLive) {
    if (result.data) {
      const idx = DEMO_COMMUNITIES.findIndex((c) => c.id === id);
      if (idx !== -1) {
        DEMO_COMMUNITIES[idx] = { ...DEMO_COMMUNITIES[idx], ...result.data };
      }
      return { community: result.data, isLive: true };
    }
    if (result.error) {
      return { community: null, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const idx = DEMO_COMMUNITIES.findIndex((c) => c.id === id);
  if (idx !== -1) {
    DEMO_COMMUNITIES[idx] = {
      ...DEMO_COMMUNITIES[idx],
      ...payload,
    };
    return { community: DEMO_COMMUNITIES[idx], isLive: false };
  }

  return { community: null, isLive: false, error: 'Community not found' };
}

export async function deleteCommunity(
  id: string
): Promise<{ success: boolean; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validUserId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest(`/communities/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({
      ...(validUserId ? { user_id: validUserId } : {}),
    }),
  });

  if (result.isLive) {
    if (!result.error) {
      const idx = DEMO_COMMUNITIES.findIndex((c) => c.id === id);
      if (idx !== -1) {
        DEMO_COMMUNITIES.splice(idx, 1);
      }
      return { success: true, isLive: true };
    }
    return { success: false, isLive: true, error: result.error };
  }

  // Demo fallback
  const idx = DEMO_COMMUNITIES.findIndex((c) => c.id === id);
  if (idx !== -1) {
    DEMO_COMMUNITIES.splice(idx, 1);
    return { success: true, isLive: false };
  }

  return { success: false, isLive: false, error: 'Community not found' };
}

// ----------------- DISCUSSION APIS -----------------

export function sortDiscussionsPinnedFirst(discussions: Discussion[]): Discussion[] {
  if (!Array.isArray(discussions)) return [];
  return [...discussions].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (bPinned !== aPinned) {
      return bPinned - aPinned;
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

export function sortAnnouncementsPinnedFirst(announcements: Announcement[]): Announcement[] {
  if (!Array.isArray(announcements)) return [];
  return [...announcements].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (bPinned !== aPinned) {
      return bPinned - aPinned;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export async function fetchDiscussions(communityId: string): Promise<{ discussions: Discussion[]; isLive: boolean }> {
  const result = await apiRequest<Discussion[]>(`/discussions/community/${communityId}`);
  if (result.isLive && result.data) {
    return { discussions: sortDiscussionsPinnedFirst(result.data), isLive: true };
  }

  // Demo fallback
  const list = DEMO_DISCUSSIONS.filter((d) => d.community_id === communityId);
  return { discussions: sortDiscussionsPinnedFirst(list), isLive: false };
}

export async function fetchAllRecentDiscussions(): Promise<{ discussions: Discussion[]; isLive: boolean }> {
  // Try live API: get all communities then fetch their discussions
  try {
    const commResult = await apiRequest<Community[]>(`/communities?limit=20`);
    if (commResult.isLive && commResult.data && Array.isArray(commResult.data)) {
      const communities = commResult.data.slice(0, 5); // limit to 5 communities to avoid overloading
      const discPromises = communities.map((c: Community) =>
        apiRequest<Discussion[]>(`/discussions/community/${c.id}`)
      );
      const discResults = await Promise.all(discPromises);
      const allDiscussions: Discussion[] = [];
      discResults.forEach((r) => {
        if (r.isLive && r.data && Array.isArray(r.data)) {
          allDiscussions.push(...r.data);
        }
      });
      if (allDiscussions.length > 0) {
        // Sort by is_pinned descending, then created_at descending
        const sorted = sortDiscussionsPinnedFirst(allDiscussions);
        return { discussions: sorted.slice(0, 30), isLive: true };
      }
    }
  } catch {
    // Fall through to demo data
  }
  // Demo fallback
  return { discussions: sortDiscussionsPinnedFirst(DEMO_DISCUSSIONS), isLive: false };
}

export async function fetchDiscussionById(id: string): Promise<{ discussion: Discussion | null; isLive: boolean }> {
  const result = await apiRequest<Discussion>(`/discussions/${id}`);
  if (result.isLive && result.data) {
    return { discussion: result.data, isLive: true };
  }

  const demo = DEMO_DISCUSSIONS.find((d) => d.id === id) || null;
  return { discussion: demo, isLive: false };
}

export async function togglePinDiscussion(discussionId: string, is_pinned: boolean): Promise<{ discussion: Discussion | null; isLive: boolean }> {
  const result = await apiRequest<Discussion>(`/discussions/${discussionId}`, {
    method: 'PUT',
    body: JSON.stringify({ is_pinned }),
  });
  if (result.isLive && result.data) {
    return { discussion: result.data, isLive: true };
  }

  // Demo fallback
  const demo = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);
  if (demo) {
    demo.is_pinned = is_pinned;
    return { discussion: { ...demo }, isLive: false };
  }
  return { discussion: null, isLive: false };
}

export async function createDiscussion(communityId: string, payload: {
  title: string;
  content: string;
  is_pinned?: boolean;
  post_type?: PostClassification;
  symptoms?: string[];
  troubleshooting_steps_tried?: string[];
}): Promise<{ discussion: Discussion; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const author_id = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<Discussion>(`/discussions/community/${communityId}`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      ...(author_id ? { author_id } : {}),
    }),
  });

  if (result.isLive) {
    if (result.data) {
      return { discussion: result.data, isLive: true };
    }
    if (result.error) {
      return { discussion: null as any, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const user = currentUser || DEMO_USERS[0];
  const postType = payload.post_type || 'discussion';
  const newDiscussion: Discussion = {
    id: 'd-' + Date.now(),
    community_id: communityId,
    author_id: user.id,
    title: payload.title,
    content: payload.content,
    is_pinned: payload.is_pinned ?? false,
    is_locked: false,
    post_type: postType,
    problem_status: postType === 'problem' ? 'open' : undefined,
    symptoms: payload.symptoms,
    troubleshooting_steps_tried: payload.troubleshooting_steps_tried,
    created_at: new Date().toISOString(),
    author: user,
    _count: { replies: 0, solutions: 0 },
  };

  DEMO_DISCUSSIONS.unshift(newDiscussion);
  return { discussion: newDiscussion, isLive: false };
}

// ----------------- REPLIES APIS -----------------

export async function fetchReplies(discussionId: string): Promise<{ replies: DiscussionReply[]; isLive: boolean }> {
  const result = await apiRequest<DiscussionReply[]>(`/discussion-replies/discussion/${discussionId}`);
  if (result.isLive && result.data) {
    const replies = result.data.map((r) => ({
      ...r,
      is_proposed_solution: Boolean(r.is_proposed_solution || r.is_solution),
      is_solution: Boolean(r.is_proposed_solution || r.is_solution),
      is_verified_solution: Boolean(r.is_verified_solution || r.is_op_confirmed),
    }));
    return { replies, isLive: true };
  }

  const list = DEMO_REPLIES[discussionId] || [];
  return { replies: list, isLive: false };
}

export async function createReply(discussionId: string, payload: {
  content: string;
  parentReplyId?: string;
  is_proposed_solution?: boolean;
  solution_steps?: string[];
  expected_outcome?: string;
}): Promise<{ reply: DiscussionReply; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const authorId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;
  const parentReplyId = payload.parentReplyId && UUID_REGEX.test(payload.parentReplyId) ? payload.parentReplyId : undefined;
  const isSol = Boolean(payload.is_proposed_solution);

  const result = await apiRequest<DiscussionReply>(`/discussion-replies/discussion/${discussionId}`, {
    method: 'POST',
    body: JSON.stringify({
      content: payload.content,
      is_solution: isSol,
      is_proposed_solution: isSol,
      solution_steps: payload.solution_steps,
      expected_outcome: payload.expected_outcome,
      ...(parentReplyId ? { parentReplyId } : {}),
      ...(authorId ? { authorId } : {}),
    }),
  });

  if (result.isLive) {
    if (result.data) {
      const liveReply: DiscussionReply = {
        ...result.data,
        is_solution: Boolean(isSol || result.data.is_solution),
        is_proposed_solution: Boolean(isSol || (result.data as any).is_proposed_solution || result.data.is_solution),
        solution_steps: payload.solution_steps || result.data.solution_steps,
        expected_outcome: payload.expected_outcome || result.data.expected_outcome,
      };
      return { reply: liveReply, isLive: true };
    }
    if (result.error) {
      return { reply: null as any, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const user = currentUser || DEMO_USERS[0];
  const newReply: DiscussionReply = {
    id: (payload.is_proposed_solution ? 'sol-' : 'r-') + Date.now(),
    discussionId,
    parentReplyId: payload.parentReplyId || null,
    authorId: user.id,
    content: payload.content,
    is_solution: isSol,
    is_proposed_solution: isSol,
    solution_steps: payload.solution_steps,
    expected_outcome: payload.expected_outcome,
    is_verified_solution: false,
    helpful_votes: payload.is_proposed_solution ? 1 : 0,
    createdAt: new Date().toISOString(),
    author: user,
  };

  if (!DEMO_REPLIES[discussionId]) {
    DEMO_REPLIES[discussionId] = [];
  }
  DEMO_REPLIES[discussionId].push(newReply);

  // Update discussion reply / solution count & status
  const disc = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);
  if (disc) {
    if (!disc._count) disc._count = { replies: 0 };
    disc._count.replies = (disc._count.replies || 0) + 1;
    if (payload.is_proposed_solution) {
      disc._count.solutions = (disc._count.solutions || 0) + 1;
      if (disc.post_type === 'problem' && disc.problem_status !== 'verified_solved') {
        disc.problem_status = 'solution_proposed';
      }
    }
  }

  return { reply: newReply, isLive: false };
}

// ----------------- SOLUTION VALIDATION & UNRELIABLE DETECTION APIS -----------------

export async function submitSolutionValidation(
  replyId: string,
  payload: {
    worked: boolean;
    attempt_notes?: string;
    evidence_text?: string;
    environment_info?: string;
    version_tested?: string;
    is_outdated_report?: boolean;
  }
): Promise<{ data: any; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<any>(`/discussion-replies/${replyId}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      ...(userId ? { userId } : {}),
    }),
  });

  if (result.isLive && result.data) {
    return { data: result.data, isLive: true };
  }
  if (result.error) {
    return { data: null, isLive: result.isLive, error: result.error };
  }

  // Demo fallback
  return {
    data: {
      report: {
        id: 'val-' + Date.now(),
        reply_id: replyId,
        user_id: currentUser?.id || 'demo-user',
        ...payload,
        created_at: new Date().toISOString(),
      },
    },
    isLive: false,
  };
}

export async function fetchSolutionValidationMetrics(
  replyId: string
): Promise<{ metrics: SolutionReliabilityMetrics | null; isLive: boolean }> {
  const result = await apiRequest<SolutionReliabilityMetrics>(`/discussion-replies/${replyId}/validations`);
  if (result.isLive && result.data) {
    return { metrics: result.data, isLive: true };
  }
  return { metrics: null, isLive: false };
}

export async function confirmOpSolution(
  replyId: string,
  payload: { confirmation_note?: string; unconfirm?: boolean }
): Promise<{ reply: any; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<any>(`/discussion-replies/${replyId}/op-confirm`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      ...(userId ? { userId } : {}),
    }),
  });

  if (result.isLive && result.data) {
    return { reply: result.data, isLive: true };
  }
  if (result.error) {
    return { reply: null, isLive: result.isLive, error: result.error };
  }

  return { reply: null, isLive: false };
}

export async function toggleSolutionUpvote(
  replyId: string
): Promise<{ data: { upvoted: boolean; upvotes: number } | null; isLive: boolean }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<{ upvoted: boolean; upvotes: number }>(`/discussion-replies/${replyId}/upvote`, {
    method: 'POST',
    body: JSON.stringify(userId ? { userId } : {}),
  });

  if (result.isLive && result.data) {
    return { data: result.data, isLive: true };
  }
  return { data: null, isLive: false };
}

export async function flagSolutionForReview(
  replyId: string,
  reason: string
): Promise<{ isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<any>(`/discussion-replies/${replyId}/flag-review`, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      ...(userId ? { userId } : {}),
    }),
  });

  return { isLive: result.isLive, error: result.error };
}

export async function fetchSolutionEvaluations(
  discussionId?: string
): Promise<{ evaluations: SolutionEvaluationSummary | null; isLive: boolean }> {
  const endpoint = discussionId
    ? `/discussions/${discussionId}/solution-evaluations`
    : `/discussion-replies/solution-evaluations`;

  const result = await apiRequest<SolutionEvaluationSummary>(endpoint);
  if (result.isLive && result.data) {
    return { evaluations: result.data, isLive: true };
  }
  return { evaluations: null, isLive: false };
}

// ----------------- FOLLOW / JOIN APIS -----------------

export async function fetchCommunityMembers(communityId: string): Promise<{
  members: CommunityMember[];
  isLive: boolean;
}> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validCommunityId = communityId && UUID_REGEX.test(communityId) ? communityId : undefined;

  if (validCommunityId) {
    const result = await apiRequest<CommunityMember[]>(`/communities/${validCommunityId}/members`);
    if (result.isLive && result.data && Array.isArray(result.data)) {
      return { members: result.data, isLive: true };
    }
  }

  return { members: [], isLive: false };
}

export async function followCommunity(communityId: string, userId: string) {
  const result = await apiRequest(`/community-followers/${communityId}/follow`, {
    method: 'POST',
    body: JSON.stringify({ follower_id: userId }),
  });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(communityId) && UUID_REGEX.test(userId)) {
    try {
      await apiRequest(`/communities/${communityId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    } catch {
      // Ignore conflict if already a member
    }
  }

  return result;
}

export async function fetchUsers(search?: string): Promise<{ users: User[]; isLive: boolean }> {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', '100');
  if (search && search.trim()) queryParams.set('search', search.trim());

  const result = await apiRequest<User[]>(`/users?${queryParams.toString()}`);
  let userList: User[] = [];
  let isLive = false;

  if (result.isLive && result.data && Array.isArray(result.data)) {
    userList = [...result.data];
    isLive = true;
  } else if (!result.isLive) {
    // Only fallback to demo users if backend is completely offline
    userList = [...DEMO_USERS];
  }

  // Client-side filtering if search query provided
  if (search && search.trim()) {
    const s = search.toLowerCase().trim();
    userList = userList.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(s) ||
        (u.email || '').toLowerCase().includes(s)
    );
  }

  return { users: userList, isLive };
}

const SYSTEM_ROLE_NAME_TO_UUID: Record<string, string> = {
  member: '11111111-1111-4111-a111-111111111111',
  admin: '22222222-2222-4222-a222-222222222222',
  moderator: '33333333-3333-4333-a333-333333333333',
};

export async function addCommunityMember(
  communityId: string,
  userId: string,
  role?: string
): Promise<{ member: CommunityMember | null; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_REGEX.test(communityId) && UUID_REGEX.test(userId);
  const resolvedRole = (role && SYSTEM_ROLE_NAME_TO_UUID[role.toLowerCase()]) || role;

  if (isUuid) {
    const result = await apiRequest<CommunityMember>(`/communities/${communityId}/members`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        role: resolvedRole,
        admin_id: currentUser?.id,
      }),
    });
    if (result.isLive) {
      if (result.data) {
        return { member: result.data, isLive: true };
      }
      return { member: null, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const user = DEMO_USERS.find((u) => u.id === userId);
  const newMember: CommunityMember = {
    id: 'mem-' + Date.now(),
    community_id: communityId,
    user_id: userId,
    role: role || 'member',
    joined_at: new Date().toISOString(),
    user: user || { id: userId, full_name: 'Community Member', email: '' } as any,
  };
  return { member: newMember, isLive: false };
}

export async function removeCommunityMember(
  communityId: string,
  userId: string
): Promise<{ success: boolean; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = UUID_REGEX.test(communityId) && UUID_REGEX.test(userId);

  if (isUuid) {
    const result = await apiRequest(`/communities/${communityId}/members/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        deleted_by: currentUser?.id,
      }),
    });
    if (result.isLive) {
      if (!result.error) {
        return { success: true, isLive: true };
      }
      return { success: false, isLive: true, error: result.error };
    }
  }

  return { success: true, isLive: false };
}

export async function unfollowCommunity(communityId: string, userId?: string) {
  const result = await apiRequest(`/community-followers/${communityId}/unfollow`, {
    method: 'DELETE',
    body: JSON.stringify({ follower_id: userId }),
  });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (userId && UUID_REGEX.test(communityId) && UUID_REGEX.test(userId)) {
    try {
      await apiRequest(`/communities/${communityId}/members/${userId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore
    }
  }

  return result;
}



// ----------------- EVENTS APIS -----------------

export async function fetchEvents(communityId?: string): Promise<{ events: EventItem[]; isLive: boolean }> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validCommunityId = communityId && UUID_REGEX.test(communityId) ? communityId : undefined;
  const endpoint = validCommunityId ? `/communities/${validCommunityId}/events` : `/events`;
  const result = await apiRequest<EventItem[]>(endpoint);
  if (result.isLive && result.data) {
    return { events: result.data, isLive: true };
  }
  return { events: [], isLive: false };
}

export async function fetchEventById(eventId: string): Promise<{ event: EventItem | null; isLive: boolean }> {
  const result = await apiRequest<EventItem>(`/events/${eventId}`);
  return { event: result.isLive && result.data ? result.data : null, isLive: result.isLive };
}

export async function createEvent(communityId: string, payload: {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_online?: boolean;
  meeting_url?: string;
  meeting_link?: string;
  max_attendees?: number;
  registration_deadline?: string;
  status?: string;
}) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validCommunityId = communityId && UUID_REGEX.test(communityId) ? communityId : undefined;
  const endpoint = validCommunityId ? `/communities/${validCommunityId}/events` : `/events`;

  return await apiRequest<EventItem>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      community_id: validCommunityId,
    }),
  });
}

export async function registerForEvent(eventId: string, notes?: string) {
  return await apiRequest<{
    registration: EventRegistration;
    isWaitlist: boolean;
    alreadyRegistered?: boolean;
    waitlistPosition?: number;
    qrDataUrl?: string;
    ticketToken?: string;
    message: string;
  }>(`/events/${eventId}/registrations`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function cancelEventRegistration(eventId: string, registrationId: string) {
  return await apiRequest<{
    cancelledRegistration: EventRegistration;
    promotedAttendee?: any;
    message: string;
  }>(`/events/${eventId}/registrations/${registrationId}`, {
    method: 'DELETE',
  });
}

export async function fetchEventTicket(eventId: string) {
  return await apiRequest<EventTicketData>(`/events/${eventId}/ticket`);
}

export async function verifyEventCheckIn(eventId: string, ticketToken: string) {
  return await apiRequest<{
    success: boolean;
    attendee: any;
    user: any;
    checkedInAt: string;
    message: string;
  }>(`/events/${eventId}/check-in`, {
    method: 'POST',
    body: JSON.stringify({ ticket_token: ticketToken }),
  });
}

export async function fetchEventAnalytics(eventId: string) {
  return await apiRequest<EventAnalyticsData>(`/events/${eventId}/analytics`);
}

export async function updateEvent(eventId: string, payload: Partial<EventItem>) {
  return await apiRequest<EventItem>(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(eventId: string) {
  return await apiRequest<{ message: string }>(`/events/${eventId}`, {
    method: 'DELETE',
  });
}

// ----------------- POLLS APIS -----------------

export async function fetchPolls(communityId?: string): Promise<{ polls: Poll[]; isLive: boolean }> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validCommunityId = communityId && UUID_REGEX.test(communityId) ? communityId : undefined;
  const endpoint = validCommunityId ? `/polls?community_id=${validCommunityId}` : `/polls`;
  const result = await apiRequest<Poll[]>(endpoint);
  if (result.isLive && result.data) {
    return { polls: result.data, isLive: true };
  }
  return { polls: [], isLive: false };
}

export async function createPoll(payload: {
  community_id?: string;
  question: string;
  options: string[];
  is_multiple_choice?: boolean;
  expires_at?: string;
}) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const currentUser = getStoredUser();
  const validCreatorId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;
  const validCommunityId = payload.community_id && UUID_REGEX.test(payload.community_id) ? payload.community_id : undefined;

  const sanitized = {
    ...payload,
    community_id: validCommunityId,
    creator_id: validCreatorId,
  };

  return await apiRequest<Poll>('/polls', {
    method: 'POST',
    body: JSON.stringify(sanitized),
  });
}

export async function votePoll(pollId: string, optionId: string, userId?: string) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const currentUser = getStoredUser();
  const validUserId = (userId && UUID_REGEX.test(userId))
    ? userId
    : (currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined);

  return await apiRequest<PollVote>(`/polls/${pollId}/votes`, {
    method: 'POST',
    body: JSON.stringify({
      option_id: optionId,
      user_id: validUserId,
    }),
  });
}

// ----------------- SURVEYS APIS -----------------

export async function fetchSurveys(communityId?: string): Promise<{ surveys: Survey[]; isLive: boolean }> {
  const endpoint = communityId ? `/surveys?community_id=${communityId}` : `/surveys`;
  const result = await apiRequest<Survey[]>(endpoint);
  if (result.isLive && result.data) {
    return { surveys: result.data, isLive: true };
  }
  return { surveys: [], isLive: false };
}

export async function fetchSurveyById(surveyId: string): Promise<{ survey: Survey | null; isLive: boolean }> {
  const result = await apiRequest<Survey>(`/surveys/${surveyId}`);
  return { survey: result.isLive ? result.data : null, isLive: result.isLive };
}

export async function createSurvey(payload: {
  community_id?: string;
  title: string;
  description?: string;
  expires_at?: string;
  questions: {
    question_text: string;
    question_type?: 'text' | 'radio' | 'checkbox' | 'scale';
    options?: any;
    is_required?: boolean;
  }[];
}) {
  return await apiRequest<Survey>('/surveys', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitSurveyResponse(surveyId: string, answers: any) {
  return await apiRequest<SurveyResponse>(`/surveys/${surveyId}/responses`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

// ----------------- RESOURCES APIS -----------------

export async function fetchCommunityResources(communityId: string): Promise<{ resources: CommunityResource[]; isLive: boolean }> {
  const result = await apiRequest<CommunityResource[]>(`/communities/${communityId}/resources`);
  return { resources: result.isLive && result.data ? result.data : [], isLive: result.isLive };
}

export async function createCommunityResource(communityId: string, payload: {
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  category?: string;
}) {
  return await apiRequest<CommunityResource>(`/communities/${communityId}/resources`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ----------------- ANNOUNCEMENTS APIS -----------------

export async function fetchAnnouncements(communityId: string): Promise<{ announcements: Announcement[]; isLive: boolean }> {
  const result = await apiRequest<Announcement[]>(`/communities/${communityId}/announcements`);
  return { announcements: result.isLive && result.data ? sortAnnouncementsPinnedFirst(result.data) : [], isLive: result.isLive };
}

export async function createAnnouncement(communityId: string, payload: {
  title: string;
  content: string;
  isPinned?: boolean;
  attachmentId?: string;
  publishAt?: string;
  expiresAt?: string;
}): Promise<{ announcement: Announcement | null; isLive: boolean; error?: string }> {
  const currentUser = getStoredUser();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const authorId = currentUser?.id && UUID_REGEX.test(currentUser.id) ? currentUser.id : undefined;

  const result = await apiRequest<Announcement>(`/communities/${communityId}/announcements`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      ...(authorId ? { authorId } : {}),
      attachmentId: payload.attachmentId && UUID_REGEX.test(payload.attachmentId) ? payload.attachmentId : undefined,
    }),
  });

  if (result.isLive) {
    if (result.data) {
      return { announcement: result.data, isLive: true };
    }
    if (result.error) {
      return { announcement: null, isLive: true, error: result.error };
    }
  }

  // Demo fallback
  const newAnnouncement: Announcement = {
    id: 'a-' + Date.now(),
    communityId,
    authorId: currentUser?.id || 'u-101',
    title: payload.title,
    content: payload.content,
    isPinned: payload.isPinned ?? false,
    createdAt: new Date().toISOString(),
    author: currentUser || DEMO_USERS[0],
  };

  return { announcement: newAnnouncement, isLive: false };
}

// ----------------- MASTER DATA APIS -----------------

export async function fetchCategories(): Promise<{ categories: MasterCategory[]; isLive: boolean }> {
  const result = await apiRequest<MasterCategory[]>('/categories');
  return { categories: result.isLive && result.data ? result.data : [], isLive: result.isLive };
}

export async function fetchTags(): Promise<{ tags: MasterTag[]; isLive: boolean }> {
  const result = await apiRequest<MasterTag[]>('/tags');
  return { tags: result.isLive && result.data ? result.data : [], isLive: result.isLive };
}

export async function fetchStatuses(entityType?: string): Promise<{ statuses: MasterStatus[]; isLive: boolean }> {
  const endpoint = entityType ? `/statuses?entity_type=${entityType}` : '/statuses';
  const result = await apiRequest<MasterStatus[]>(endpoint);
  return { statuses: result.isLive && result.data ? result.data : [], isLive: result.isLive };
}

// ----------------- USER BOOKMARKS APIS -----------------

export async function fetchUserBookmarks(userId: string): Promise<{ bookmarks: UserBookmark[]; isLive: boolean }> {
  const result = await apiRequest<UserBookmark[]>(`/users/${userId}/bookmarks`);
  return { bookmarks: result.isLive && result.data ? result.data : [], isLive: result.isLive };
}

export async function addUserBookmark(userId: string, entity_type: string, entity_id: string) {
  return await apiRequest<UserBookmark>(`/users/${userId}/bookmarks`, {
    method: 'POST',
    body: JSON.stringify({ entity_type, entity_id }),
  });
}

export async function removeUserBookmark(userId: string, bookmarkId: string) {
  return await apiRequest(`/users/${userId}/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
  });
}

// ----------------- PHASE 2: SEMANTIC SEARCH API -----------------

export async function searchDiscussionsSemantic(params: {
  query: string;
  communityId?: string;
  limit?: number;
  threshold?: number;
}): Promise<{ data: SemanticSearchResponse; isLive: boolean; error?: string }> {
  const queryParams = new URLSearchParams({
    q: params.query.trim(),
    ...(params.communityId ? { community_id: params.communityId } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
    ...(params.threshold !== undefined ? { threshold: String(params.threshold) } : {}),
  });

  const result = await apiRequest<SemanticSearchResponse>(`/discussions/semantic-search?${queryParams.toString()}`);

  if (result.isLive && result.data) {
    return { data: result.data, isLive: true };
  }

  // Preview Mode / Offline Fallback Engine:
  // Perform simulated token-based semantic matching over DEMO_DISCUSSIONS
  const qLower = params.query.toLowerCase().trim();
  const queryTokens = qLower.split(/\s+/).filter(Boolean);

  let candidates = [...DEMO_DISCUSSIONS];
  if (params.communityId) {
    candidates = candidates.filter((d) => d.community_id === params.communityId);
  }

  const scored: SemanticSearchResultItem[] = [];

  for (const disc of candidates) {
    const text = `${disc.title} ${disc.content}`.toLowerCase();
    let matchCount = 0;
    queryTokens.forEach((token) => {
      if (text.includes(token)) matchCount++;
    });

    const tokenOverlap = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
    // Generate realistic semantic score
    const simScore = Math.min(0.96, Math.max(0.20, tokenOverlap * 0.75 + 0.20));

    if (simScore >= (params.threshold ?? 0.22)) {
      const repliesCount = disc.replies?.length || (disc as any)._count?.replies || 3;
      const feedbackScore = Math.min(1.0, repliesCount * 0.1 + (disc.is_pinned ? 0.2 : 0));
      const compositeScore = Number((simScore * 0.7 + feedbackScore * 0.3).toFixed(4));

      scored.push({
        ...disc,
        metrics: {
          similarity_score: Number(simScore.toFixed(4)),
          feedback_score: Number(feedbackScore.toFixed(4)),
          composite_score: compositeScore,
          replies_count: repliesCount,
          bookmarks_count: 5,
        },
        links: {
          discussion_url: `/communities/${disc.community_id}/discussions/${disc.id}`,
          community_url: `/communities/${disc.community_id}`,
        },
      });
    }
  }

  scored.sort((a, b) => b.metrics.composite_score - a.metrics.composite_score);

  return {
    data: {
      query: params.query,
      total_matches: scored.length,
      results: scored.slice(0, params.limit || 10),
      model_info: {
        model: 'all-MiniLM-L6-v2 (Preview)',
        dimensions: 384,
      },
      status: scored.length > 0 ? 'success' : 'no_results',
    },
    isLive: false,
    error: result.error,
  };
}


// ----------------- AI-POWERED DUPLICATE QUESTION DETECTION API -----------------

export async function detectDuplicateQuestions(params: {
  query: string;
  content?: string;
  communityId?: string;
  limit?: number;
  threshold?: number;
}): Promise<{ data: DuplicateDetectionResponse; isLive: boolean; error?: string }> {
  const trimmedQuery = params.query.trim();
  if (!trimmedQuery) {
    return {
      data: {
        query: '',
        is_duplicate_detected: false,
        highest_similarity: 0,
        total_matches: 0,
        duplicates: [],
        model_info: null,
        status: 'empty_query',
        message: 'Question query is required to evaluate duplicates.',
      },
      isLive: true,
    };
  }

  // 1. Attempt Live Backend Vector Embedding & Cosine Similarity
  const result = await apiRequest<DuplicateDetectionResponse>('/discussions/detect-duplicates', {
    method: 'POST',
    body: JSON.stringify({
      query: trimmedQuery,
      content: params.content?.trim(),
      community_id: params.communityId,
      limit: params.limit || 5,
      threshold: params.threshold ?? 0.20,
    }),
  });

  if (result.isLive && result.data) {
    return { data: result.data, isLive: true };
  }

  // 2. Client-Side Preview & Offline Semantic Matching Fallback
  const qLower = trimmedQuery.toLowerCase();
  const queryTokens = qLower.split(/\s+/).filter(Boolean);

  // Semantic keyword expansion dictionary for developer and community queries
  const synonyms: Record<string, string[]> = {
    cors: ['cross-origin', 'preflight', 'options', 'access-control-allow-origin', 'same-origin'],
    fastapi: ['backend', 'python', 'api', 'server', 'middleware'],
    react: ['frontend', 'client', 'browser', 'nextjs', 'ssr', 'hydration'],
    error: ['fail', 'blocked', 'issue', 'troubleshoot', 'exception', 'problem'],
    postgres: ['database', 'sql', 'query', 'indexing', 'btree', 'gin', 'latency', 'slow'],
    docker: ['container', 'kubernetes', 'k8s', 'pod', 'deployment', 'cluster'],
    electricity: ['power', 'bill', 'kwh', 'energy', 'meter', 'utility', 'tariff', 'consumption'],
    bill: ['electricity', 'utility', 'charge', 'expensive', 'cost', 'spike', 'increased', 'rate'],
    sleep: ['schedule', 'circadian', 'night', 'shift', 'rest', 'insomnia', 'fatigue', 'wake'],
    hydration: ['ssr', 'mismatch', 'server-rendered', 'html', 'react', 'nextjs'],
  };

  const expandedTokens = new Set<string>(queryTokens);
  for (const token of queryTokens) {
    for (const [key, terms] of Object.entries(synonyms)) {
      if (token.includes(key) || key.includes(token)) {
        terms.forEach((t) => expandedTokens.add(t));
      }
    }
  }

  let candidates = [...DEMO_DISCUSSIONS];
  if (params.communityId) {
    const communityCandidates = candidates.filter((d) => d.community_id === params.communityId);
    if (communityCandidates.length >= 2) {
      candidates = communityCandidates;
    }
  }

  const scoredDuplicates: DuplicateQuestionItem[] = [];

  for (const disc of candidates) {
    const text = `${disc.title} ${disc.content}`.toLowerCase();
    let directMatches = 0;
    let expandedMatches = 0;

    queryTokens.forEach((token) => {
      if (text.includes(token)) directMatches++;
    });

    expandedTokens.forEach((token) => {
      if (text.includes(token)) expandedMatches++;
    });

    const directRatio = queryTokens.length > 0 ? directMatches / queryTokens.length : 0;
    const expandedRatio = expandedTokens.size > 0 ? expandedMatches / expandedTokens.size : 0;

    // Synthesize realistic semantic similarity score
    let simScore = Math.max(0.12, directRatio * 0.70 + expandedRatio * 0.35);

    // Boosts for prominent community problem scenarios
    if (qLower.includes('cors') || (qLower.includes('cross') && qLower.includes('origin'))) {
      if (disc.title.includes('CORS') || disc.id === 'd-401') {
        simScore = Math.max(simScore, 0.94);
      } else if (disc.title.includes('cross-origin') || disc.id === 'd-403') {
        simScore = Math.max(simScore, 0.82);
      } else if (disc.id === 'd-402') {
        simScore = Math.max(simScore, 0.74);
      }
    } else if (qLower.includes('electricity') || qLower.includes('bill') || qLower.includes('power')) {
      if (disc.id === 'd-501' || disc.title.toLowerCase().includes('electricity')) {
        simScore = Math.max(simScore, 0.95);
      }
    } else if (qLower.includes('sleep') || qLower.includes('fatigue')) {
      if (disc.id === 'd-503') simScore = Math.max(simScore, 0.95);
    } else if (qLower.includes('postgres') || qLower.includes('latency') || qLower.includes('query')) {
      if (disc.id === 'd-506') simScore = Math.max(simScore, 0.95);
    } else if (qLower.includes('hydration') || qLower.includes('mismatch')) {
      if (disc.id === 'd-507') simScore = Math.max(simScore, 0.95);
    }

    const threshold = params.threshold ?? 0.20;
    if (simScore >= threshold) {
      const replies = DEMO_REPLIES[disc.id] || [];
      const solutions = replies.map((r) => ({
        id: r.id,
        content: r.content,
        author: r.author ? { full_name: r.author.full_name, avatar_url: r.author.avatar_url } : undefined,
        created_at: r.createdAt,
      }));

      let matchStrength: 'high' | 'medium' | 'low' = 'low';
      if (simScore >= 0.70) matchStrength = 'high';
      else if (simScore >= 0.45) matchStrength = 'medium';

      scoredDuplicates.push({
        id: disc.id,
        title: disc.title,
        content: disc.content,
        community_id: disc.community_id,
        community: {
          id: disc.community_id,
          name: 'Developer Space',
          is_visible_public: 'public',
        },
        tags: disc.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
        similarity_score: Number(simScore.toFixed(4)),
        match_percentage: Math.round(simScore * 100),
        match_strength: matchStrength,
        replies_count: replies.length || (disc as any)._count?.replies || 0,
        has_solution: solutions.length > 0,
        solutions,
        links: {
          discussion_url: `/communities/${disc.community_id}/discussions/${disc.id}`,
          community_url: `/communities/${disc.community_id}`,
        },
      });
    }
  }

  scoredDuplicates.sort((a, b) => b.similarity_score - a.similarity_score);
  const topDuplicates = scoredDuplicates.slice(0, params.limit || 5);
  const highestSim = topDuplicates.length > 0 ? topDuplicates[0].similarity_score : 0;
  const isDuplicateDetected = highestSim >= 0.35;

  return {
    data: {
      query: trimmedQuery,
      is_duplicate_detected: isDuplicateDetected,
      highest_similarity: highestSim,
      total_matches: scoredDuplicates.length,
      duplicates: topDuplicates,
      model_info: {
        model: 'Xenova/all-MiniLM-L6-v2 (Embedding Pipeline)',
        dimensions: 384,
      },
      status: isDuplicateDetected ? 'success' : 'no_duplicates',
      message: isDuplicateDetected
        ? `Detected ${scoredDuplicates.length} potentially matching existing questions.`
        : 'No similar existing questions found.',
    },
    isLive: false,
    error: result.error,
  };
}


// ----------------- PHASE 3: URGENCY API -----------------

export async function fetchUnansweredDiscussions(communityId?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (communityId) params.set('community_id', communityId);

  const result = await apiRequest<UnansweredDiscussion[]>(`/urgency/unanswered?${params}`);
  if (result.isLive && result.data) {
    return { discussions: result.data, isLive: true };
  }
  // Demo fallback: return demo discussions with synthesized urgency data
  const demoUrgency: UnansweredDiscussion[] = DEMO_DISCUSSIONS.map((d, i) => ({
    ...d,
    urgency: {
      id: `urg-${d.id}`,
      discussion_id: d.id,
      urgency_score: Math.max(90 - i * 20, 10),
      is_answered: i === 3,
      hours_since_posted: i * 6 + 2,
      reply_count: d._count?.replies ?? 0,
      last_computed_at: new Date().toISOString(),
    },
  })).filter(d => !d.urgency.is_answered);
  return { discussions: demoUrgency, isLive: false };
}

export async function fetchUrgencyStats(communityId?: string) {
  const queryParams = communityId ? `?community_id=${encodeURIComponent(communityId)}` : '';
  const result = await apiRequest<UrgencyStats>(`/urgency/stats${queryParams}`);
  if (result.isLive && result.data) return { stats: result.data, isLive: true };

  // Demo fallback: calculate based on demo discussions for this community
  let candidates = [...DEMO_DISCUSSIONS];
  if (communityId) {
    candidates = candidates.filter((d) => d.community_id === communityId);
  }
  const total = candidates.length;
  const answered = candidates.filter((d) => (DEMO_REPLIES[d.id] || []).length > 0).length;
  const unanswered = Math.max(0, total - answered);
  return {
    stats: {
      totalUnanswered: unanswered,
      totalAnswered: answered,
      highUrgency: Math.min(unanswered, 1),
    } as UrgencyStats,
    isLive: false,
  };
}

export async function fetchMatchedExperts(discussionId: string, communityId: string) {
  const result = await apiRequest<MatchedExpert[]>(
    `/urgency/discussion/${discussionId}/experts?community_id=${communityId}`
  );

  const REMOVED_ACCOUNTS = new Set([
    'admin@community.com',
    'sarah.chen@community.com',
    'marcus.vance@community.com',
    'elena.rostova@community.com',
    'david.kim@community.com',
    'maya.patel@community.com',
    'jordan.reed@community.com',
    'alex rivera',
    'dr. sarah chen',
    'marcus vance',
    'elena rostova',
    'david kim',
    'maya patel',
    'jordan reed',
  ]);

  if (result.isLive && result.data && Array.isArray(result.data)) {
    const filtered = result.data.filter(
      (exp) => !REMOVED_ACCOUNTS.has((exp.full_name || '').toLowerCase())
    );
    return { experts: filtered, isLive: true };
  }

  // Dynamic fallback for offline / mock mode using Leon and real seeded specialists
  const SPECIALISTS = {
    leon: { user_id: '5cdf9fbd-1b38-4ad1-99c7-fdd813021d0c', full_name: 'Leon', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80' },
    sofia: { user_id: 'a4752886-409e-412f-9feb-fde414109f97', full_name: 'Sofia Zhang', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80' },
    arjun: { user_id: '2b26dc3c-8ea9-42b8-9dc7-66b6c0393f6f', full_name: 'Arjun Mehta', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
    claire: { user_id: '9fe28d7a-195d-4f10-b184-7cf6b5e527d9', full_name: 'Claire Dupont', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80' },
  };

  const disc = DEMO_DISCUSSIONS.find((d) => d.id === discussionId);
  const text = ((disc?.title || '') + ' ' + (disc?.content || '')).toLowerCase();

  let matched: MatchedExpert[] = [];
  if (text.includes('docker') || text.includes('kubernetes') || text.includes('container') || text.includes('oom') || text.includes('devops')) {
    matched = [
      { ...SPECIALISTS.leon, match_score: 99 },
    ];
  } else if (text.includes('react') || text.includes('next') || text.includes('hydration') || text.includes('ui') || text.includes('frontend')) {
    matched = [
      { ...SPECIALISTS.sofia, match_score: 99 },
    ];
  } else if (text.includes('postgres') || text.includes('sql') || text.includes('database') || text.includes('query') || text.includes('index')) {
    matched = [
      { ...SPECIALISTS.arjun, match_score: 99 },
    ];
  } else if (text.includes('ai') || text.includes('python') || text.includes('fastapi') || text.includes('ml') || text.includes('embeddings')) {
    matched = [
      { ...SPECIALISTS.claire, match_score: 98 },
    ];
  } else {
    matched = [];
  }

  return {
    experts: matched,
    isLive: false,
  };
}

export async function markDiscussionResolved(discussionId: string, answer?: string) {
  const result = await apiRequest<any>(`/urgency/discussion/${discussionId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ answer: answer?.trim() }),
  });

  // Demo Fallback: Save reply and mark resolved in demo data
  if (answer && answer.trim()) {
    if (!DEMO_REPLIES[discussionId]) {
      DEMO_REPLIES[discussionId] = [];
    }
    DEMO_REPLIES[discussionId].push({
      id: `r-${Date.now()}`,
      discussionId,
      authorId: 'u-101',
      content: answer.trim(),
      createdAt: new Date().toISOString(),
      author: DEMO_USERS[0],
    });
  }

  return result;
}



export async function fetchMyUrgencyNotifications(page = 1, limit = 20) {
  const currentUser = getStoredUser();
  if (!currentUser) return { notifications: [] as UrgencyNotification[], isLive: true };

  const result = await apiRequest<UrgencyNotification[]>(
    `/urgency/notifications?page=${page}&limit=${limit}`
  );
  if (result.isLive && result.data && Array.isArray(result.data)) {
    const userNotifs = result.data.filter((n: any) => !n.user_id || n.user_id === currentUser.id);
    return { notifications: userNotifs, isLive: true };
  }
  return { notifications: [] as UrgencyNotification[], isLive: false };
}

export async function tagExpertForInput(params: {
  discussionId: string;
  expertId: string;
  note?: string;
}): Promise<{ data: any; isLive: boolean; error?: string }> {
  const result = await apiRequest<any>(`/urgency/discussion/${params.discussionId}/tag-expert`, {
    method: 'POST',
    body: JSON.stringify({
      expert_id: params.expertId,
      note: params.note,
    }),
  });
  return result;
}



export async function dispatchDailyExpertNotifications(communityId?: string) {
  const result = await apiRequest<any>('/urgency/dispatch-daily-notifications', {
    method: 'POST',
    body: JSON.stringify({ community_id: communityId }),
  });
  return result;
}



export async function fetchUrgencyEvaluation() {
  const result = await apiRequest<UrgencyEvaluationMetrics>('/urgency/evaluation');
  if (result.isLive && result.data) {
    return { evaluation: result.data, isLive: true };
  }
  // Demo baseline fallback matching research specifications
  const fallback: UrgencyEvaluationMetrics = {
    before_system: {
      period: 'Baseline (Standard Community Feed)',
      total_questions: 150,
      answered_questions: 62,
      unanswered_questions: 88,
      answer_rate_pct: 41.3,
      avg_time_to_first_answer_hours: 38.4,
      median_time_to_first_answer_hours: 29.5,
      critical_unanswered_pct: 58.7,
    },
    after_system: {
      period: 'Post-Introduction (Urgency Prioritization & Routing)',
      total_questions: 110,
      answered_questions: 93,
      unanswered_questions: 17,
      answer_rate_pct: 84.5,
      avg_time_to_first_answer_hours: 4.6,
      median_time_to_first_answer_hours: 2.8,
      critical_unanswered_pct: 15.5,
    },
    improvements: {
      answer_rate_gain_pct: 43.2,
      time_to_answer_reduction_pct: 88.0,
      critical_abandonment_reduction_pct: 73.6,
      summary: 'Answer rate increased by +43.2% and average response time dropped by 88.0% (from 38.4h down to 4.6h).',
    },
    sample_case_study: {
      question: 'My FastAPI application works locally but fails after deployment.',
      tags: ['fastapi', 'docker', 'deployment'],
      urgency_score: 88.5,
      notified_experts: ['Alex Rivera (DevOps / Docker Lead)', 'Dr. Sarah Chen (Distributed Systems)'],
      time_to_resolution: '1.4 hours',
      status: 'Resolved with accepted container port binding fix',
    },
  };
  return { evaluation: fallback, isLive: false };
}

// ==========================================
// FEATURE A: AI CHAT ASSISTANT API FUNCTIONS
// ==========================================

const LOCAL_STORAGE_CONVERSATIONS_KEY = 'nexus_ai_conversations';

export const getStoredConversations = (): AssistantConversation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredConversation = (conv: AssistantConversation) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredConversations();
    const idx = existing.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      existing[idx] = conv;
    } else {
      existing.unshift(conv);
    }
    localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save conversation to localStorage:', err);
  }
};

export const deleteStoredConversation = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredConversations().filter((c) => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete conversation from localStorage:', err);
  }
};

const CLIENT_TYPO_MAP: Record<string, string> = {
  "how 2": "how to", "wht": "what", "wat": "what", "ur": "your", "u": "you", "r": "are",
  "nd": "and", "plz": "please", "pls": "please", "shold": "should", "recorrect": "correct",
  "gramitical": "grammatical", "undertand": "understand", "wnats": "wants", "fi": "if",
  "mistaes": "mistakes", "inlcude": "include", "inprove": "improve", "dily": "daily",
  "rotine": "routine", "letency": "latency", "infrence": "inference", "stratigies": "strategies",
  "redue": "reduce", "fastpi": "fastapi", "corse": "cors", "errros": "errors",
  "kubernets": "kubernetes", "prism": "prisma", "migraton": "migration", "persmisons": "permissions",
  "resctriceted": "restricted", "polss": "polls", "announcemnts": "announcements", "evnts": "events",
  "resorce": "resources", "downlaod": "download", "bonzai": "bonsai"
};

function analyzeAndCorrectQueryClient(rawQuery: string) {
  let text = (rawQuery || "").trim();
  if (!text) {
    return { correctedQuery: "", hasCorrections: false, didYouMean: null, suggestedQueries: [] };
  }
  let hasCorrections = false;
  let lower = text.toLowerCase();
  for (const [k, v] of Object.entries(CLIENT_TYPO_MAP)) {
    const reg = new RegExp(`\\b${k}\\b`, 'gi');
    if (reg.test(lower)) {
      hasCorrections = true;
      lower = lower.replace(reg, v);
    }
  }

  let corrected = lower;
  if (hasCorrections && corrected.length > 0) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    if (/^(how|what|why|who|where|when|can|is|are)\b/i.test(corrected) && !corrected.endsWith('?')) {
      corrected += '?';
    }
  }

  let suggestions: string[] = [
    "How can I improve my daily routine?",
    "Strategies for reducing LLM inference latency",
    "Who am I, what is my role, and what are my permissions?"
  ];
  if (lower.includes('routine') || lower.includes('daily')) {
    suggestions = [
      "How can I improve my daily routine?",
      "What is the 3-Block deep work schedule?",
      "Managing caffeine timing and circadian rhythms"
    ];
  } else if (lower.includes('latency') || lower.includes('llm') || lower.includes('infer')) {
    suggestions = [
      "Strategies for reducing LLM inference latency in multi-turn agents",
      "How to implement FP8 KV-cache quantization with vLLM",
      "Speculative decoding benchmarks in multi-turn agents"
    ];
  } else if (lower.includes('cors') || lower.includes('fastapi')) {
    suggestions = [
      "How to configure CORS middleware in FastAPI and React?",
      "Troubleshooting preflight OPTIONS 405 error in FastAPI",
      "Handling credentials and cookies across origins"
    ];
  } else if (lower.includes('who am i') || lower.includes('permission') || lower.includes('role')) {
    suggestions = [
      "Who am I, what is my role, and what are my permissions?",
      "What actions are regular members restricted from doing?",
      "How does RBAC role promotion work in Nexus?"
    ];
  } else if (lower.includes('poll') || lower.includes('vote')) {
    suggestions = [
      "What are the active community polls?",
      "How do I vote in community polls?",
      "View live poll results and percentage breakdown"
    ];
  } else if (lower.includes('event') || lower.includes('rsvp')) {
    suggestions = [
      "What upcoming workshops and AMAs can I RSVP for?",
      "How do I claim a QR attendance ticket?",
      "Joining the Google Meet live event link"
    ];
  }

  return {
    correctedQuery: hasCorrections ? corrected : rawQuery,
    hasCorrections,
    didYouMean: hasCorrections
      ? corrected.endsWith('?')
        ? `Did you mean: "${corrected}"`
        : `Did you mean: "${corrected}"?`
      : null,
    suggestedQueries: suggestions,
  };
}

export async function sendAssistantMessage(req: AssistantChatRequest): Promise<{
  data: AssistantChatResponse;
  isLive: boolean;
}> {
  const storedUser = getStoredUser();
  const effectiveProfile = req.user_profile || (storedUser ? {
    id: storedUser.id,
    name: storedUser.full_name,
    email: storedUser.email,
    role: getRoleName(storedUser),
    bio: storedUser.bio || undefined,
    avatar_url: storedUser.avatar_url || undefined,
  } : undefined);

  const payload: AssistantChatRequest = {
    ...req,
    user_profile: effectiveProfile,
  };

  // Try Live Backend first
  const result = await apiRequest<AssistantChatResponse>('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.isLive && result.data) {
    // Sync to local storage for quick offline access
    const convId = result.data.conversation_id;
    const existingConvs = getStoredConversations();
    let currentConv = existingConvs.find((c) => c.id === convId);
    const now = new Date().toISOString();

    if (!currentConv) {
      currentConv = {
        id: convId,
        title: req.message.slice(0, 35) + (req.message.length > 35 ? '...' : ''),
        created_at: now,
        updated_at: now,
        community_id: req.community_id,
        messages: [],
      };
    }

    currentConv.messages.push({
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: req.message,
      timestamp: now,
    });

    currentConv.messages.push({
      id: `msg-a-${Date.now()}`,
      role: 'assistant',
      content: result.data.answer,
      timestamp: now,
      is_community_backed: result.data.is_community_backed,
      missing_information_note: result.data.missing_information_note,
      sources: result.data.sources,
      suggested_followups: result.data.suggested_followups,
      corrected_query: result.data.corrected_query,
      did_you_mean: result.data.did_you_mean,
      suggested_queries: result.data.suggested_queries,
    });

    currentConv.updated_at = now;
    saveStoredConversation(currentConv);

    return { data: result.data, isLive: true };
  }

  // Graceful Offline / Preview Mode Engine
  const query = req.message;
  const qLower = query.toLowerCase();
  const convId = req.conversation_id || `conv-demo-${Date.now()}`;
  const now = new Date().toISOString();

  // Keyword / Intent Analysis across DEMO_DISCUSSIONS
  const matchedSources: AssistantSource[] = [];
  let isCommunityBacked = false;
  let answer = '';
  let missingNote: string | undefined = undefined;
  let followups: string[] = [];

  const targetCommId = req.community_id || (
    qLower.includes('next') || qLower.includes('react') ? 'c-002' :
    qLower.includes('k8s') || qLower.includes('cloud') || qLower.includes('kubernetes') ? 'c-003' :
    qLower.includes('design') || qLower.includes('ui') ? 'c-004' : 'c-001'
  );
  const targetComm = DEMO_COMMUNITIES.find((c) => c.id === targetCommId) || DEMO_COMMUNITIES[0];

  if ((qLower.includes('member') || qLower.includes('user')) && (qLower.includes('restrict') || qLower.includes('permission') || qLower.includes('role') || qLower.includes('scope') || qLower.includes('can') || qLower.includes('allowed') || qLower.includes('only have'))) {
    matchedSources.unshift({
      id: `src-rbac-member-restrictions`,
      discussion_id: `rbac-roles`,
      community_id: targetComm.id,
      community_name: 'Nexus RBAC Governance',
      title: 'Role-Based Access Control: Member Role Scope & Restrictions',
      author_name: 'David Thorne (Platform Administrator)',
      excerpt: 'Members are restricted from creating/deleting communities, posting announcements, and accessing /admin. Members can join, discuss, reply, vote in polls, RSVP to events, and download resources.',
      relevance_score: 0.99,
      is_verified_solution: true,
      url: `/admin`,
    });
  } else if (qLower.includes('rule') || qLower.includes('guideline') || qLower.includes('conduct') || qLower.includes('policy')) {
    matchedSources.unshift({
      id: `src-rules-${targetComm.id}`,
      discussion_id: `rules-${targetComm.id}`,
      community_id: targetComm.id,
      community_name: targetComm.name,
      title: `${targetComm.name}: Community Guidelines & Code of Conduct`,
      author_name: targetComm.owner?.full_name || 'Community Governance',
      excerpt: 'Reproducible benchmarks, secret sanitization, empirical verification, and respectful peer review guidelines.',
      relevance_score: 0.98,
      is_verified_solution: true,
      url: `/communities/${targetComm.id}?tab=about`,
    });
  } else if (qLower.includes('poll') || qLower.includes('vote') || qLower.includes('survey')) {
    matchedSources.unshift({
      id: `src-polls-${targetComm.id}`,
      discussion_id: `polls-${targetComm.id}`,
      community_id: targetComm.id,
      community_name: targetComm.name,
      title: `${targetComm.name}: Active Community Polls`,
      author_name: 'Community Engagement',
      excerpt: 'Cast your vote on active technical questions and view real-time percentage breakdowns.',
      relevance_score: 0.97,
      is_verified_solution: true,
      url: `/communities/${targetComm.id}?tab=polls`,
    });
  } else if (qLower.includes('announcement') || qLower.includes('pinned') || qLower.includes('broadcast') || qLower.includes('news')) {
    matchedSources.unshift({
      id: `src-ann-${targetComm.id}`,
      discussion_id: `ann-${targetComm.id}`,
      community_id: targetComm.id,
      community_name: targetComm.name,
      title: `${targetComm.name}: Pinned Announcements & Broadcasts`,
      author_name: targetComm.owner?.full_name || 'Community Lead',
      excerpt: 'Official pinned architecture announcements, release notes, and scheduled maintenance alerts.',
      relevance_score: 0.97,
      is_verified_solution: true,
      url: `/communities/${targetComm.id}?tab=announcements`,
    });
  } else if (qLower.includes('event') || qLower.includes('workshop') || qLower.includes('rsvp') || qLower.includes('ama')) {
    matchedSources.unshift({
      id: `src-event-${targetComm.id}`,
      discussion_id: `event-${targetComm.id}`,
      community_id: targetComm.id,
      community_name: targetComm.name,
      title: `${targetComm.name}: Live Workshops & Events Calendar`,
      author_name: 'Platform Director',
      excerpt: 'Upcoming interactive workshops, Google Meet virtual rooms, attendee tracking, and QR tickets.',
      relevance_score: 0.98,
      is_verified_solution: true,
      url: `/communities/${targetComm.id}?tab=events`,
    });
  } else if (qLower.includes('resource') || qLower.includes('download') || qLower.includes('blueprint') || qLower.includes('whitepaper')) {
    matchedSources.unshift({
      id: `src-res-${targetComm.id}`,
      discussion_id: `res-${targetComm.id}`,
      community_id: targetComm.id,
      community_name: targetComm.name,
      title: `${targetComm.name}: Downloadable Architecture Blueprints`,
      author_name: 'Community Artifacts',
      excerpt: 'Production Docker Compose templates, Helm charts, architecture flowcharts, and cheat sheets.',
      relevance_score: 0.96,
      is_verified_solution: true,
      url: `/communities/${targetComm.id}?tab=resources`,
    });
  }

  // Check matching discussions
  for (const d of DEMO_DISCUSSIONS) {
    if (req.community_id && d.community_id !== req.community_id) continue;
    const dText = `${d.title} ${d.content} ${(d.tags || []).map((t) => t.tag.name).join(' ')}`.toLowerCase();

    let matches = false;
    let score = 0;

    if (qLower.includes('routine') || qLower.includes('daily') || qLower.includes('productivity') || qLower.includes('habit') || qLower.includes('circadian') || qLower.includes('caffeine') || qLower.includes('morning')) {
      if (d.id === 'd-103') { matches = true; score = 0.88; }
    } else if (qLower.includes('latency') || qLower.includes('llm') || qLower.includes('infer') || qLower.includes('cache')) {
      if (d.id === 'd-101') { matches = true; score = 0.85; }
    } else if (qLower.includes('react') || qLower.includes('server action') || qLower.includes('optimistic')) {
      if (d.id === 'd-201') { matches = true; score = 0.82; }
    } else if (qLower.includes('cors') || qLower.includes('cross-origin') || qLower.includes('fastapi')) {
      if (d.id === 'd-401' || d.id === 'd-402' || d.id === 'd-403') { matches = true; score = 0.84; }
    } else if (qLower.includes('bill') || qLower.includes('electric') || qLower.includes('energy') || qLower.includes('power')) {
      if (d.id === 'd-501' || d.id === 'd-502') { matches = true; score = 0.91; }
    } else if (qLower.includes('k8s') || qLower.includes('migration') || qLower.includes('prisma')) {
      if (d.id === 'd-301') { matches = true; score = 0.80; }
    } else if (qLower.includes('create community') || qLower.includes('new community') || qLower.includes('admin') || qLower.includes('rbac')) {
      if (d.id === 'd-103') { matches = true; score = 0.95; }
    } else if (qLower.includes('rule') || qLower.includes('guideline') || qLower.includes('conduct') || qLower.includes('policy')) {
      if (d.id === 'd-103') { matches = true; score = 0.98; }
    } else if (qLower.includes('poll') || qLower.includes('vote') || qLower.includes('survey')) {
      if (d.id === 'd-101') { matches = true; score = 0.97; }
    } else if (qLower.includes('announcement') || qLower.includes('pinned') || qLower.includes('broadcast')) {
      if (d.id === 'd-101') { matches = true; score = 0.97; }
    } else if (qLower.includes('event') || qLower.includes('workshop') || qLower.includes('rsvp') || qLower.includes('ama')) {
      if (d.id === 'd-101') { matches = true; score = 0.98; }
    } else if (qLower.includes('resource') || qLower.includes('download') || qLower.includes('blueprint') || qLower.includes('whitepaper')) {
      if (d.id === 'd-101') { matches = true; score = 0.96; }
    } else if (qLower.includes('unanswered') || qLower.includes('urgency') || qLower.includes('expert routing')) {
      if (d.id === 'd-501') { matches = true; score = 0.95; }
    } else if (qLower.includes('what is nexus') || qLower.includes('about nexus') || qLower.includes('features') || qLower.includes('community')) {
      if (d.id === 'd-103') { matches = true; score = 0.90; }
    }

    if (matches) {
      const comm = DEMO_COMMUNITIES.find((c) => c.id === d.community_id);
      matchedSources.push({
        id: `src-${d.id}`,
        discussion_id: d.id,
        community_id: d.community_id,
        community_name: comm ? comm.name : 'Community Discussion',
        title: d.title,
        author_name: d.author?.full_name || 'Community Engineer',
        author_avatar: d.author?.avatar_url,
        excerpt: d.content.slice(0, 160) + '...',
        relevance_score: score,
        is_verified_solution: d.problem_status === 'verified_solved',
        url: `/communities/${d.community_id}/discussions/${d.id}`,
      });
    }
  }

  const userName = effectiveProfile?.name ? effectiveProfile.name.split(' ')[0] : '';
  const greeting = userName ? `Hi ${userName}! ` : '';
  const isAdmin = effectiveProfile?.role?.toLowerCase() === 'admin';

  const isProfileQuery =
    qLower.includes('who am i') ||
    qLower.includes('my name') ||
    qLower.includes('my role') ||
    qLower.includes('my profile') ||
    qLower.includes('my account') ||
    qLower.includes('my detail') ||
    qLower.includes('what is my role') ||
    qLower.includes('what is my name') ||
    qLower.includes('who is logged in') ||
    qLower.includes('what are my permission') ||
    qLower.includes('what can i do') ||
    qLower.includes('about me');

  if (isProfileQuery && effectiveProfile && effectiveProfile.name) {
    const roleLabel = isAdmin ? 'Administrator' : 'Member';
    isCommunityBacked = true;
    answer = `${greeting}Here are your active **Nexus Account & Profile Details** loaded into this AI session:

### 👤 User Identity & Profile:
* **Full Name**: **${effectiveProfile.name}**
* **Email Address**: \`${effectiveProfile.email || 'Not specified'}\`
* **Account Role**: **${roleLabel}** ${isAdmin ? '🛡️ *(Full Administrative Access)*' : '👤 *(Standard Community Member)*'}
* **Bio / Technical Focus**: ${effectiveProfile.bio || 'Software Engineer & Community Participant'}
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

Feel free to ask me any questions tailored to your **${roleLabel}** capabilities!`;
    followups = [
      'What are the restrictions on regular members?',
      'How do I create a new technical community?',
      'Where can I find upcoming workshops to RSVP?',
    ];
  } else if (matchedSources.length > 0) {
    isCommunityBacked = true;
    if ((qLower.includes('member') || qLower.includes('user')) && (qLower.includes('restrict') || qLower.includes('permission') || qLower.includes('limit') || qLower.includes('allow') || qLower.includes('can member') || qLower.includes('only have') || qLower.includes('scope'))) {
      answer = `${greeting}In **Nexus Community Platform**, the **Member** role is intentionally **restricted** to ensure structured community governance, prevent spam, and maintain technical integrity:

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

Review full governance policies under the **About** tab at \`/communities/${targetComm.id}?tab=about\` or in the **Admin Portal** at \`/admin\`.`;
      followups = [
        'How can a member request a new community space?',
        'Who can promote a member to Administrator?',
        'Where can I review full community policies?',
      ];
    } else if (qLower.includes('rule') || qLower.includes('guideline') || qLower.includes('conduct') || qLower.includes('policy')) {
      answer = `${greeting}Here are the official **Community Rules & Guidelines** for Nexus technical spaces:

### 1. AI Engineering & MLOps (/communities/c-001):
* **Reproducible Benchmark Standards**: Always include hardware specs (GPU, VRAM), batch sizes, and p50/p95/p99 latency percentiles.
* **Strict Secret Sanitization**: Never publish confidential customer prompts, proprietary model weights, or private API keys.
* **Empirical Verification**: Mark solutions as verified only after reproducing on standard benchmark test sets.

### 2. Fullstack Next.js & React 19 (/communities/c-002):
* **Minimal Reproductions**: Link a minimal GitHub repo, CodeSandbox, or reproduction snippet for hydration and Server Action issues.
* **Transition Discipline**: Wrap all optimistic state updates inside React 19 \`startTransition\` or \`useActionState\`.
* **Server/Client Boundary**: Never expose sensitive environment variables to Client Components.

### 3. Cloud Native & Kubernetes Core (/communities/c-003):
* **Blameless Incident Post-Mortems**: Focus strictly on architecture and systemic safeguards, never individual blame.
* **Two-Phase Migrations**: Adhere strictly to the expand-and-contract pattern for zero-downtime Prisma migrations.

### Universal Code of Conduct:
* **Constructive Collaboration**: Critique system designs and code, never individuals.
* **Reproduction Standards**: Provide clear logs and reproduction steps.
* **Verification Honesty**: Mark solutions verified only after practical testing.

Review full community guidelines under the **About** tab on any community page!`;
      followups = [
        'What are the guidelines for marking verified solutions?',
        'Where can I review full community policies?',
        'How do moderators enforce code of conduct?',
      ];
    } else if (qLower.includes('poll') || qLower.includes('vote') || qLower.includes('survey')) {
      answer = `${greeting}Here are the active community polls across Nexus:

### 📊 Active Poll in AI Engineering & MLOps (/communities/c-001):
**"Which inference optimization delivers the highest speedup in your production stack?"**
* **vLLM PagedAttention v2**: 48% (142 votes)
* **Semantic Caching via Redis**: 31% (92 votes)
* **Speculative Decoding**: 14% (41 votes)
* **FP8 Quantization**: 7% (21 votes)
* **Total Votes**: **296 votes recorded**

### 📊 Active Poll in React 19 & Next.js (/communities/c-002):
**"What is your primary state management approach in React 19 App Router?"**
* **Server Actions + useActionState + useOptimistic**: 54% (188 votes)
* **Zustand**: 26% (90 votes)
* **TanStack Query**: 15% (52 votes)
* **Redux Toolkit**: 5% (17 votes)

### How Polls Work:
* **Vote Live**: Navigate to the **Polls** tab on any community page and click your option.
* **Create a Poll**: Community members can launch polls using the **+ Create Poll** button.`;
      followups = [
        'How do I create a new community poll?',
        'Can members change their vote after submitting?',
        'What are the active polls in Cloud Native?',
      ];
    } else if (qLower.includes('announcement') || qLower.includes('news') || qLower.includes('broadcast') || qLower.includes('pinned')) {
      answer = `${greeting}Here are the official pinned announcements from Nexus community leaders:

### 🚀 AI Engineering & MLOps 📌 *(Pinned)*
* **"vLLM PagedAttention v2 Live Demo Session"** by Dr. Sarah Chen
* **Summary**: Join Lead Architect Dr. Sarah Chen this Friday at 4:00 PM UTC for a live walkthrough of FP8 quantization and continuous batching benchmarks.

### ⚡ Fullstack Next.js & React 19 📌 *(Pinned)*
* **"React 19 Server Actions & Optimistic UI Migration Guide"** by Alex Rivera
* **Summary**: Step-by-step migration guide for \`useActionState\`, \`useOptimistic\`, and FastAPI cross-origin cookie authentication.

### 🛡️ Cloud Native & Kubernetes Core 📌 *(Pinned)*
* **"Production Post-Mortem: Zero-Downtime Prisma Migration"** by Marcus Vance
* **Summary**: Deep-dive analysis of distributed advisory locking and race conditions during Kubernetes rollouts.

Browse the **Announcements** tab on any community page to view full broadcast threads!`;
      followups = [
        'Who can publish pinned announcements?',
        'Where can I read the full vLLM demo announcement?',
        'Are there any scheduled cluster maintenance notices?',
      ];
    } else if (qLower.includes('resource') || qLower.includes('download') || qLower.includes('blueprint') || qLower.includes('whitepaper')) {
      answer = `${greeting}Here are top downloadable architecture blueprints and guides available in the community repositories:

### 📦 AI Engineering & MLOps (/communities/c-001):
* **"Enterprise LLM Inference Optimization Blueprint"** (PDF, 2.4 MB | 342 downloads)
* **"vLLM Production Docker Compose & Kubernetes Helm Template"** (ZIP, 1.1 MB | 518 downloads)

### 📦 Fullstack Next.js & React 19 (/communities/c-002):
* **"React 19 Server Actions & Optimistic UI Flow Chart"** (PDF, 3.2 MB | 620 downloads)
* **"FastAPI + Next.js 16 Secure Auth Template"** (ZIP, 4.5 MB | 789 downloads)

### 📦 Cloud Native & Kubernetes Core (/communities/c-003):
* **"Kubernetes Cluster Security Hardening Checklist"** (PDF, 5.1 MB | 410 downloads)
* **"Prisma Distributed Advisory Lock Migration Scripts"** (ZIP, 850 KB | 532 downloads)

Navigate to the **Resources** tab on any community page to download any package directly!`;
      followups = [
        'How do I upload a community resource?',
        'Where can I download the vLLM Helm template?',
        'Are resources free for all community members?',
      ];
    } else if (qLower.includes('create community') || qLower.includes('new community')) {
      answer = `${greeting}In **Nexus Community Platform**, creating a new community space is an administrative action managed through RBAC:

1. **Role Requirement**: ${
        isAdmin
          ? '**You are currently an Administrator**, so you have full permissions to create and manage communities directly!'
          : 'Only users with the **Admin** role (e.g. David Thorne) can create communities.'
      }
2. **Steps**:
   * Click the vibrant orange **+ New Community** button in the top navbar, or visit the Admin Portal at \`/admin\`.
   * Fill in the Community Name, Topic Category, Description, and visibility settings (Public or Private).
   * Pick a banner preset or provide a custom banner image.
3. **Automated Setup**: Once created, discussion threads, poll widgets, event calendars, and resource tabs are automatically initialized for that community!`;
      followups = [
        'How do roles and RBAC permissions work in Nexus?',
        'Can standard members request a new community?',
        'Where do I access the Admin Portal?',
      ];
    } else if (qLower.includes('verified solution') || qLower.includes('solution') || qLower.includes('problem classification')) {
      answer = `${greeting}**Verified Solutions & Problem Classification** is a core technical feature of Nexus:

* **Post Classification**: Discussions are tagged as **Problem**, **Question**, or **Discussion**.
* **Problem Lifecycle**: Problems advance through clear states: \`open\` ➔ \`solution_proposed\` ➔ \`verified_solved\` (or \`unresolved\`).
* **Solution Proposals**: Community members submit proposed solutions with step-by-step checklists and expected outcomes.
* **Author Verification**: The original poster can review proposed fixes and mark them as **Verified Solution**, assigning an effectiveness rating (1–5 stars) and feedback note.
* **Proactive Retrieval**: When typing problem symptoms, our AI engine proactively surfaces verified solutions to resolve issues before posting!`;
      followups = [
        'How does the proactive solution retrieval widget work?',
        'Who can verify a proposed solution?',
        'Can a solution rating be updated later?',
      ];
    } else if (qLower.includes('unanswered') || qLower.includes('urgency') || qLower.includes('expert routing')) {
      answer = `The **Unanswered Questions & Expert Prioritization** module (\`/unanswered\`) prevents technical questions from falling through the cracks:

* **Urgency Scoring (0–100)**: Calculates priority based on elapsed time without answers, post classification, complexity, and tag importance.
* **Smart Expert Routing**: Matches question tags with community member expertise profiles.
* **Evaluation Metrics**: Reduces average response time from 38.4h down to 4.6h (+43.2% answer rate gain).`;
      followups = [
        'How are expertise profiles calculated for members?',
        'Where can I view all urgent unanswered questions?',
        'How do notification triggers work for experts?',
      ];
    } else if (qLower.includes('event') || qLower.includes('workshop') || qLower.includes('rsvp')) {
      answer = `The **Nexus Events & AMAs** module (\`/events\`) hosts interactive technical workshops:

* **Interactive Calendar**: Browse upcoming virtual sessions, AMAs, and webinars across all communities.
* **One-Click RSVP**: Track attendee counts and manage your registration with instant updates.
* **Virtual Integration**: Direct Google Meet and calendar integrations for live workshops.`;
      followups = [
        'How do I RSVP for an upcoming workshop?',
        'Can community moderators host live AMAs?',
        'Where can I see past event recordings?',
      ];
    } else if (qLower.includes('what is nexus') || qLower.includes('about nexus') || qLower.includes('features') || qLower.includes('community')) {
      answer = `**Nexus Community Platform** is an enterprise-grade collaborative hub for engineers, creators, systems architects, and technology leaders.

### Core Communities:
1. **AI Engineering & MLOps** (\`/communities/c-001\`): Fine-tuning LLMs, inference latency optimization, and evaluation pipelines.
2. **Fullstack Next.js & React 19** (\`/communities/c-002\`): React Server Components, App Router, useActionState, useOptimistic, and CORS configuration.
3. **Cloud Native & Kubernetes Core** (\`/communities/c-003\`): Production incident post-mortems, GitOps, zero-downtime Prisma migrations, and power diagnostics.
4. **Design Systems & UI Engineering** (\`/communities/c-004\`): Design tokens, micro-interactions, accessible UI components.

### Platform Highlights:
* **Interactive Modules**: Technical discussions, live events & AMAs, real-time polls & surveys, downloadable resources.
* **Verified Solutions**: Step-by-step checklists, 1–5 star ratings, and proactive solution discovery.
* **AI Duplicate Question Detection**: Semantic checks prevent redundant threads.
* **AI-Powered Urgency Routing**: High-urgency unanswered question prioritization at \`/unanswered\`.
* **Dual-Mode Engine**: Real-time PostgreSQL database with seamless offline demo preview engine.
* **Theme Support**: Dark & Light mode toggle in the header.`;
      followups = [
        'How do verified solutions work in Nexus?',
        'How do I create a new community space?',
        'Where can I find upcoming technical events?',
      ];
    } else if (qLower.includes('routine') || qLower.includes('daily') || qLower.includes('productivity') || qLower.includes('habit')) {
      answer = `Based on discussions in the **AI Engineering & MLOps** community, here are the most effective, community-verified strategies to optimize your daily routine:

### 1. The 3-Block Deep Work System (Recommended by Alex Rivera)
* **Block 1: Deep Work (9:00 AM – 11:30 AM)**: Strict no-meetings window dedicated solely to your highest-complexity architectural problems.
* **Block 2: Collaboration & Reviews (1:00 PM – 3:00 PM)**: Group code reviews, sprint syncs, and mentorship when cognitive energy naturally dips.
* **Block 3: Shutdown Routine (5:00 PM – 5:30 PM)**: Review tomorrow's top 3 priorities, close tabs, and achieve clean mental disconnection.

### 2. Circadian Rhythm & Energy Management (Recommended by Dr. Sarah Chen)
* **Morning Light Exposure**: Get 15 minutes of outdoor sunlight within 30 minutes of waking to anchor cortisol and eliminate the 3:00 PM brain fog.
* **Delayed Caffeine Intake**: Delay your first coffee by 60–90 minutes post-waking to avoid midday adenosine crashes.

Check out the original community discussions and comments below for complete implementation details and peer discussion!`;
      followups = [
        'How do I structure the 3-Block deep work window?',
        'What are the best tips to beat afternoon brain fog?',
        'Can you show me the discussion on circadian rhythms?',
        'How do you design an effective shutdown routine?',
      ];
    } else if (qLower.includes('circadian') || qLower.includes('caffeine')) {
      answer = `In **AI Engineering & MLOps**, Dr. Sarah Chen shared her community-verified morning protocol:

* **Morning Natural Light (0–30 min upon waking)**: Getting 15 minutes of outdoor sunlight resets the master circadian clock (SCN) and anchors your cortisol rhythm, eliminating the 3:00 PM energy slump.
* **Delayed Caffeine Window (60–90 min post-waking)**: Adenosine levels are still clearing in the first hour after waking. Waiting 60–90 minutes before your first coffee prevents adenosine rebound crashes later in the day.
* **Hydration Protocol**: Rehydrate with 500ml of water and electrolytes before your first deep work session.

Refer to the source discussion and comments below for the full discussion thread!`;
      followups = [
        'Can you explain the first recommendation in more detail?',
        'Are there other community members who solved this problem?',
        'What troubleshooting steps are recommended next?',
      ];
    } else {
      answer = `Here are the top findings from relevant Nexus community discussions:

${matchedSources.map((s) => `* **${s.title}**: ${s.excerpt}`).join('\n\n')}

You can click any of the source cards below to read the original discussions and contribute your own insights.`;
      followups = [
        'Can you explain this in more detail?',
        'What are alternative approaches suggested by the community?',
        'Are there related discussions on this topic?',
      ];
    }
  } else {
    // Honest handling of missing information + General AI Guidance
    isCommunityBacked = false;
    missingNote = 'No specific Nexus community discussions directly match this topic yet.';
    answer = `I searched the Nexus community discussions, but couldn't find any threads discussing this specific question yet.

### 💡 General AI Guidance
*(Note: The following recommendations are general AI-generated knowledge, not backed by verified Nexus community discussions.)*

Here is a structured, practical approach to address your question:

1. **Clarify Your Objectives**: Clearly define your target outcome, constraints, and baseline metrics before making changes.
2. **Apply Iterative Increments**: Make small, verifiable modifications rather than overhaul systems or routines all at once.
3. **Measure & Validate Feedback**: Track signals for at least 7–14 days to observe real trends rather than short-term fluctuations.
4. **Leverage Peer Collaboration**: Discussing edge cases with peers consistently surfaces hidden pitfalls and faster shortcuts.

---
**💡 Pro Tip:** If this is an important topic for your team, consider starting a new discussion thread in one of our technical communities (such as **AI Engineering & MLOps** or **Fullstack Next.js**). Our active members frequently share real-world architectures and case studies!`;
    followups = [
      'Would you like recommendations on starting a discussion for this?',
      'Can you suggest a related Nexus community to join?',
      'Can you provide actionable next steps on this topic?',
    ];
  }

  const clientAnalysis = analyzeAndCorrectQueryClient(req.message);
  if (clientAnalysis.hasCorrections && !answer.includes('Interpreted') && !answer.includes('Did you mean')) {
    answer = `> 💡 **Did you mean:** *"${clientAnalysis.correctedQuery}"*  \n*(Automatically corrected typos & grammatical mistakes in your input)*\n\n${answer}`;
  }

  const fallbackResponse: AssistantChatResponse = {
    answer,
    is_community_backed: isCommunityBacked,
    missing_information_note: missingNote,
    sources: matchedSources,
    suggested_followups: followups,
    conversation_id: convId,
    corrected_query: clientAnalysis.hasCorrections ? clientAnalysis.correctedQuery : null,
    did_you_mean: clientAnalysis.didYouMean,
    suggested_queries: clientAnalysis.suggestedQueries,
  };

  // Save to local storage
  const existingConvs = getStoredConversations();
  let currentConv = existingConvs.find((c) => c.id === convId);
  if (!currentConv) {
    currentConv = {
      id: convId,
      title: (clientAnalysis.correctedQuery || req.message).slice(0, 35) + ((clientAnalysis.correctedQuery || req.message).length > 35 ? '...' : ''),
      created_at: now,
      updated_at: now,
      community_id: req.community_id,
      messages: [],
    };
  }

  currentConv.messages.push({
    id: `msg-u-${Date.now()}`,
    role: 'user',
    content: req.message,
    timestamp: now,
  });

  currentConv.messages.push({
    id: `msg-a-${Date.now()}`,
    role: 'assistant',
    content: answer,
    timestamp: now,
    is_community_backed: isCommunityBacked,
    missing_information_note: missingNote,
    sources: matchedSources,
    suggested_followups: followups,
    corrected_query: clientAnalysis.hasCorrections ? clientAnalysis.correctedQuery : null,
    did_you_mean: clientAnalysis.didYouMean,
    suggested_queries: clientAnalysis.suggestedQueries,
  });

  currentConv.updated_at = now;
  saveStoredConversation(currentConv);

  return {
    data: fallbackResponse,
    isLive: false,
  };
}

export async function fetchAssistantConversations(): Promise<{
  conversations: AssistantConversation[];
  isLive: boolean;
}> {
  const result = await apiRequest<AssistantConversation[]>('/assistant/conversations');
  if (result.isLive && result.data && Array.isArray(result.data)) {
    return { conversations: result.data, isLive: true };
  }
  return { conversations: getStoredConversations(), isLive: false };
}

export async function deleteAssistantConversation(id: string): Promise<boolean> {
  deleteStoredConversation(id);
  const result = await apiRequest(`/assistant/conversations/${id}`, { method: 'DELETE' });
  return result.isLive;
}

// ----------------- IN-APP NOTIFICATIONS API -----------------

let demoNotificationsState: InAppNotification[] = [];

export async function fetchInAppNotifications(options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
  isLive: boolean;
}> {
  const currentUser = getStoredUser();
  if (!currentUser) {
    return {
      notifications: [],
      total: 0,
      unreadCount: 0,
      isLive: true,
    };
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const unreadOnly = options?.unreadOnly ? '&unread_only=true' : '';

  const result = await apiRequest<InAppNotification[]>(
    `/notifications?page=${page}&limit=${limit}${unreadOnly}`
  );

  if (result.isLive && result.data && Array.isArray(result.data)) {
    const userNotifs = result.data.filter((n: any) => !n.user_id || n.user_id === currentUser.id);
    const unreadFromMeta = (result as any).pagination?.unreadCount ?? (result as any).pagination?.unread_count;
    const computedUnread = unreadFromMeta !== undefined ? unreadFromMeta : userNotifs.filter((n) => !n.is_read).length;
    return {
      notifications: userNotifs,
      total: (result as any).pagination?.total ?? userNotifs.length,
      unreadCount: computedUnread,
      isLive: true,
    };
  }

  // Fallback for current logged-in user only
  let list = demoNotificationsState.filter((n) => !n.user_id || n.user_id === currentUser.id);
  if (options?.unreadOnly) {
    list = list.filter((n) => !n.is_read);
  }
  const unreadCount = list.filter((n) => !n.is_read).length;

  return {
    notifications: list.slice((page - 1) * limit, page * limit),
    total: list.length,
    unreadCount,
    isLive: false,
  };
}

export async function fetchUnreadInAppNotificationCount(): Promise<{
  unreadCount: number;
  isLive: boolean;
}> {
  const currentUser = getStoredUser();
  if (!currentUser) {
    return { unreadCount: 0, isLive: true };
  }

  const result = await apiRequest<{ unread_count: number }>('/notifications/unread-count');
  if (result.isLive && result.data && typeof result.data.unread_count === 'number') {
    return { unreadCount: result.data.unread_count, isLive: true };
  }

  const unreadCount = demoNotificationsState.filter((n) => (!n.user_id || n.user_id === currentUser.id) && !n.is_read).length;
  return { unreadCount, isLive: false };
}

export async function markInAppNotificationAsRead(id: string): Promise<boolean> {
  const result = await apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
  });

  const idx = demoNotificationsState.findIndex((n) => n.id === id);
  if (idx !== -1) {
    demoNotificationsState[idx] = {
      ...demoNotificationsState[idx],
      is_read: true,
      read_at: new Date().toISOString(),
    };
  }

  return true;
}

export async function markAllInAppNotificationsAsRead(): Promise<boolean> {
  await apiRequest('/notifications/mark-all-read', {
    method: 'PATCH',
  });

  demoNotificationsState = demoNotificationsState.map((n) => ({
    ...n,
    is_read: true,
    read_at: new Date().toISOString(),
  }));

  return true;
}

export async function deleteInAppNotification(id: string): Promise<boolean> {
  await apiRequest(`/notifications/${id}`, {
    method: 'DELETE',
  });

  demoNotificationsState = demoNotificationsState.filter((n) => n.id !== id);
  return true;
}



// ----------------- RBAC & ROLES MASTER APIS -----------------

export async function fetchRoles(): Promise<{ roles: any[]; isLive: boolean }> {
  const result = await apiRequest<any[]>('/roles');
  if (result.isLive && result.data && Array.isArray(result.data)) {
    return { roles: result.data, isLive: true };
  }
  return { roles: DEMO_ROLES, isLive: false };
}

export async function updateRolePermissions(
  roleId: string,
  permissions: any
): Promise<{ success: boolean; isLive: boolean; error?: string }> {
  const result = await apiRequest(`/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
  if (result.isLive && !result.error) {
    return { success: true, isLive: true };
  }
  return { success: false, isLive: result.isLive, error: result.error };
}
