export interface CreateCommunityMemberInput {
  community_id: string;
  user_id: string;
  role: string;
}

export interface UpdateCommunityMemberInput {
  role?: string;
  isDeleted?: boolean;
  isActive?: string | null;
  leaved_at?: Date | null;
  deleted_at?: Date | null;
  deleted_by?: string | null;
  updated_by?: string | null;
}

export interface CommunityMemberPaginationParams {
  page?: number;
  limit?: number;
  community_id?: string;
  user_id?: string;
}
