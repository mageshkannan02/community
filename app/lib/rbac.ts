import { User } from './types';
import { DEMO_ROLES } from './demo-data';

export type RoleName = 'Admin' | 'Member';

export type Permission =
  | 'view_admin_panel'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_communities'
  | 'edit_community'
  | 'delete_community'
  | 'pin_discussion'
  | 'lock_discussion'
  | 'delete_any_discussion'
  | 'delete_any_reply'
  | 'post_announcements'
  | 'create_community'
  | 'join_community'
  | 'create_discussion'
  | 'post_reply'
  | 'vote_poll'
  | 'register_event';

export interface PermissionDefinition {
  key: Permission;
  label: string;
  description: string;
  category: 'Administration' | 'Community Governance' | 'Participation & Content';
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'view_admin_panel',
    label: 'View Admin Control Center',
    description: 'Access administrative dashboard & analytics',
    category: 'Administration',
  },
  {
    key: 'manage_users',
    label: 'Suspend / Activate Accounts',
    description: 'Change account status and suspend members',
    category: 'Administration',
  },
  {
    key: 'manage_roles',
    label: 'Promote / Demote User Roles',
    description: 'Grant or revoke Administrator privileges',
    category: 'Administration',
  },
  {
    key: 'post_announcements',
    label: 'Publish Platform Announcements',
    description: 'Broadcast global alerts and notifications',
    category: 'Administration',
  },
  {
    key: 'create_community',
    label: 'Create New Communities',
    description: 'Found and configure new public or private hubs',
    category: 'Community Governance',
  },
  {
    key: 'manage_communities',
    label: 'Govern Communities (Lock / Archive)',
    description: 'Edit visibility, lock, or archive spaces',
    category: 'Community Governance',
  },
  {
    key: 'edit_community',
    label: 'Edit Community Metadata',
    description: 'Modify description, rules, and banners',
    category: 'Community Governance',
  },
  {
    key: 'delete_community',
    label: 'Delete Community Hubs',
    description: 'Permanently remove communities and data',
    category: 'Community Governance',
  },
  {
    key: 'join_community',
    label: 'Join & Follow Communities',
    description: 'Become an official community member',
    category: 'Participation & Content',
  },
  {
    key: 'create_discussion',
    label: 'Start Discussions & Threads',
    description: 'Post new questions and share insights',
    category: 'Participation & Content',
  },
  {
    key: 'post_reply',
    label: 'Reply & Propose Solutions',
    description: 'Submit answers and comment on posts',
    category: 'Participation & Content',
  },
  {
    key: 'pin_discussion',
    label: 'Pin Threads to Community Top',
    description: 'Keep critical threads highlighted',
    category: 'Participation & Content',
  },
  {
    key: 'lock_discussion',
    label: 'Lock Discussions',
    description: 'Prevent further replies on specific threads',
    category: 'Participation & Content',
  },
  {
    key: 'delete_any_discussion',
    label: 'Delete Inappropriate Content',
    description: 'Moderator purge of discussions',
    category: 'Participation & Content',
  },
  {
    key: 'vote_poll',
    label: 'Vote in Community Polls',
    description: 'Cast ballots on community questions',
    category: 'Participation & Content',
  },
  {
    key: 'register_event',
    label: 'Register for Live Events & QR',
    description: 'RSVP to events and claim QR tickets',
    category: 'Participation & Content',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  Admin: [
    'view_admin_panel',
    'manage_users',
    'manage_roles',
    'manage_communities',
    'edit_community',
    'delete_community',
    'pin_discussion',
    'lock_discussion',
    'delete_any_discussion',
    'delete_any_reply',
    'post_announcements',
    'create_community',
    'join_community',
    'create_discussion',
    'post_reply',
    'vote_poll',
    'register_event',
  ],
  Member: [
    'create_community',
    'join_community',
    'create_discussion',
    'post_reply',
    'vote_poll',
    'register_event',
  ],
};

const STORAGE_KEY = 'nexus_rbac_permissions_matrix';

/**
 * Retrieves the current active permissions matrix (persisted in localStorage or default fallback)
 */
export function getRolePermissions(): Record<RoleName, Permission[]> {
  if (typeof window === 'undefined') {
    return DEFAULT_ROLE_PERMISSIONS;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const memberPerms: Permission[] = Array.isArray(parsed.Member)
          ? [...parsed.Member]
          : [...DEFAULT_ROLE_PERMISSIONS.Member];
        if (!memberPerms.includes('create_community')) {
          memberPerms.push('create_community');
        }
        return {
          Admin: Array.isArray(parsed.Admin) ? parsed.Admin : DEFAULT_ROLE_PERMISSIONS.Admin,
          Member: memberPerms,
        };
      }
    }
  } catch {}
  return DEFAULT_ROLE_PERMISSIONS;
}

/**
 * Persists the updated role permissions matrix
 */
export function saveRolePermissions(matrix: Record<RoleName, Permission[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    window.dispatchEvent(new Event('nexus_rbac_permissions_updated'));
  } catch {}
}

/**
 * Normalizes and extracts the user's role name ('Admin' or 'Member').
 */
export function getRoleName(user: User | null): RoleName {
  if (!user) return 'Member';

  // Check role object name
  if (user.role?.name) {
    const raw = user.role.name.toLowerCase();
    if (raw.includes('admin')) return 'Admin';
    return 'Member';
  }

  // Check raw role string if stored directly
  if (typeof (user as any).role === 'string') {
    const raw = (user as any).role.toLowerCase();
    if (raw.includes('admin')) return 'Admin';
    return 'Member';
  }

  // Check role_id against DEMO_ROLES
  if (user.role_id) {
    const match = DEMO_ROLES.find((r) => r.id === user.role_id);
    if (match && match.name.toLowerCase().includes('admin')) {
      return 'Admin';
    }
  }

  // Check email convention fallback
  if (user.email && user.email.toLowerCase().includes('admin')) {
    return 'Admin';
  }

  return 'Member';
}

/**
 * Returns true if the user is a platform administrator.
 */
export function isAdmin(user: User | null): boolean {
  return getRoleName(user) === 'Admin';
}

/**
 * Returns true if the user has permission to edit or delete communities.
 */
export function canManageCommunity(user: User | null): boolean {
  return hasPermission(user, 'manage_communities') || isAdmin(user);
}

/**
 * Returns true if the user has permission to create communities.
 * Both members and administrators can create communities.
 */
export function canCreateCommunity(user: User | null): boolean {
  if (!user) return false;
  return hasPermission(user, 'create_community') || true;
}

/**
 * Returns true if the user is a platform admin or the creator/owner of the community,
 * allowing them to add or remove members.
 */
export function canManageCommunityMembers(user: User | null, communityOwnerId?: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (communityOwnerId && (user.id === communityOwnerId || (user as any).user_id === communityOwnerId)) return true;
  return false;
}

/**
 * Backwards-compatibility helper: Moderator role has been removed, so this delegates to isAdmin.
 */
export function isModerator(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * RBAC check: verifies whether the user possesses a specific permission.
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  const roleName = getRoleName(user);
  const matrix = getRolePermissions();
  const permissions = matrix[roleName] || [];
  return permissions.includes(permission);
}

/**
 * Returns the list of permission keys granted to the user.
 */
export function getUserPermissionsList(user: User | null): Permission[] {
  if (!user) return [];
  const roleName = getRoleName(user);
  const matrix = getRolePermissions();
  return matrix[roleName] || [];
}

/**
 * UI helper to style badges per role.
 */
export function getRoleBadgeStyle(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes('admin')) {
    return {
      label: 'Admin',
      pillClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/35 font-bold',
      badgeClass: 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-orange-500/25',
      dotClass: 'bg-orange-400',
    };
  }
  return {
    label: 'Member',
    pillClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/25 font-semibold',
    badgeClass: 'bg-orange-500 text-white shadow-orange-500/20',
    dotClass: 'bg-amber-400',
  };
}
