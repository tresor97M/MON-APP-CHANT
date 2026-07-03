'use client';

import Link from 'next/link';
import { ArrowLeft, Check, X, Minus } from 'lucide-react';

const QUIZ_TITLE = 'Vue.js Display Quiz';
const QUESTIONS = [
  { text: 'The MVC architectural pattern', answers: [
    { student: 'Léa B.', answer: 'Model View Controller', correct: true },
    { student: 'Marc D.', answer: 'Main Visual Core', correct: false },
    { student: 'Sophie L.', answer: 'Model View Controller', correct: true },
    { student: 'Jules B.', answer: 'Module View Container', correct: false },
  ]},
  { text: 'Database Models', answers: [
    { student: 'Léa B.', answer: 'Entity-relationship', correct: true },
    { student: 'Marc D.', answer: 'Entity-relationship', correct: true },
    { student: 'Sophie L.', answer: 'Relational only', correct: false },
    { student: 'Jules B.', answer: 'Entity-relationship', correct: true },
  ]},
  { text: 'Request Routes', answers: [
    { student: 'Léa B.', answer: 'GET /api/users', correct: true },
    { student: 'Marc D.', answer: 'GET /api/users', correct: true },
    { student: 'Sophie L.', answer: 'POST /api/users', correct: false },
    { student: 'Jules B.', answer: 'PATCH /api/users', correct: false },
  ]},
];

const SUMMARY = [
  { student: 'Léa B.', avatar: 'LB', score: 1.0, color: 'text-green-600 bg-green-50' },
  { student: 'Marc D.', avatar: 'MD', score: 0.67, color: 'text-orange-600 bg-orange-50' },
  { student: 'Sophie L.', avatar: 'SL', score: 0.33, color: 'text-red-500 bg-red-50' },
  { student: 'Jules B.', avatar: 'JB', score: 0.33, color: 'text-red-500 bg-red-50' },
];

export default function ReviewQuizPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Link href="/instructor/quiz" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux quiz
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{QUIZ_TITLE}</h1>
        <p className="text-sm text-muted-foreground mt-1">Résultats des étudiants — Review Quiz</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Questions review */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-sm text-foreground">Questions</h2>
          {QUESTIONS.map((q, qIdx) => (
            <div key={qIdx} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="font-semibold text-sm text-foreground mb-3">Q{qIdx + 1}. {q.text}</div>
              <div className="space-y-2">
                {q.answers.map((a, aIdx) => (
                  <div key={aIdx} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${a.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${a.correct ? 'bg-green-500' : 'bg-red-400'}`}>
                      {a.correct ? <Check className="w-3.5 h-3.5 text-white" /> : <X className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <span className={`font-semibold ${a.correct ? 'text-green-700' : 'text-red-600'}`}>{a.student}</span>
                      <span className="text-muted-foreground ml-2">→ {a.answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Scores sidebar */}
        <div className="space-y-4">
          <h2 className="font-bold text-sm text-foreground">Result</h2>
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="space-y-3">
              {SUMMARY.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/70 to-secondary/70 text-white text-xs font-bold grid place-items-center shrink-0">{s.avatar}</div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">{s.student}</div>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${s.score * 100}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>
                    {Math.round(s.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border text-center">
              <div className="font-display text-3xl font-bold text-foreground">
                {(SUMMARY.reduce((acc, s) => acc + s.score, 0) / SUMMARY.length).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Score moyen</div>
              <button className="mt-3 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
