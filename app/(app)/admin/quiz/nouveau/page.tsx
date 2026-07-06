'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/hooks/use-lang';

type Question = {
  id: string | number;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
};

const defaultQ: Question = { id: 'temp-1', text: '', options: ['', '', '', ''], correct: 0, explanation: '' };

export default function AddEditQuizPage() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL parameters
  const initialLessonId = searchParams.get('lesson_id') || '';

  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState(initialLessonId);
  const [questions, setQuestions] = useState<Question[]>([{ ...defaultQ }]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Charger les leçons existantes
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lessons').select('*').order('sort_order');
      if (data) {
        setLessons(data);
        if (!selectedLessonId && data.length > 0) {
          setSelectedLessonId(data[0].id);
        }
      }
      
      // 2. Charger les questions existantes s'il y en a pour cette leçon
      if (initialLessonId) {
        const { data: qData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('lesson_id', initialLessonId);
        
        if (qData && qData.length > 0) {
          const formatted = qData.map((q) => ({
            id: q.id,
            text: q.question,
            options: q.options,
            correct: q.correct_answer_index,
            explanation: q.explanation || ''
          }));
          setQuestions(formatted);
        }
      }
      setLoading(false);
    })();
  }, [initialLessonId, selectedLessonId]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), text: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
  };

  const updateQuestion = (id: string | number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: string | number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeQuestion = (id: string | number) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // 3. Enregistrer les modifications
  const handleSaveQuiz = async () => {
    if (!selectedLessonId) return;
    setSaved(true);

    try {
      // Étape 1 : Vider les anciennes questions
      await supabase.from('quiz_questions').delete().eq('lesson_id', selectedLessonId);

      // Étape 2 : Insérer les nouvelles
      const toInsert = questions.map((q) => ({
        lesson_id: selectedLessonId,
        question: q.text,
        options: q.options,
        correct_answer_index: q.correct,
        explanation: q.explanation
      }));

      const { error } = await supabase.from('quiz_questions').insert(toInsert);

      if (error) {
        alert(lang === 'fr' ? 'Erreur lors de la sauvegarde : ' + error.message : 'Error saving: ' + error.message);
        setSaved(false);
      } else {
        setTimeout(() => {
          setSaved(false);
          router.push('/admin/quiz');
        }, 1200);
      }
    } catch (err: any) {
      alert(err.message);
      setSaved(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Link href="/admin/quiz" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour aux quiz' : 'Back to quizzes'}
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Créer / Modifier un Quiz' : 'Add / Edit Quiz'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Configurez les questions à choix multiples de votre quiz.' : 'Create multiple-choice questions.'}
          </p>
        </div>
        <button onClick={handleSaveQuiz}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? (lang === 'fr' ? 'Sauvegardé !' : 'Saved!') : (lang === 'fr' ? 'Enregistrer le quiz' : 'Save Quiz')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          {/* Associated Lesson */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Leçon associée' : 'Associated Lesson'}</label>
              <select 
                value={selectedLessonId} 
                onChange={e => setSelectedLessonId(e.target.value)}
                disabled={!!initialLessonId}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
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
                  placeholder={lang === 'fr' ? 'Saisissez votre question ici...' : 'Enter question here...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {lang === 'fr' ? 'Options (sélectionnez la bonne réponse)' : 'Options (select the correct answer)'}
                  </label>
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Explication de la réponse' : 'Explanation'}</label>
                  <textarea 
                    value={q.explanation} 
                    onChange={e => updateQuestion(q.id, 'explanation', e.target.value)}
                    placeholder={lang === 'fr' ? 'Explication affichée après avoir répondu...' : 'Explanation displayed after answering...'}
                    className="w-full h-20 px-4 py-2 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/60 transition-all">
            <Plus className="w-4 h-4" /> {lang === 'fr' ? 'Ajouter une question' : 'Add Question'}
          </button>
        </>
      )}
    </div>
  );
}
