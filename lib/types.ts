// ============ TYPES CHORALE ============

export type Role = 'super_admin' | 'admin' | 'maitre' | 'choriste';
export type VoicePart = 'soprano' | 'alto' | 'tenor' | 'basse';

export const VOICE_LABELS: Record<VoicePart, string> = {
  soprano: 'Soprano',
  alto: 'Alto',
  tenor: 'Ténor',
  basse: 'Basse',
};

export const VOICE_COLORS: Record<VoicePart, string> = {
  soprano: 'bg-rose-100 text-rose-700 border-rose-200',
  alto: 'bg-amber-100 text-amber-700 border-amber-200',
  tenor: 'bg-sky-100 text-sky-700 border-sky-200',
  basse: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  maitre: 'Maître de chœur',
  choriste: 'Choriste',
};

export type HymnCategory =
  | 'louange' | 'adoration' | 'repentance' | 'communion'
  | 'evangelisation' | 'noel' | 'paques' | 'funerailles' | 'mariage' | 'autre';

export const HYMN_CATEGORIES: Record<HymnCategory, string> = {
  louange: 'Louange',
  adoration: 'Adoration',
  repentance: 'Repentance',
  communion: 'Communion',
  evangelisation: 'Évangélisation',
  noel: 'Noël',
  paques: 'Pâques',
  funerailles: 'Funérailles',
  mariage: 'Mariage',
  autre: 'Autre',
};

export type LearningStatus = 'nouveau' | 'en_apprentissage' | 'maitrise' | 'repertoire_actif';

export const LEARNING_STATUS_LABELS: Record<LearningStatus, string> = {
  nouveau: 'Nouveau',
  en_apprentissage: 'En apprentissage',
  maitrise: 'Maîtrisé',
  repertoire_actif: 'Répertoire actif',
};

export const LEARNING_STATUS_COLORS: Record<LearningStatus, string> = {
  nouveau: 'bg-slate-100 text-slate-700 border-slate-200',
  en_apprentissage: 'bg-amber-100 text-amber-700 border-amber-200',
  maitrise: 'bg-sky-100 text-sky-700 border-sky-200',
  repertoire_actif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export type Hymn = {
  id: string;
  number: number | null;
  title: string;
  author: string | null;
  composer: string | null;
  musical_key: string | null;
  tempo: string | null;
  category: HymnCategory;
  language: string;
  lyrics: string | null;
  learning_status: LearningStatus;
  director_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HymnFile = {
  id: string;
  hymn_id: string;
  type: 'partition_pdf' | 'image' | 'audio';
  voice_part: VoicePart | null;
  storage_path: string;
  title: string | null;
  created_at: string;
};

export type Occasion = 'culte' | 'repetition' | 'concert' | 'evenement';

export const OCCASION_LABELS: Record<Occasion, string> = {
  culte: 'Culte',
  repetition: 'Répétition',
  concert: 'Concert',
  evenement: 'Événement',
};

export type HymnScheduleEntry = {
  id: string;
  hymn_id: string | null;
  scheduled_date: string;
  occasion: Occasion;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  hymns?: Hymn | null;
};

export type RehearsalType = 'generale' | 'pupitre' | 'formation';
export type RehearsalStatus = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

export type Rehearsal = {
  id: string;
  title: string;
  rehearsal_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  type: RehearsalType;
  voice_part: VoicePart | null;
  objectives: string | null;
  status: RehearsalStatus;
  created_by: string | null;
  created_at: string;
};

export type RsvpResponse = 'present' | 'absent' | 'peut_etre';

export type RehearsalRsvp = {
  id: string;
  rehearsal_id: string;
  user_id: string;
  response: RsvpResponse;
  absence_reason: string | null;
  updated_at: string;
};

export type AttendanceStatus = 'present' | 'retard' | 'absent_excuse' | 'absent';

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  retard: 'Retard',
  absent_excuse: 'Absent excusé',
  absent: 'Absent',
};

export type Attendance = {
  id: string;
  rehearsal_id: string;
  user_id: string;
  status: AttendanceStatus;
  marked_by: string | null;
  marked_at: string;
};

export type HymnProgressStatus = 'a_apprendre' | 'en_cours' | 'appris' | 'valide';

export const PROGRESS_LABELS: Record<HymnProgressStatus, string> = {
  a_apprendre: 'À apprendre',
  en_cours: 'En cours',
  appris: 'Appris',
  valide: 'Validé',
};

export type HymnProgress = {
  id: string;
  user_id: string;
  hymn_id: string;
  status: HymnProgressStatus;
  self_rating: number | null;
  validated_by: string | null;
  last_listened_at: string | null;
  updated_at: string;
};

export type GapCategory = 'justesse' | 'rythme' | 'respiration' | 'lecture' | 'memorisation' | 'technique_vocale';

export const GAP_LABELS: Record<GapCategory, string> = {
  justesse: 'Justesse',
  rythme: 'Rythme',
  respiration: 'Respiration',
  lecture: 'Lecture musicale',
  memorisation: 'Mémorisation',
  technique_vocale: 'Technique vocale',
};

export type SkillGap = {
  id: string;
  user_id: string;
  category: GapCategory;
  severity: number;
  note: string | null;
  status: 'identifiee' | 'en_travail' | 'resolue';
  identified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainingPath = {
  id: string;
  name: string;
  description: string | null;
  target_gap_category: GapCategory | null;
  voice_part: VoicePart | null;
  is_open: boolean;
  created_by: string | null;
  created_at: string;
};

export type TrainingModule = {
  id: string;
  path_id: string;
  title: string;
  content: string | null;
  resource_url: string | null;
  hymn_id: string | null;
  lesson_id: string | null;
  xp_reward: number;
  sort_order: number;
};

export type TrainingAssignment = {
  id: string;
  path_id: string;
  user_id: string;
  gap_id: string | null;
  assigned_by: string | null;
  status: 'assigne' | 'en_cours' | 'termine';
  created_at: string;
  training_paths?: TrainingPath | null;
};

export type ModuleCompletion = {
  id: string;
  module_id: string;
  user_id: string;
  completed_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  audience_role: string | null;
  audience_voice: VoicePart | null;
  created_by: string | null;
  created_at: string;
};

export type ChoirStats = {
  id: string;
  user_id: string;
  total_xp: number;
  weekly_xp: number;
  level: number;
  streak_weeks: number;
  last_active_date: string | null;
  hymns_learned: number;
  attendance_rate: number;
  updated_at: string;
};

export function xpForLevel(level: number): number {
  return level * 200;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let acc = 0;
  while (acc + xpForLevel(level) <= xp) {
    acc += xpForLevel(level);
    level += 1;
  }
  return level;
}
