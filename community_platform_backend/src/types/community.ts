import { Visibility } from "../generated/prisma/enums";

export interface CreateCommunityInput {
  owner_id: string;
  name: string;
  description?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  is_visible_public?: Visibility;
  anyone_can_join?: boolean;
}

export interface UpdateCommunityInput {
  name?: string;
  description?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  is_visible_public?: Visibility;
  anyone_can_join?: boolean;
}

export interface CommunityPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
