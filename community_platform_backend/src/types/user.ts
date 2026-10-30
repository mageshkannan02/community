import { Visibility } from "../generated/prisma/enums";

export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  role_id: string;
  avatar_url?: string | null;
  bio?: string | null;
  bio_visibility?: Visibility;
  is_active?: boolean;
}

export interface UpdateUserInput {
  full_name?: string;
  email?: string;
  role_id?: string;
  avatar_url?: string | null;
  bio?: string | null;
  bio_visibility?: Visibility;
  is_active?: boolean;
}

export interface UserPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const USER_OMIT_PASSWORD_SELECT = {
  id: true,
  full_name: true,
  role_id: true,
  role: true,
  email: true,
  avatar_url: true,
  bio: true,
  bio_visibility: true,
  is_active: true,
  created_at: true,
  updated_at: true,
};
