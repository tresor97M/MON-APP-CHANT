import type { Role } from '@/lib/types';

const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'maitre'];
const ADMIN_ROLES: Role[] = ['super_admin', 'admin'];

function normalize(role: string | null | undefined): Role {
  if (role === 'super_admin' || role === 'admin' || role === 'maitre') return role;
  return 'choriste';
}

/** Accès à l'espace direction (/admin) */
export function isStaff(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(normalize(role));
}

/** Gestion des membres, annonces, répétitions */
export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(normalize(role));
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return normalize(role) === 'super_admin';
}

export function isMaitre(role: string | null | undefined): boolean {
  return normalize(role) === 'maitre';
}

/** CRUD cantiques + uploads : maître, admin, super_admin */
export function canManageHymns(role: string | null | undefined): boolean {
  return isStaff(role);
}

/** Calendrier du répertoire : maître, admin, super_admin */
export function canManageSchedule(role: string | null | undefined): boolean {
  return isStaff(role);
}

/** Pointage des présences : maître, admin, super_admin */
export function canTakeAttendance(role: string | null | undefined): boolean {
  return isStaff(role);
}

/** Création de répétitions : admin, super_admin, maître */
export function canManageRehearsals(role: string | null | undefined): boolean {
  return isStaff(role);
}

/** Évaluation des lacunes + validation des voix : maître, super_admin */
export function canEvaluate(role: string | null | undefined): boolean {
  const r = normalize(role);
  return r === 'maitre' || r === 'super_admin' || r === 'admin';
}

/** Création de parcours de formation : maître, super_admin */
export function canManageTraining(role: string | null | undefined): boolean {
  return isStaff(role);
}

/** Gestion des membres : admin, super_admin */
export function canManageMembers(role: string | null | undefined): boolean {
  return isAdmin(role);
}

/** Gestion des rôles : super_admin uniquement */
export function canManageRoles(role: string | null | undefined): boolean {
  return isSuperAdmin(role);
}

/** Gestion des annonces : admin, super_admin, maître */
export function canManageAnnouncements(role: string | null | undefined): boolean {
  return isStaff(role);
}
