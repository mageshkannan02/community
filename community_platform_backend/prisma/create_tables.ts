import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  await client.query(`
    -- 1. Statuses Master
    CREATE TABLE IF NOT EXISTS statuses_masters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      entity_type VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Events
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      cover_image_url TEXT,
      location TEXT,
      is_online BOOLEAN DEFAULT true,
      meeting_link TEXT,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      max_attendees INTEGER,
      is_cancelled BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. Event Registrations
    CREATE TABLE IF NOT EXISTS event_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'registered',
      notes TEXT,
      registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );

    -- 4. Event Attendees
    CREATE TABLE IF NOT EXISTS event_attendees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checked_in BOOLEAN DEFAULT false,
      checked_in_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );

    -- 5. Community Resources
    CREATE TABLE IF NOT EXISTS community_resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      file_type VARCHAR(100) NOT NULL,
      file_size INTEGER,
      category VARCHAR(100),
      download_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 6. Polls
    CREATE TABLE IF NOT EXISTS polls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question VARCHAR(500) NOT NULL,
      is_multiple_choice BOOLEAN DEFAULT false,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_closed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 7. Poll Options
    CREATE TABLE IF NOT EXISTS poll_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      text VARCHAR(255) NOT NULL,
      vote_count INTEGER DEFAULT 0
    );

    -- 8. Poll Votes
    CREATE TABLE IF NOT EXISTS poll_votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(poll_id, option_id, user_id)
    );

    -- 9. Surveys
    CREATE TABLE IF NOT EXISTS surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_closed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 10. Survey Questions
    CREATE TABLE IF NOT EXISTS survey_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(50) DEFAULT 'text',
      options JSONB,
      is_required BOOLEAN DEFAULT true,
      "order" INTEGER DEFAULT 0
    );

    -- 11. Survey Responses
    CREATE TABLE IF NOT EXISTS survey_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      answers JSONB NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(survey_id, user_id)
    );

    -- 12. Refresh Token Blacklist
    CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash VARCHAR(500) UNIQUE NOT NULL,
      user_id UUID,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 13. Phase 2: Discussion Embeddings for Semantic Knowledge Search
    CREATE TABLE IF NOT EXISTS discussion_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discussion_id UUID NOT NULL UNIQUE REFERENCES discussions(id) ON DELETE CASCADE,
      embedding JSONB NOT NULL,
      model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
      dimensions INTEGER NOT NULL DEFAULT 384,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_discussion_embeddings_discussion_id ON discussion_embeddings(discussion_id);

    -- 14. Phase 3: Discussion Urgency for Unanswered Problem Prioritization
    CREATE TABLE IF NOT EXISTS discussion_urgency (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discussion_id UUID NOT NULL UNIQUE REFERENCES discussions(id) ON DELETE CASCADE,
      urgency_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_answered BOOLEAN NOT NULL DEFAULT false,
      answer_detected_at TIMESTAMP WITH TIME ZONE,
      hours_since_posted DOUBLE PRECISION NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      view_hint INTEGER NOT NULL DEFAULT 0,
      last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_discussion_urgency_score ON discussion_urgency(urgency_score);
    CREATE INDEX IF NOT EXISTS idx_discussion_urgency_answered ON discussion_urgency(is_answered);

    -- 15. Phase 3: Expertise Profiles
    CREATE TABLE IF NOT EXISTS expertise_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      tag_scores JSONB NOT NULL,
      total_replies INTEGER NOT NULL DEFAULT 0,
      helpful_replies INTEGER NOT NULL DEFAULT 0,
      last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 16. Phase 3: Urgency Notifications (Expert Routing)
    CREATE TABLE IF NOT EXISTS urgency_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      was_helpful BOOLEAN,
      match_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      UNIQUE(discussion_id, user_id)
    );

    -- 17. Smart Event Management additions
    ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';

    ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS waitlist_position INTEGER;
    ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS qr_ticket_token VARCHAR(500) UNIQUE;
    ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS qr_ticket_issued_at TIMESTAMP WITH TIME ZONE;

    ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS ticket_token VARCHAR(500);

    CREATE TABLE IF NOT EXISTS event_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB,
      UNIQUE(event_id, user_id, type)
    );

    CREATE INDEX IF NOT EXISTS idx_events_community_status ON events(community_id, status);
    CREATE INDEX IF NOT EXISTS idx_event_reg_event_status ON event_registrations(event_id, status);
    CREATE INDEX IF NOT EXISTS idx_event_reg_qr ON event_registrations(qr_ticket_token);

    -- 18. Phase 5: Solution Validation & Unreliable Solution Detection
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS is_solution BOOLEAN DEFAULT false;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS is_op_confirmed BOOLEAN DEFAULT false;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS op_confirmed_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS op_confirmation_note TEXT;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS is_flagged_for_review BOOLEAN DEFAULT false;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS flagged_reason TEXT;
    ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE;

    CREATE TABLE IF NOT EXISTS solution_validation_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reply_id UUID NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worked BOOLEAN NOT NULL,
      attempt_notes TEXT,
      evidence_text TEXT,
      environment_info TEXT,
      version_tested VARCHAR(100),
      is_outdated_report BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(reply_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS solution_upvotes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reply_id UUID NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(reply_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_solution_val_rep_reply_worked ON solution_validation_reports(reply_id, worked);
    CREATE INDEX IF NOT EXISTS idx_discussion_replies_solution ON discussion_replies(is_solution);
    CREATE INDEX IF NOT EXISTS idx_discussion_replies_flagged ON discussion_replies(is_flagged_for_review);
  `);

  console.log('✅ All Phase 1, Phase 2, Phase 3, Smart Event & Phase 5 database tables created successfully!');
  await client.end();
}

run().catch((e) => {
  console.error('Error creating tables:', e);
  process.exit(1);
});
