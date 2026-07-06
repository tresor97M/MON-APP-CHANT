-- ============================================================
-- CHORALE MANAGEMENT PLATFORM - Schema complet
-- A executer dans Supabase (SQL Editor ou via v0)
-- ============================================================

-- ---------- 0. Helper : fonction de verification de role ----------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('super_admin','admin','maitre') from public.user_profiles where user_id = auth.uid() limit 1),
    false
  );
$$;

-- ---------- 1. Extension de user_profiles ----------
alter table public.user_profiles
  add column if not exists voice_part text check (voice_part in ('soprano','alto','tenor','basse') or voice_part is null),
  add column if not exists voice_confirmed boolean not null default false,
  add column if not exists joined_choir_at timestamptz default now(),
  add column if not exists status text not null default 'actif' check (status in ('actif','inactif','en_pause'));

-- Migration des anciens roles vers les nouveaux
update public.user_profiles set role = 'choriste' where role = 'student';

-- ---------- 2. Cantiques ----------
create table if not exists public.hymns (
  id uuid primary key default gen_random_uuid(),
  number int,
  title text not null,
  author text,
  composer text,
  musical_key text,
  tempo text,
  category text not null default 'louange' check (category in ('louange','adoration','repentance','communion','evangelisation','noel','paques','funerailles','mariage','autre')),
  language text not null default 'fr',
  lyrics text,
  learning_status text not null default 'nouveau' check (learning_status in ('nouveau','en_apprentissage','maitrise','repertoire_actif')),
  director_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hymn_files (
  id uuid primary key default gen_random_uuid(),
  hymn_id uuid not null references public.hymns(id) on delete cascade,
  type text not null check (type in ('partition_pdf','image','audio')),
  voice_part text check (voice_part in ('soprano','alto','tenor','basse') or voice_part is null),
  storage_path text not null,
  title text,
  created_at timestamptz not null default now()
);

-- ---------- 3. Calendrier du repertoire (le "sheet") ----------
create table if not exists public.hymn_schedule (
  id uuid primary key default gen_random_uuid(),
  hymn_id uuid references public.hymns(id) on delete cascade,
  scheduled_date date not null,
  occasion text not null default 'culte' check (occasion in ('culte','repetition','concert','evenement')),
  notes text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 4. Repetitions ----------
create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rehearsal_date date not null,
  start_time time not null default '18:00',
  end_time time not null default '20:00',
  location text,
  type text not null default 'generale' check (type in ('generale','pupitre','formation')),
  voice_part text check (voice_part in ('soprano','alto','tenor','basse') or voice_part is null),
  objectives text,
  status text not null default 'planifiee' check (status in ('planifiee','en_cours','terminee','annulee')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rehearsal_hymns (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  hymn_id uuid not null references public.hymns(id) on delete cascade,
  unique (rehearsal_id, hymn_id)
);

create table if not exists public.rehearsal_rsvps (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null check (response in ('present','absent','peut_etre')),
  absence_reason text,
  updated_at timestamptz not null default now(),
  unique (rehearsal_id, user_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('present','retard','absent_excuse','absent')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (rehearsal_id, user_id)
);

-- ---------- 5. Apprentissage des cantiques par choriste ----------
create table if not exists public.hymn_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hymn_id uuid not null references public.hymns(id) on delete cascade,
  status text not null default 'a_apprendre' check (status in ('a_apprendre','en_cours','appris','valide')),
  self_rating int check (self_rating between 1 and 5),
  validated_by uuid references auth.users(id) on delete set null,
  last_listened_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, hymn_id)
);

-- ---------- 6. Lacunes / evaluations ----------
create table if not exists public.skill_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('justesse','rythme','respiration','lecture','memorisation','technique_vocale')),
  severity int not null default 1 check (severity between 1 and 3),
  note text,
  status text not null default 'identifiee' check (status in ('identifiee','en_travail','resolue')),
  identified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 7. Formation / remise a niveau ----------
create table if not exists public.training_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_gap_category text check (target_gap_category in ('justesse','rythme','respiration','lecture','memorisation','technique_vocale') or target_gap_category is null),
  voice_part text check (voice_part in ('soprano','alto','tenor','basse') or voice_part is null),
  is_open boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.training_paths(id) on delete cascade,
  title text not null,
  content text,
  resource_url text,
  hymn_id uuid references public.hymns(id) on delete set null,
  xp_reward int not null default 20,
  sort_order int not null default 0
);

create table if not exists public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.training_paths(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  gap_id uuid references public.skill_gaps(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'assigne' check (status in ('assigne','en_cours','termine')),
  created_at timestamptz not null default now(),
  unique (path_id, user_id)
);

create table if not exists public.module_completions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (module_id, user_id)
);

-- ---------- 8. Annonces ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  pinned boolean not null default false,
  audience_role text,
  audience_voice text check (audience_voice in ('soprano','alto','tenor','basse') or audience_voice is null),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 9. Stats / gamification ----------
create table if not exists public.choir_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  total_xp int not null default 0,
  weekly_xp int not null default 0,
  level int not null default 1,
  streak_weeks int not null default 0,
  last_active_date date,
  hymns_learned int not null default 0,
  attendance_rate numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- 10. RLS ----------
alter table public.hymns enable row level security;
alter table public.hymn_files enable row level security;
alter table public.hymn_schedule enable row level security;
alter table public.rehearsals enable row level security;
alter table public.rehearsal_hymns enable row level security;
alter table public.rehearsal_rsvps enable row level security;
alter table public.attendance enable row level security;
alter table public.hymn_progress enable row level security;
alter table public.skill_gaps enable row level security;
alter table public.training_paths enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_assignments enable row level security;
alter table public.module_completions enable row level security;
alter table public.announcements enable row level security;
alter table public.choir_stats enable row level security;

-- Lecture : tous les membres authentifies
do $$
declare t text;
begin
  foreach t in array array['hymns','hymn_files','hymn_schedule','rehearsals','rehearsal_hymns','rehearsal_rsvps','attendance','training_paths','training_modules','training_assignments','announcements']
  loop
    execute format('drop policy if exists "read_all_%s" on public.%I', t, t);
    execute format('create policy "read_all_%s" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- Ecriture staff (maitre/admin/super_admin)
do $$
declare t text;
begin
  foreach t in array array['hymns','hymn_files','hymn_schedule','rehearsals','rehearsal_hymns','training_paths','training_modules','announcements']
  loop
    execute format('drop policy if exists "staff_write_%s" on public.%I', t, t);
    execute format('create policy "staff_write_%s" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- RSVP : chaque choriste gere le sien
drop policy if exists "own_rsvp" on public.rehearsal_rsvps;
create policy "own_rsvp" on public.rehearsal_rsvps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pointage : staff uniquement
drop policy if exists "staff_attendance" on public.attendance;
create policy "staff_attendance" on public.attendance for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Progression : lecture soi-meme + staff ; ecriture soi-meme + staff
drop policy if exists "read_progress" on public.hymn_progress;
create policy "read_progress" on public.hymn_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "write_progress" on public.hymn_progress;
create policy "write_progress" on public.hymn_progress for all to authenticated
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- Lacunes : lecture soi-meme + staff ; ecriture staff
drop policy if exists "read_gaps" on public.skill_gaps;
create policy "read_gaps" on public.skill_gaps for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "staff_write_gaps" on public.skill_gaps;
create policy "staff_write_gaps" on public.skill_gaps for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Affectations : staff ecrit, choriste peut mettre a jour son statut
drop policy if exists "staff_write_assignments" on public.training_assignments;
create policy "staff_write_assignments" on public.training_assignments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "own_assignment_update" on public.training_assignments;
create policy "own_assignment_update" on public.training_assignments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Completions de modules : soi-meme
drop policy if exists "read_completions" on public.module_completions;
create policy "read_completions" on public.module_completions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own_completions" on public.module_completions;
create policy "own_completions" on public.module_completions for insert to authenticated
  with check (user_id = auth.uid());

-- Stats : lecture tous (classement), ecriture soi-meme + staff
drop policy if exists "read_stats" on public.choir_stats;
create policy "read_stats" on public.choir_stats for select to authenticated using (true);
drop policy if exists "write_stats" on public.choir_stats;
create policy "write_stats" on public.choir_stats for all to authenticated
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- ---------- 11. Realtime ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.hymns;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.hymn_schedule;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.announcements;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- 12. Storage buckets ----------
insert into storage.buckets (id, name, public)
values ('partitions', 'partitions', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audios', 'audios', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_read_partitions" on storage.objects;
create policy "authenticated_read_partitions" on storage.objects for select to authenticated
  using (bucket_id in ('partitions','audios'));

drop policy if exists "staff_upload_files" on storage.objects;
create policy "staff_upload_files" on storage.objects for insert to authenticated
  with check (bucket_id in ('partitions','audios') and public.is_staff());

drop policy if exists "staff_delete_files" on storage.objects;
create policy "staff_delete_files" on storage.objects for delete to authenticated
  using (bucket_id in ('partitions','audios') and public.is_staff());
