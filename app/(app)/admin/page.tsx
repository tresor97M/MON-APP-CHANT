'use client';

import Link from 'next/link';
import { PlusCircle, Users, BookOpen, BarChart2, TrendingUp, Star, DollarSign, ArrowRight, MessageSquare, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useLang } from '@/hooks/use-lang';

const REVENUE_DATA = [
  { day: 'Lun', value: 340 },
  { day: 'Mar', value: 590 },
  { day: 'Mer', value: 410 },
  { day: 'Jeu', value: 890 },
  { day: 'Ven', value: 650 },
  { day: 'Sam', value: 210 },
  { day: 'Dim', value: 120 },
];

const SALES_TODAY = [
  { course: 'Justesse Vocale — Les Bases', sales: '340 €', students: 4, trend: '+18%' },
  { course: 'Maîtrise du Vibrato', sales: '180 €', students: 2, trend: '+12%' },
  { course: 'Respiration abdominale', sales: '90 €', students: 1, trend: '+5%' },
];

const RECENT_TRANSACTIONS = [
  { student: 'Léa Bogdan', course: 'Justesse Vocale', amount: '85 €', date: 'Aujourd\'hui, 14:32', status: 'Succeeded' },
  { student: 'Marc Dupont', course: 'Maîtrise du Vibrato', amount: '90 €', date: 'Aujourd\'hui, 11:15', status: 'Succeeded' },
  { student: 'Sophie Laurent', course: 'Justesse Vocale', amount: '85 €', date: 'Hier, 18:40', status: 'Succeeded' },
  { student: 'Jules Bernard', course: 'Respiration abdominale', amount: '90 €', date: 'Hier, 09:10', status: 'Succeeded' },
];

const RECENT_COMMENTS = [
  { student: 'Léa Bogdan', avatar: 'LB', comment: 'L\'exercice sur le Do3 m\'a vraiment aidé à stabiliser mes aigus. Merci Maestro !', course: 'Justesse Vocale', date: 'il y a 2h' },
  { student: 'Marc Dupont', avatar: 'MD', comment: 'Je sens déjà une différence sur le soutien diaphragmatique. Très clair.', course: 'Respiration abdominale', date: 'il y a 5h' },
];

export default function AdminDashboardPage() {
  const { lang } = useLang();

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pt-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Tableau de bord Administrateur' : 'Instructor Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Visualisez vos ventes, cours et retours élèves en temps réel.' : 'Monitor sales, courses, and student feedback.'}
          </p>
        </div>
        <Link href="/admin/cours/nouveau"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm transition-opacity">
          <PlusCircle className="w-4 h-4" /> {lang === 'fr' ? 'Ajouter un cours' : 'Add Course'}
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: lang === 'fr' ? 'Ventes aujourd\'hui' : 'Sales Today', value: '610 €', icon: DollarSign, color: 'text-primary bg-primary/10', delta: '+15% vs hier' },
          { label: lang === 'fr' ? 'Gains du mois' : 'Monthly Earnings', value: '4 890 €', icon: TrendingUp, color: 'text-secondary bg-secondary/10', delta: '+8% vs mois dernier' },
          { label: lang === 'fr' ? 'Élèves actifs' : 'Active Students', value: '47', icon: Users, color: 'text-accent bg-accent/10', delta: '+5 cette semaine' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{s.label}</div>
              <div className="font-display text-2xl font-bold text-foreground mt-0.5">{s.value}</div>
              <div className="text-[10px] text-green-600 font-bold mt-1.5 flex items-center gap-1">
                <span>{s.delta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Layout: 2/3 and 1/3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column (Left - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Earnings Chart */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-sm text-foreground">
                  {lang === 'fr' ? 'Graphique des gains (7 derniers jours)' : 'Earnings graph (last 7 days)'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ventes quotidiennes des cours de chant</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {lang === 'fr' ? 'Semaine courante' : 'Current week'}
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_DATA} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(v) => [`${v} €`, lang === 'fr' ? 'Gains' : 'Earnings']} 
                    contentStyle={{ borderRadius: 16, fontSize: 11, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                  />
                  <Bar dataKey="value" fill="hsl(207,85%,52%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-sm text-foreground">
                {lang === 'fr' ? 'Transactions Récentes' : 'Recent Transactions'}
              </h2>
              <Link href="/admin/statement" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                {lang === 'fr' ? 'Voir le rapport comptable' : 'View Statement'} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Élève' : 'Student'}</th>
                    <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Cours' : 'Course'}</th>
                    <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Montant' : 'Amount'}</th>
                    <th className="text-left px-6 py-3 font-semibold">Date</th>
                    <th className="text-left px-6 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {RECENT_TRANSACTIONS.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-foreground">{t.student}</td>
                      <td className="px-6 py-3.5 text-muted-foreground text-xs">{t.course}</td>
                      <td className="px-6 py-3.5 font-bold text-foreground">{t.amount}</td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">{t.date}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          {t.status === 'Succeeded' ? (lang === 'fr' ? 'Réussi' : 'Succeeded') : t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar Column (Right - 1/3) */}
        <div className="space-y-6">
          
          {/* Sales Today (Populaire) */}
          <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
            <div className="border-b border-border pb-3 mb-4">
              <h2 className="font-bold text-sm text-foreground">
                {lang === 'fr' ? 'Ventes du jour' : 'Sales Today'}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Parcours et cours achetés aujourd\'hui</p>
            </div>
            <div className="space-y-4">
              {SALES_TODAY.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-foreground block truncate">{s.course}</span>
                    <span className="text-[10px] text-muted-foreground">{s.students} {lang === 'fr' ? 'élèves inscrits' : 'students enrolled'}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground block">{s.sales}</span>
                    <span className="text-[9px] text-green-600 font-bold">{s.trend}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/earnings" className="w-full mt-4 py-2.5 rounded-xl border border-border hover:bg-slate-50 transition-colors text-center text-xs font-semibold text-foreground block">
              {lang === 'fr' ? 'Consulter tous les gains' : 'Check all earnings'}
            </Link>
          </div>

          {/* Comments / Feedback Section */}
          <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
            <div className="border-b border-border pb-3 mb-4 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm text-foreground">
                  {lang === 'fr' ? 'Commentaires élèves' : 'Student Feedback'}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Retours récents d\'échauffement</p>
              </div>
              <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <div className="space-y-4">
              {RECENT_COMMENTS.map((c, i) => (
                <div key={i} className="space-y-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary/70 to-secondary/70 text-white text-[10px] font-bold grid place-items-center">{c.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground block">{c.student}</span>
                      <span className="text-[9px] text-muted-foreground block">{c.course} • {c.date}</span>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/80 italic pl-1 leading-relaxed">
                    « {c.comment} »
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
