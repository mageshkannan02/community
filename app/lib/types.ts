export interface User {
  id: string;
  full_name: string;
  email: string;
  role_id?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
  avatar_url?: string | null;
  bio?: string | null;
  bio_visibility?: 'public' | 'private';
  is_active?: boolean;
  created_at?: string;
}

export interface Community {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  is_visible_public: 'public' | 'private';
  anyone_can_join: boolean;
  created_at: string;
  updated_at?: string;
  owner?: Partial<User>;
  _count?: {
    followers?: number;
    members?: number;
    community_discussions?: number;
  };
}

export type PostClassification = 'problem' | 'question' | 'discussion';
export type ProblemStatus = 'open' | 'solution_proposed' | 'verified_solved' | 'unresolved';

export interface VerifiedSolutionInfo {
  solution_id: string;
  verifier_id: string;
  verifier_name: string;
  verified_at: string;
  verification_note?: string;
  effectiveness_rating?: number;
}

export interface Discussion {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  post_type?: PostClassification;
  problem_status?: ProblemStatus;
  verified_solution_id?: string | null;
  verified_solution?: VerifiedSolutionInfo | null;
  symptoms?: string[];
  troubleshooting_steps_tried?: string[];
  attachments_id?: string | null;
  created_at: string;
  updated_at?: string;
  author?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string | null;
  };
  community?: Partial<Community>;
  replies?: DiscussionReply[];
  tags?: {
    tag: {
      id: string;
      name: string;
    };
  }[];
  _count?: {
    replies?: number;
    solutions?: number;
  };
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  parentReplyId?: string | null;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  is_proposed_solution?: boolean;
  solution_steps?: string[];
  expected_outcome?: string;
  is_verified_solution?: boolean;
  verified_at?: string;
  verification_feedback?: string;
  helpful_votes?: number;
  unhelpful_votes?: number;
  user_voted?: 'helpful' | 'unhelpful' | null;
  author?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string | null;
  };
  childReplies?: DiscussionReply[];
  // Phase 5: Solution Validation & Unreliable Solution Detection
  is_solution?: boolean;
  is_op_confirmed?: boolean;
  op_confirmed_at?: string | null;
  op_confirmation_note?: string | null;
  upvotes?: number;
  is_flagged_for_review?: boolean;
  flagged_reason?: string | null;
  flagged_at?: string | null;
  validation_reports?: SolutionValidationReport[];
}

export interface SolutionValidationReport {
  id: string;
  reply_id: string;
  user_id: string;
  worked: boolean;
  attempt_notes?: string | null;
  evidence_text?: string | null;
  environment_info?: string | null;
  version_tested?: string | null;
  is_outdated_report?: boolean;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export type SolutionReliabilityTier = 'VERIFIED_EFFECTIVE' | 'MIXED_RESULTS' | 'OUTDATED_UNRELIABLE' | 'UNVERIFIED';

export interface SolutionReliabilityMetrics {
  reply_id: string;
  upvotes: number;
  total_reports: number;
  success_count: number;
  failure_count: number;
  success_rate: number | null;
  is_op_confirmed: boolean;
  op_confirmed_at: string | null;
  op_confirmation_note: string | null;
  is_flagged_for_review: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  reliability_tier: SolutionReliabilityTier;
  outdated_indicator: boolean;
  user_report?: Partial<SolutionValidationReport> | null;
  user_upvoted?: boolean;
  reports?: SolutionValidationReport[];
}

export interface SolutionEvaluationSummary {
  total_solutions_analyzed: number;
  solutions_with_confirmed_outcomes: number;
  confirmed_outcome_percentage: number;
  unreliable_or_outdated_count: number;
  popular_but_unreliable_count: number;
  average_time_to_detect_outdated_hours: number | null;
  outdated_detection_samples_count: number;
  reliability_breakdown: {
    verified_effective: number;
    mixed_results: number;
    outdated_unreliable: number;
    unverified: number;
  };
  solutions?: Array<{
    reply_id: string;
    author_name: string;
    content_snippet: string;
    created_at: string;
    upvotes: number;
    is_op_confirmed: boolean;
    is_flagged_for_review: boolean;
    flagged_reason?: string | null;
    total_reports: number;
    success_count: number;
    failure_count: number;
    success_rate: number | null;
    reliability_tier: SolutionReliabilityTier;
    outdated_indicator: boolean;
    detection_time_hours?: number | null;
  }>;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: Partial<User>;
  member_role?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    message: string;
    details?: any;
  };
}

export interface EventItem {
  id: string;
  community_id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  is_online: boolean;
  meeting_url?: string | null;
  meeting_link?: string | null;
  max_attendees?: number | null;
  registration_deadline?: string | null;
  status?: string;
  is_cancelled?: boolean;
  created_at: string;
  creator?: Partial<User>;
  community?: Partial<Community>;
  user_registration?: EventRegistration | null;
  _count?: {
    registrations: number;
    attendees: number;
  };
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  waitlist_position?: number | null;
  qr_ticket_token?: string | null;
  qr_ticket_issued_at?: string | null;
  registered_at: string;
  notes?: string | null;
  user?: Partial<User>;
  event?: Partial<EventItem>;
}

export interface EventTicketData {
  registration: EventRegistration;
  qrDataUrl: string;
  ticketToken: string;
  isCheckedIn: boolean;
  checkedInAt?: string | null;
}

export interface EventAnalyticsData {
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_attendees: number | null;
    status: string;
  };
  metrics: {
    total_capacity: number | null;
    confirmed_registrations: number;
    waitlist_size: number;
    available_capacity: number | null;
    checked_in_count: number;
    attendance_rate: number;
    no_show_count: number;
    no_show_rate: number;
  };
  predictive_insights: {
    historical_community_show_rate: number;
    predicted_attendance: number;
    expected_no_shows: number;
    confidence_level: 'High' | 'Medium' | 'Initial Baseline';
    model_description: string;
  };
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  checked_in: boolean;
  checked_in_at?: string | null;
  user?: Partial<User>;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
  order: number;
}

export interface Poll {
  id: string;
  community_id?: string | null;
  creator_id: string;
  question: string;
  is_multiple_choice: boolean;
  expires_at?: string | null;
  status: string;
  created_at: string;
  creator?: Partial<User>;
  options: PollOption[];
  _count?: {
    votes: number;
  };
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  voted_at: string;
  user?: Partial<User>;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: 'text' | 'radio' | 'checkbox' | 'scale';
  options?: any;
  is_required: boolean;
  order: number;
}

export interface Survey {
  id: string;
  community_id?: string | null;
  creator_id: string;
  title: string;
  description?: string | null;
  status: string;
  expires_at?: string | null;
  created_at: string;
  creator?: Partial<User>;
  questions: SurveyQuestion[];
  _count?: {
    responses: number;
  };
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
  answers: any;
  submitted_at: string;
  user?: Partial<User>;
}

export interface CommunityResource {
  id: string;
  community_id: string;
  uploader_id: string;
  title: string;
  description?: string | null;
  file_url: string;
  file_type: string;
  file_size?: number | null;
  category?: string | null;
  downloads_count: number;
  created_at: string;
  uploader?: Partial<User>;
}

export interface Announcement {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  isPinned: boolean;
  attachmentId?: string | null;
  publishAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  author?: Partial<User>;
}

export interface MasterCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface MasterTag {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface MasterRole {
  id: string;
  name: string;
  description?: string | null;
  permissions?: any;
  is_active: boolean;
}

export interface MasterStatus {
  id: string;
  name: string;
  code: string;
  entity_type?: string | null;
  is_active: boolean;
}

export interface UserBookmark {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

// ----------------- PHASE 2: SEMANTIC SEARCH TYPES -----------------

export interface SemanticSearchMetrics {
  similarity_score: number;
  feedback_score: number;
  composite_score: number;
  replies_count: number;
  bookmarks_count: number;
}

export interface SemanticSearchResultItem extends Discussion {
  metrics: SemanticSearchMetrics;
  links: {
    discussion_url: string;
    community_url: string;
  };
}

export interface SemanticSearchResponse {
  query: string;
  total_matches: number;
  results: SemanticSearchResultItem[];
  model_info?: {
    model: string;
    dimensions: number;
  } | null;
  status: 'success' | 'empty_query' | 'model_failure' | 'no_results';
  message?: string;
}

// ----------------- AI-POWERED DUPLICATE QUESTION DETECTION -----------------

export interface DuplicateSolutionItem {
  id: string;
  content: string;
  author?: {
    id?: string;
    full_name: string;
    avatar_url?: string | null;
  };
  created_at: string;
}

export interface DuplicateQuestionItem {
  id: string;
  title: string;
  content: string;
  community_id: string;
  community?: {
    id: string;
    name: string;
    is_visible_public: string;
  };
  tags?: string[];
  similarity_score: number;
  match_percentage: number;
  match_strength: 'high' | 'medium' | 'low';
  replies_count: number;
  has_solution: boolean;
  solutions: DuplicateSolutionItem[];
  links: {
    discussion_url: string;
    community_url: string;
  };
}

export interface DuplicateDetectionResponse {
  query: string;
  is_duplicate_detected: boolean;
  highest_similarity: number;
  total_matches: number;
  duplicates: DuplicateQuestionItem[];
  model_info?: {
    model: string;
    dimensions: number;
  } | null;
  status: 'success' | 'empty_query' | 'model_failure' | 'no_duplicates';
  message?: string;
}


// ----------------- PHASE 3: UNANSWERED PROBLEM PRIORITIZATION -----------------

export interface DiscussionUrgency {
  id: string;
  discussion_id: string;
  urgency_score: number;
  is_answered: boolean;
  answer_detected_at?: string | null;
  hours_since_posted: number;
  reply_count: number;
  last_computed_at: string;
}

export interface UnansweredDiscussion extends Discussion {
  urgency: DiscussionUrgency;
}

export interface ExpertiseProfile {
  id: string;
  user_id: string;
  tag_scores: Record<string, number>;
  total_replies: number;
  helpful_replies: number;
  last_active: string;
}

export interface MatchedExpert {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  match_score: number;
}

export interface UrgencyStats {
  totalUnanswered: number;
  totalAnswered: number;
  highUrgency: number;
}

export interface UrgencyNotification {
  id: string;
  discussion_id: string;
  user_id: string;
  sent_at: string;
  was_helpful: boolean | null;
  match_score: number;
  discussion?: UnansweredDiscussion;
}

export interface UrgencyEvaluationMetrics {
  before_system: {
    period: string;
    total_questions: number;
    answered_questions: number;
    unanswered_questions: number;
    answer_rate_pct: number;
    avg_time_to_first_answer_hours: number;
    median_time_to_first_answer_hours: number;
    critical_unanswered_pct: number;
  };
  after_system: {
    period: string;
    total_questions: number;
    answered_questions: number;
    unanswered_questions: number;
    answer_rate_pct: number;
    avg_time_to_first_answer_hours: number;
    median_time_to_first_answer_hours: number;
    critical_unanswered_pct: number;
  };
  improvements: {
    answer_rate_gain_pct: number;
    time_to_answer_reduction_pct: number;
    critical_abandonment_reduction_pct: number;
    summary: string;
  };
  sample_case_study: {
    question: string;
    tags: string[];
    urgency_score: number;
    notified_experts: string[];
    time_to_resolution: string;
    status: string;
  };
}

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
  role: 'user' | 'assistant' | 'system';
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

export interface AssistantChatRequest {
  message: string;
  conversation_id?: string;
  community_id?: string;
  user_profile?: AssistantUserProfile;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
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

export interface InAppNotification {
  id: string;
  user_id: string;
  sender_id?: string | null;
  title: string;
  message: string;
  type:
    | 'reply_created'
    | 'solution_verified'
    | 'solution_upvoted'
    | 'expert_tagged'
    | 'community_joined'
    | 'discussion_created'
    | 'poll_voted'
    | 'event_registered'
    | string;
  entity_type?: string | null;
  entity_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

