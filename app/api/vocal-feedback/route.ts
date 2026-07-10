import { NextResponse } from 'next/server';

/**
 * Analyse qualitative d'un enregistrement vocal par Gemini (entrée audio
 * multimodale), en complément du score chiffré calculé côté client
 * (lib/pitch.ts). Contrairement au score, ce retour peut commenter des
 * aspects que l'analyse de pitch seule ne capture pas (timbre, respiration,
 * articulation, tremblement de la voix...).
 */
export async function POST(req: Request) {
  try {
    const { audioBase64, mimeType, exerciseName, exerciseType, score, customApiKey } = await req.json();

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini manquante. Configurez GEMINI_API_KEY dans .env.' },
        { status: 400 }
      );
    }
    if (!audioBase64) {
      return NextResponse.json({ error: 'Aucun enregistrement audio fourni.' }, { status: 400 });
    }

    const typeLabels: Record<string, string> = {
      pitch: 'justesse (tenue de note)',
      vibrato: 'vibrato',
      breathing: 'contrôle du souffle',
      melody: 'interprétation d\'une phrase mélodique',
      vocalise: 'vocalise',
      harmony: 'harmonisation',
    };

    const systemPrompt = `Tu es un coach vocal bienveillant et expert, spécialisé dans le chant choral et liturgique.
On te fournit un enregistrement audio d'un choriste réalisant un exercice de type "${typeLabels[exerciseType] || exerciseType}" nommé "${exerciseName}". Son score algorithmique (justesse/régularité) est de ${score}/100.

Écoute l'enregistrement et donne un retour qualitatif COURT (3-4 phrases maximum) en français, complémentaire au score chiffré :
- Commente ce que le score ne peut pas mesurer : timbre, placement de la voix, respiration audible, tension, tremblement, clarté de l'articulation.
- Sois concret et bienveillant, jamais décourageant.
- Termine par UN conseil pratique et actionnable.
- Ne répète pas juste le score numérique, apporte une vraie valeur d'écoute.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Voici mon enregistrement, donne-moi ton retour.' },
              { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
            ],
          },
        ],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini vocal-feedback error:', errText);
      return NextResponse.json(
        { error: 'L\'IA n\'a pas pu analyser cet enregistrement (format audio non pris en charge ou erreur serveur).' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Je n\'ai pas pu analyser cet enregistrement, réessaie.';

    return NextResponse.json({ feedback });
  } catch (err: any) {
    console.error('Vocal Feedback Server Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 });
  }
}
