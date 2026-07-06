'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Lock, Camera, Shield, Globe, Bell, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { supabase, type UserProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Tab = 'basic' | 'password' | 'privacy';

export default function AccountPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [tab, setTab] = useState<Tab>('basic');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    phone: '',
    username: '',
    voice_part: '' as string | null,
    instrument: '' as string | null,
    role_type: 'chantre'
  });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [privacy, setPrivacy] = useState({ show_email: false, show_progress: true, allow_messages: true, notify_email: true, notify_security: true });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Utilisateur';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({
          display_name: data.display_name,
          bio: data.bio || '',
          location: data.location || '',
          phone: data.phone || '',
          username: data.username || '',
          voice_part: data.voice_part || '',
          instrument: data.instrument || '',
          role_type: data.instrument ? 'instrumentiste' : 'chantre'
        });
        setPrivacy({ show_email: data.show_email, show_progress: data.show_progress, allow_messages: data.allow_messages, notify_email: data.notify_email, notify_security: data.notify_security });
      } else {
        setForm(f => ({ ...f, display_name: userName }));
      }
    });
  }, [user]);

  const handleSaveBasic = async () => {
    if (!user) return;
    setLoading(true);
    const savePayload = {
      display_name: form.display_name,
      bio: form.bio,
      location: form.location,
      phone: form.phone,
      username: form.username,
      voice_part: form.role_type === 'chantre' ? (form.voice_part || null) : null,
      instrument: form.role_type === 'instrumentiste' ? (form.instrument || null) : null,
      updated_at: new Date().toISOString()
    };
    if (profile) {
      await supabase.from('user_profiles').update(savePayload).eq('user_id', user.id);
    } else {
      await supabase.from('user_profiles').insert({ user_id: user.id, ...savePayload });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    setLoading(true);
    if (profile) {
      await supabase.from('user_profiles').update({ ...privacy, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      setMessage(lang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    if (newPw.length < 6) {
      setMessage(lang === 'fr' ? 'Minimum 6 caractères.' : 'Minimum 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setMessage(lang === 'fr' ? 'Erreur : ' + error.message : 'Error: ' + error.message);
    } else {
      setMessage(lang === 'fr' ? 'Mot de passe modifié avec succès !' : 'Password updated successfully!');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    }
    setLoading(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basic', label: t('account_basic') },
    { id: 'password', label: t('account_password') },
    { id: 'privacy', label: t('account_privacy') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t('account_title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Gérez vos informations personnelles et vos préférences.' : 'Manage your personal information and preferences.'}
          </p>
        </div>
        <button onClick={tab === 'basic' ? handleSaveBasic : tab === 'privacy' ? handleSavePrivacy : handleChangePassword}
          disabled={loading}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-60',
            saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
          )}>
          <Save className="w-4 h-4" />
          {saved ? t('saved') : t('account_save')}
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setMessage(''); }}
            className={cn('px-4 py-2 rounded-lg text-xs font-semibold transition-all',
              tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        {/* BASIC INFORMATION */}
        {tab === 'basic' && (
          <div className="space-y-6">
            <h2 className="font-bold text-base text-foreground border-b border-border pb-3">{t('account_basic')}</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-2xl font-bold grid place-items-center shadow-md">{userInitial}</div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full grid place-items-center shadow hover:opacity-90 transition-opacity">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  {lang === 'fr' ? 'Choisir un fichier' : 'Choose File'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: t('account_firstname'), value: form.display_name, key: 'display_name', icon: User, placeholder: userName },
                { label: t('account_email'), value: userEmail, key: 'email', icon: Mail, placeholder: userEmail, disabled: true },
                { label: t('account_username'), value: form.username, key: 'username', icon: User, placeholder: '@' + userName.toLowerCase() },
                { label: t('account_phone'), value: form.phone, key: 'phone', icon: User, placeholder: '+33 6 00 00 00 00' },
                { label: t('account_location'), value: form.location, key: 'location', icon: Globe, placeholder: 'Paris, France' },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={field.value}
                      disabled={field.disabled}
                      onChange={e => !field.disabled && setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4 border-t border-border pt-4 mt-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rôle & Pupitre / Instrument</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Type de Profil</label>
                  <select
                    value={form.role_type}
                    onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  >
                    <option value="chantre">Chantre (Choriste)</option>
                    <option value="instrumentiste">Instrumentiste (Musicien)</option>
                  </select>
                </div>

                {form.role_type === 'chantre' ? (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs font-semibold text-foreground">Pupitre Vocal</label>
                    <select
                      value={form.voice_part || ''}
                      onChange={e => setForm(f => ({ ...f, voice_part: e.target.value || null }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    >
                      <option value="">À évaluer (Je ne sais pas)</option>
                      <option value="soprano">Soprano (Voix aiguë femme)</option>
                      <option value="alto">Alto (Voix grave femme)</option>
                      <option value="tenor">Ténor (Voix aiguë homme)</option>
                      <option value="basse">Basse (Voix grave homme)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs font-semibold text-foreground">Instrument Principal</label>
                    <select
                      value={form.instrument || ''}
                      onChange={e => setForm(f => ({ ...f, instrument: e.target.value || null }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    >
                      <option value="">Sélectionnez un instrument</option>
                      <option value="piano">Piano / Clavier</option>
                      <option value="guitare">Guitare</option>
                      <option value="basse">Basse</option>
                      <option value="batterie">Batterie / Percussions</option>
                      <option value="cuivres">Vents / Cuivres</option>
                      <option value="autre">Autre instrument</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">{t('account_bio')}</label>
              <textarea rows={3} value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder={lang === 'fr' ? 'Parlez-nous de vous...' : 'Tell us about yourself...'}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all"
              />
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {tab === 'password' && (
          <div className="space-y-6 max-w-md">
            <h2 className="font-bold text-base text-foreground border-b border-border pb-3">{t('account_password')}</h2>
            {message && <div className={`rounded-xl px-4 py-3 text-xs font-medium ${message.includes('succès') || message.includes('success') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>{message}</div>}
            {[
              { label: t('account_current_pw'), value: oldPw, set: setOldPw, show: showOld, toggle: () => setShowOld(!showOld) },
              { label: t('account_new_pw'), value: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew) },
              { label: t('account_confirm_pw'), value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
            ].map((field, i) => (
              <div key={i} className="space-y-1">
                <label className="text-xs font-semibold text-foreground">{field.label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={field.show ? 'text' : 'password'} value={field.value} onChange={e => field.set(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                  <button onClick={field.toggle} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRIVACY */}
        {tab === 'privacy' && (
          <div className="space-y-6">
            <h2 className="font-bold text-base text-foreground border-b border-border pb-3">{t('account_privacy')}</h2>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('account_visibility')}</h3>
              {[
                { key: 'show_email', label: lang === 'fr' ? 'Afficher mon email publiquement' : 'Show my email publicly', desc: lang === 'fr' ? 'Les autres étudiants peuvent voir votre email.' : 'Other students can see your email.' },
                { key: 'allow_messages', label: lang === 'fr' ? 'Autoriser les messages de tous' : 'Allow messages from anyone', desc: lang === 'fr' ? 'Recevoir des messages d\'inconnus.' : 'Receive messages from anyone.' },
                { key: 'show_progress', label: lang === 'fr' ? 'Afficher ma progression' : 'Show my course progress', desc: lang === 'fr' ? 'Visible sur votre profil public.' : 'Visible on your public profile.' },
              ].map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input type="checkbox" checked={privacy[item.key as keyof typeof privacy] as boolean}
                      onChange={e => setPrivacy(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('account_notifications')}</h3>
              {[
                { key: 'notify_email', label: lang === 'fr' ? 'Notifications par email' : 'Email notifications', icon: Bell },
                { key: 'notify_security', label: lang === 'fr' ? 'Alertes de sécurité' : 'Security alerts', icon: Shield },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-primary" />
                    <div className="text-sm font-semibold text-foreground">{item.label}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={privacy[item.key as keyof typeof privacy] as boolean}
                      onChange={e => setPrivacy(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
