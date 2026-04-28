-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Companies
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  created_at timestamptz default now()
);

-- Roles
create table if not exists roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Questions
create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  round_type text not null check (round_type in ('intro', 'behavioral', 'technical')),
  topic text not null,
  sub_topic text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  question_text text not null,
  original_round text,
  created_at timestamptz default now()
);

-- Practice sessions
create table if not exists practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id),
  role_id uuid not null references roles(id),
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Responses
create table if not exists responses (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references practice_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  input_type text not null check (input_type in ('voice', 'text', 'code')),
  user_answer text not null,
  ai_feedback jsonb,
  score integer check (score >= 0 and score <= 100),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_questions_company_role_round
  on questions(company_id, role_id, round_type);

create index if not exists idx_responses_session
  on responses(session_id);

create index if not exists idx_sessions_user
  on practice_sessions(user_id);

-- Row Level Security
alter table practice_sessions enable row level security;
alter table responses enable row level security;

create policy "Users can manage their own sessions"
  on practice_sessions for all
  using (auth.uid() = user_id);

create policy "Users can manage their own responses"
  on responses for all
  using (
    session_id in (
      select id from practice_sessions where user_id = auth.uid()
    )
  );

-- Public read for companies, roles, questions
alter table companies enable row level security;
alter table roles enable row level security;
alter table questions enable row level security;

create policy "Public read companies" on companies for select using (true);
create policy "Public read roles" on roles for select using (true);
create policy "Public read questions" on questions for select using (true);
