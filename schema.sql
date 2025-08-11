
create table if not exists hofn_leaderboard(
  id serial primary key,
  team text not null,
  w int not null default 0,
  l int not null default 0,
  pf int not null default 0,
  pa int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_hofn_leaderboard_team on hofn_leaderboard(team);
