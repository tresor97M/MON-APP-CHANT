'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { supabase, type UserProfile } from '@/lib/supabase';
import { Shield, Save, User, Check, X, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AccessControlPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { userProfile, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Lock page to super_admin only
  useEffect(() => {
    if (!authLoading) {
      if (!userProfile || userProfile.role !== 'super_admin') {
        alert(lang === 'fr' 
          ? 'Accès refusé. Seul le Super Admin peut accéder à la gestion des accès.' 
          : 'Access denied. Only Super Admin can access access control management.'
        );
        router.replace('/admin');
      }
    }
  }, [userProfile, authLoading, router, lang]);

  // Load all user profiles
  const loadProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('display_name');
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      loadProfiles();
    }
  }, [userProfile]);

  const handleRoleChange = (id: string, role: string) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      // Default empty permissions if changing to non-admin
      const admin_permissions = role === 'admin' ? ['courses', 'lessons', 'quizzes'] : [];
      return { ...p, role, admin_permissions };
    }));
  };

  const handlePermissionToggle = (id: string, permission: string) => {
    setProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      const current = p.admin_permissions || [];
      const updated = current.includes(permission)
        ? current.filter(x => x !== permission)
        : [...current, permission];
      return { ...p, admin_permissions: updated };
    }));
  };

  const handleSave = async (profile: UserProfile) => {
    setSavingId(profile.id);
    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: profile.role,
        admin_permissions: profile.admin_permissions || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    setSavingId(null);

    if (error) {
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde : ' + error.message : 'Error saving: ' + error.message);
    } else {
      alert(lang === 'fr' ? 'Droits enregistrés avec succès !' : 'Permissions saved successfully!');
    }
  };

  if (authLoading || !userProfile || userProfile.role !== 'super_admin') {
    return <div className="p-8 text-center text-sm text-muted-foreground">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          {lang === 'fr' ? 'Gestion des Accès' : 'Access Control'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'fr' 
            ? 'Définissez les rôles et permissions des administrateurs du site.' 
            : 'Define roles and permissions for site administrators.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Utilisateur' : 'User'}</th>
                <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Rôle' : 'Role'}</th>
                <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Permissions (pour Admin)' : 'Permissions (for Admin)'}</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    {lang === 'fr' ? 'Chargement des utilisateurs...' : 'Loading users...'}
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    {lang === 'fr' ? 'Aucun utilisateur inscrit.' : 'No registered users.'}
                  </td>
                </tr>
              ) : (
                profiles.map(p => (
                  <tr key={p.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">
                          {(p.display_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{p.display_name || 'Anonyme'}</div>
                          <div className="text-[10px] text-muted-foreground">ID: {p.user_id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select 
                        value={p.role} 
                        onChange={e => handleRoleChange(p.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-border bg-slate-50 rounded-lg outline-none focus:border-primary">
                        <option value="student">{lang === 'fr' ? 'Utilisateur' : 'User'}</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      {p.role === 'admin' ? (
                        <div className="flex items-center gap-3">
                          {[
                            { id: 'courses', label: lang === 'fr' ? 'Cours' : 'Courses' },
                            { id: 'lessons', label: lang === 'fr' ? 'Leçons' : 'Lessons' },
                            { id: 'quizzes', label: lang === 'fr' ? 'Quiz' : 'Quizzes' }
                          ].map(perm => {
                            const checked = p.admin_permissions?.includes(perm.id) ?? false;
                            return (
                              <label key={perm.id} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:text-foreground">
                                <input 
                                  type="checkbox" 
                                  checked={checked}
                                  onChange={() => handlePermissionToggle(p.id, perm.id)}
                                  className="rounded border-slate-300 text-primary focus:ring-primary w-3.5 h-3.5"
                                />
                                <span>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : p.role === 'super_admin' ? (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {lang === 'fr' ? 'Accès Total' : 'Full Access'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={() => handleSave(p)}
                        disabled={savingId === p.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" />
                        {savingId === p.id ? (lang === 'fr' ? 'Sauvegarde...' : 'Saving...') : (lang === 'fr' ? 'Enregistrer' : 'Save')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
