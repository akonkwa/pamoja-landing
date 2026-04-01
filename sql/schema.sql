CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  affiliation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  location TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_attendees (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  email TEXT,
  name TEXT NOT NULL,
  affiliation TEXT,
  imported_bio TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_agents (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  attendee_id TEXT REFERENCES event_attendees(id),
  draft_status TEXT NOT NULL DEFAULT 'draft',
  bio TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  looking_for TEXT[] NOT NULL DEFAULT '{}',
  preferences TEXT[] NOT NULL DEFAULT '{}',
  memory_summary TEXT,
  consented_memory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_agents (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  summary TEXT,
  themes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_memory (
  id TEXT PRIMARY KEY,
  profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  source_event_id TEXT REFERENCES events(id),
  embedding_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interaction_memory (
  id TEXT PRIMARY KEY,
  profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  other_profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  summary TEXT,
  usefulness_score INTEGER,
  follow_up_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requester_profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  recommended_profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  reason TEXT NOT NULL,
  score NUMERIC(6, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debriefs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_agent_id TEXT NOT NULL REFERENCES profile_agents(id) ON DELETE CASCADE,
  met_people JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  usefulness_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_id TEXT REFERENCES events(id),
  profile_agent_id TEXT REFERENCES profile_agents(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
