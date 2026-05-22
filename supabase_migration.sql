-- Bokle CRM — Initial Schema Migration
-- Run this once in: Supabase Dashboard → SQL Editor → New Query

-- 1. DEALS
create table if not exists deals (
  id text primary key,
  "clientName" text not null,
  value text,
  service text,
  status text default 'Lead',
  "lastContact" text,
  industry text,
  "problemStatement" text,
  notes text
);

-- 2. DEAL ARTIFACTS (documents generated per deal stage)
create table if not exists deal_artifacts (
  id text primary key,
  "dealId" text references deals(id) on delete cascade,
  stage text,
  title text,
  content text,
  "lastUpdated" text
);

-- 3. PROJECTS
create table if not exists projects (
  id text primary key,
  "clientName" text not null,
  "featureSummary" text,
  deadline text,
  status text default 'Backlog'
);

-- 4. MARKETING TASKS
create table if not exists marketing_tasks (
  id text primary key,
  title text not null,
  "contentType" text,
  platform text,
  status text default 'Idea',
  "dueDate" text
);

-- 5. OUTREACH LEADS (CRM-tracked, manual/CSV)
create table if not exists outreach_leads (
  id text primary key,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  website text,
  status text default 'New',
  "painPoint" text,
  "generatedSequence" text,
  "createdAt" text,
  "lastContact" text,
  source text default 'manual'
);

-- 6. LEADS (inbound form submissions — public insert allowed)
create table if not exists "Leads" (
  id uuid primary key default gen_random_uuid(),
  "Name" text,
  "Email" text,
  "Phone" text,
  "Message" text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (recommended)
alter table deals enable row level security;
alter table deal_artifacts enable row level security;
alter table projects enable row level security;
alter table marketing_tasks enable row level security;
alter table outreach_leads enable row level security;
alter table "Leads" enable row level security;

-- Policies: allow full access for authenticated + anon (internal tool)
create policy "Allow all on deals" on deals for all using (true) with check (true);
create policy "Allow all on deal_artifacts" on deal_artifacts for all using (true) with check (true);
create policy "Allow all on projects" on projects for all using (true) with check (true);
create policy "Allow all on marketing_tasks" on marketing_tasks for all using (true) with check (true);
create policy "Allow all on outreach_leads" on outreach_leads for all using (true) with check (true);
create policy "Allow all on Leads" on "Leads" for all using (true) with check (true);
