'use client';

import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, Calendar, ChevronRight, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useLang } from '@/hooks/use-lang';

const MONTHLY_EARNINGS = [
  { month: 'Jan', value: 1800 },
  { month: 'Fév', value: 2400 },
  { month: 'Mar', value: 3100 },
  { month: 'Avr', value: 2800 },
  { month: 'Mai', value: 3900 },
  { month: 'Juin', value: 4890 },
];

const COURSE_BREAKDOWN = [
  { name: 'Justesse Vocale — Les Bases', price: '85 €', sales: 34, total: '2 890 €' },
  { name: 'Maîtrise du Vibrato', price: '90 €', sales: 15, total: '1 350 €' },
  { name: 'Respiration & Soutien', price: '90 €', sales: 7, total: '630 €' },
];

export default function EarningsPage() {
  const { lang } = useLang();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pt-2">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Gestion des Gains' : 'Earnings Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Consultez et suivez l\'historique de vos revenus et versements.' : 'View and track your income history and payouts.'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-border text-xs font-semibold text-foreground hover:bg-slate-50 shadow-sm transition-colors">
          <Download className="w-4 h-4" /> {lang === 'fr' ? 'Exporter en CSV' : 'Export to CSV'}
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-semibold">{lang === 'fr' ? 'Solde actuel' : 'Current Balance'}</div>
          <div className="font-display text-2xl font-bold text-foreground mt-1">1 240 €</div>
          <div className="text-[10px] text-muted-foreground mt-2">{lang === 'fr' ? 'Prochain versement le 15 du mois' : 'Next payout on the 15th'}</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-semibold">{lang === 'fr' ? 'Total encaissé' : 'Total Earned'}</div>
          <div className="font-display text-2xl font-bold text-foreground mt-1">14 870 €</div>
          <div className="text-[10px] text-green-600 font-bold mt-2">128 {lang === 'fr' ? 'inscriptions' : 'enrollments'}</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-semibold">{lang === 'fr' ? 'Taux de remboursement' : 'Refund Rate'}</div>
          <div className="font-display text-2xl font-bold text-foreground mt-1">0.8%</div>
          <div className="text-[10px] text-muted-foreground mt-2">{lang === 'fr' ? 'Excellent (inférieur à 2%)' : 'Excellent (under 2%)'}</div>
        </div>
      </div>

      {/* Graphique des revenus par mois */}
      <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
        <h2 className="font-bold text-sm text-foreground mb-4">
          {lang === 'fr' ? 'Revenus Mensuels (Semestre)' : 'Monthly Earnings (Half Year)'}
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_EARNINGS} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v} €`, 'Gains']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
              <Bar dataKey="value" fill="hsl(142, 70%, 45%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Répartition par cours */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground">
            {lang === 'fr' ? 'Répartition des ventes par cours' : 'Sales breakdown by course'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Titre du cours' : 'Course Title'}</th>
                <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Prix unitaire' : 'Unit Price'}</th>
                <th className="text-left px-6 py-3 font-semibold">{lang === 'fr' ? 'Nombre de ventes' : 'Total Sales'}</th>
                <th className="text-left px-6 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COURSE_BREAKDOWN.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-foreground">{c.name}</td>
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">{c.price}</td>
                  <td className="px-6 py-3.5 font-medium text-foreground">{c.sales}</td>
                  <td className="px-6 py-3.5 font-bold text-foreground">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
