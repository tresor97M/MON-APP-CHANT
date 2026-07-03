'use client';

import Link from 'next/link';
import { PlusCircle, Users, BookOpen, BarChart2, TrendingUp, Star, Edit2, Trash2, Eye } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const EARNINGS_DATA = [
  { day: 'Lun', value: 420 },
  { day: 'Mar', value: 680 },
  { day: 'Mer', value: 540 },
  { day: 'Jeu', value: 890 },
  { day: 'Ven', value: 720 },
  { day: 'Sam', value: 300 },
  { day: 'Dim', value: 150 },
];

const STUDENTS = [
  { name: 'Léa Bogdan', avatar: 'LB', course: 'Justesse Vocale', progress: 80, joined: 'il y a 2j' },
  { name: 'Marc Dupont', avatar: 'MD', course: 'Maîtrise du Vibrato', progress: 55, joined: 'il y a 5j' },
  { name: 'Sophie L.', avatar: 'SL', course: 'Respiration & Soutien', progress: 100, joined: 'il y a 1 sem' },
  { name: 'Jules B.', avatar: 'JB', course: 'Justesse Vocale', progress: 30, joined: 'il y a 2 sem' },
];

export default function InstructorDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Instructeur</h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenue ! Voici un aperçu de votre activité.</p>
        </div>
        <Link href="/instructor/cours/nouveau"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm transition-opacity">
          <PlusCircle className="w-4 h-4" /> Nouveau Cours
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Revenus totaux', value: '2 450 €', icon: TrendingUp, color: 'text-primary bg-primary/10', delta: '+12% ce mois' },
          { label: 'Étudiants actifs', value: '47', icon: Users, color: 'text-secondary bg-secondary/10', delta: '+5 cette semaine' },
          { label: 'Cours publiés', value: '4', icon: BookOpen, color: 'text-accent bg-accent/10', delta: '1 en brouillon' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-sm flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
              <div className="font-display text-2xl font-bold text-foreground mt-0.5">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Earnings Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-foreground">Revenus (7 derniers jours)</h2>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Semaine en cours</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EARNINGS_DATA} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} €`, 'Revenus']} contentStyle={{ borderRadius: 12, fontSize: 11, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="value" fill="hsl(207,85%,52%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="font-bold text-sm text-foreground mb-4">Résumé</h2>
          <div className="space-y-3">
            {[
              { label: 'Vidéos en ligne', value: '12' },
              { label: 'Heures de contenu', value: '4h 20min' },
              { label: 'Note moyenne', value: '4.8 ★' },
              { label: 'Taux de complétion', value: '72%' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span>Évaluation globale : <strong className="text-foreground">4.8 / 5</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Students table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground">Étudiants récents</h2>
          <Link href="/instructor/cours" className="text-xs font-semibold text-primary hover:underline">Voir tout</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Étudiant</th>
                <th className="text-left px-5 py-3 font-semibold">Cours</th>
                <th className="text-left px-5 py-3 font-semibold">Progression</th>
                <th className="text-left px-5 py-3 font-semibold">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STUDENTS.map((s, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">{s.avatar}</div>
                      <span className="font-semibold text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{s.course}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.progress === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{s.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{s.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
