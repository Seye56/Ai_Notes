create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null unique,
  preferred_language text not null default 'en',
  preferred_voice text,
  ui_theme text not null default 'system',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text not null,
  source_language text not null default 'en',
  imported_file_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  target_language text not null,
  translated_content text not null,
  translation_type text not null default 'text'
    check (translation_type in ('text', 'spoken', 'live')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  summary_text text not null,
  model_used text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  questions_json jsonb not null default '[]'::jsonb,
  difficulty text not null default 'medium',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audio_files (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references public.notes (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  voice_id text not null,
  provider text not null default 'elevenlabs',
  file_path text not null,
  transcript text,
  language text not null default 'en',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  default_language text not null default 'en',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default timezone('utc', now()),
  constraint uq_group_members_group_user unique (group_id, user_id)
);

create table if not exists public.group_note_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  original_text text not null,
  original_language text not null,
  translated_text text,
  translated_language text,
  event_type text not null default 'live_note',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_presences (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cursor_position integer,
  selection_start integer,
  selection_end integer,
  is_typing boolean not null default false,
  last_seen timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_group_presences_group_user unique (group_id, user_id)
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_notes_owner_id on public.notes (owner_id);
create index if not exists idx_translations_note_id on public.translations (note_id);
create index if not exists idx_summaries_note_id on public.summaries (note_id);
create index if not exists idx_quizzes_note_id on public.quizzes (note_id);
create index if not exists idx_audio_files_owner_id on public.audio_files (owner_id);
create index if not exists idx_audio_files_note_id on public.audio_files (note_id);
create index if not exists idx_groups_owner_id on public.groups (owner_id);
create index if not exists idx_group_members_group_id on public.group_members (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);
create index if not exists idx_group_events_group_id on public.group_note_events (group_id);
create index if not exists idx_group_events_sender_id on public.group_note_events (sender_id);
create index if not exists idx_group_presences_group_id on public.group_presences (group_id);
create index if not exists idx_group_presences_user_id on public.group_presences (user_id);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_notes_set_updated_at on public.notes;
create trigger trg_notes_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_group_presences_set_updated_at on public.group_presences;
create trigger trg_group_presences_set_updated_at
before update on public.group_presences
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.translations enable row level security;
alter table public.summaries enable row level security;
alter table public.quizzes enable row level security;
alter table public.audio_files enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_note_events enable row level security;
alter table public.group_presences enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "notes_own_crud" on public.notes;
create policy "notes_own_crud"
on public.notes
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "translations_owner_access" on public.translations;
create policy "translations_owner_access"
on public.translations
for all
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = translations.note_id
      and n.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.notes n
    where n.id = translations.note_id
      and n.owner_id = auth.uid()
  )
);

drop policy if exists "summaries_owner_access" on public.summaries;
create policy "summaries_owner_access"
on public.summaries
for all
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = summaries.note_id
      and n.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.notes n
    where n.id = summaries.note_id
      and n.owner_id = auth.uid()
  )
);

drop policy if exists "quizzes_owner_access" on public.quizzes;
create policy "quizzes_owner_access"
on public.quizzes
for all
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = quizzes.note_id
      and n.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.notes n
    where n.id = quizzes.note_id
      and n.owner_id = auth.uid()
  )
);

drop policy if exists "audio_owner_access" on public.audio_files;
create policy "audio_owner_access"
on public.audio_files
for all
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1
    from public.notes n
    where n.id = audio_files.note_id
      and n.owner_id = auth.uid()
  )
)
with check (
  auth.uid() = owner_id
  and (
    note_id is null
    or exists (
      select 1
      from public.notes n
      where n.id = audio_files.note_id
        and n.owner_id = auth.uid()
    )
  )
);

drop policy if exists "groups_member_read" on public.groups;
create policy "groups_member_read"
on public.groups
for select
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "groups_owner_insert" on public.groups;
create policy "groups_owner_insert"
on public.groups
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "groups_owner_update_delete" on public.groups;
create policy "groups_owner_update_delete"
on public.groups
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "groups_owner_delete" on public.groups;
create policy "groups_owner_delete"
on public.groups
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "group_members_read_for_members" on public.group_members;
create policy "group_members_read_for_members"
on public.group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_members.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "group_members_owner_admin_manage_insert" on public.group_members;
create policy "group_members_owner_admin_manage_insert"
on public.group_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.groups g
    left join public.group_members gm
      on gm.group_id = g.id
     and gm.user_id = auth.uid()
    where g.id = group_members.group_id
      and (
        g.owner_id = auth.uid()
        or gm.role = 'admin'
      )
  )
);

drop policy if exists "group_members_owner_admin_manage_delete" on public.group_members;
create policy "group_members_owner_admin_manage_delete"
on public.group_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.groups g
    left join public.group_members gm
      on gm.group_id = g.id
     and gm.user_id = auth.uid()
    where g.id = group_members.group_id
      and (
        g.owner_id = auth.uid()
        or gm.role = 'admin'
      )
  )
);

drop policy if exists "group_events_members_read" on public.group_note_events;
create policy "group_events_members_read"
on public.group_note_events
for select
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_note_events.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_note_events.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "group_events_members_insert" on public.group_note_events;
create policy "group_events_members_insert"
on public.group_note_events
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.groups g
    where g.id = group_note_events.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_note_events.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "group_presences_members_read" on public.group_presences;
create policy "group_presences_members_read"
on public.group_presences
for select
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_presences.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_presences.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "group_presences_self_manage" on public.group_presences;
create policy "group_presences_self_manage"
on public.group_presences
for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.groups g
    where g.id = group_presences.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_presences.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.groups g
    where g.id = group_presences.group_id
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = group_presences.group_id
            and gm.user_id = auth.uid()
        )
      )
  )
);

insert into storage.buckets (id, name, public)
values ('audio-files', 'audio-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('note-imports', 'note-imports', false)
on conflict (id) do nothing;
