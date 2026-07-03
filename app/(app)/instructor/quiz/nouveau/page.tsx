'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Check } from 'lucide-react';

type Question = {
  id: number;
  text: string;
  options: string[];
  correct: number;
};

const defaultQ: Question = { id: 1, text: '', options: ['', '', '', ''], correct: 0 };

export default function AddEditQuizPage() {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([{ ...defaultQ }]);
  const [saved, setSaved] = useState(false);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), text: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeQuestion = (id: number) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Link href="/instructor/quiz" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux quiz
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Add / Edit Quiz</h1>
          <p className="text-sm text-muted-foreground mt-1">Créez des questions à choix multiples.</p>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? 'Sauvegardé !' : 'Save Quiz'}
        </button>
      </div>

      {/* Quiz title */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Titre du Quiz</label>
          <input type="text" value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
            placeholder="Ex: Vue.js Display Quiz"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Cours associé</label>
            <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
              <option>Justesse Vocale</option>
              <option>Maîtrise du Vibrato</option>
              <option>Respiration & Soutien</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Thumbnail (aperçu)</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-sm font-bold grid place-items-center">V</div>
              <span className="text-xs text-muted-foreground">Image du cours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Question {qIdx + 1}</span>
              <button onClick={() => removeQuestion(q.id)} disabled={questions.length === 1}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input type="text" value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)}
              placeholder="#1 Quelle commande pour afficher résultat ?"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Options (sélectionnez la bonne réponse)</label>
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button onClick={() => updateQuestion(q.id, 'correct', oIdx)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${q.correct === oIdx ? 'border-primary bg-primary' : 'border-border hover:border-primary/50'}`}>
                    {q.correct === oIdx && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <input type="text" value={opt} onChange={e => updateOption(q.id, oIdx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/60 transition-all">
        <Plus className="w-4 h-4" /> Ajouter une question
      </button>
    </div>
  );
}
