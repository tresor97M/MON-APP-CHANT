'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Download, Eye, Calendar, Printer } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';

const STATEMENTS = [
  { id: 'STMT-2026-06', period: 'Juin 2026', date: '01/07/2026', total: '4 890 €', tax: '978 €', net: '3 912 €' },
  { id: 'STMT-2026-05', period: 'Mai 2026', date: '01/06/2026', total: '3 900 €', tax: '780 €', net: '3 120 €' },
  { id: 'STMT-2026-04', period: 'Avril 2026', date: '01/05/2026', total: '2 800 €', tax: '560 €', net: '2 240 €' },
  { id: 'STMT-2026-03', period: 'Mars 2026', date: '01/04/2026', total: '3 100 €', tax: '620 €', net: '2 480 €' },
];

export default function StatementPage() {
  const { lang } = useLang();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pt-2">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Rapports Comptables' : 'Statements & Invoices'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Téléchargez et imprimez vos relevés mensuels de facturation.' : 'Download and print your monthly billing statements.'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-border text-xs font-semibold text-foreground hover:bg-slate-50 shadow-sm transition-colors">
          <Printer className="w-4 h-4" /> {lang === 'fr' ? 'Imprimer la liste' : 'Print list'}
        </button>
      </div>

      {/* Table of Statements */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-6 py-3.5 font-semibold">ID {lang === 'fr' ? 'Relevé' : 'Statement'}</th>
                <th className="text-left px-6 py-3.5 font-semibold">{lang === 'fr' ? 'Période' : 'Period'}</th>
                <th className="text-left px-6 py-3.5 font-semibold">{lang === 'fr' ? 'Date d\'émission' : 'Issue Date'}</th>
                <th className="text-left px-6 py-3.5 font-semibold">{lang === 'fr' ? 'Ventes brutes' : 'Gross Sales'}</th>
                <th className="text-left px-6 py-3.5 font-semibold">TVA (20%)</th>
                <th className="text-left px-6 py-3.5 font-semibold">{lang === 'fr' ? 'Montant net' : 'Net Amount'}</th>
                <th className="text-right px-6 py-3.5 font-semibold">{lang === 'fr' ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STATEMENTS.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">{s.id}</td>
                  <td className="px-6 py-4 font-semibold text-foreground">{s.period}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{s.date}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{s.total}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{s.tax}</td>
                  <td className="px-6 py-4 font-bold text-green-600">{s.net}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors" title={lang === 'fr' ? 'Visualiser' : 'View'}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-primary transition-colors" title={lang === 'fr' ? 'Télécharger PDF' : 'Download PDF'}>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax advice box */}
      <div className="rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50/40 border border-orange-200/50 p-5 flex gap-3 shadow-inner">
        <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-orange-800">{lang === 'fr' ? 'Note importante concernant les taxes' : 'Important tax notification'}</h4>
          <p className="text-[11px] text-orange-700/90 leading-relaxed font-medium">
            {lang === 'fr' 
              ? 'Les relevés ci-dessus incluent la TVA française par défaut au taux de 20%. Veuillez vous rapprocher de votre expert-comptable pour déclarer vos revenus selon le statut juridique de votre école.' 
              : 'These statements include VAT at standard French rate (20%). Please contact your accountant to register your earnings properly based on your organization\'s status.'}
          </p>
        </div>
      </div>

    </div>
  );
}
