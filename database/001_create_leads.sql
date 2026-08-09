create table if not exists leads (
  id uuid primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  destination text not null default '',
  message text not null,
  source_path text not null,
  utm jsonb not null default '{}'::jsonb,
  ip_hash text not null,
  email_status text not null default 'pending',
  email_attempted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_ip_rate_idx on leads (ip_hash, created_at desc);
