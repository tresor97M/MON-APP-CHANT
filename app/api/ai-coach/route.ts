import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, profile, stats, gaps, customApiKey } = await req.json();

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY dans votre fichier .env ou fournir une clé dans l\'interface.' },
        { status: 400 }
      );
    }

    // Build the system instruction describing the coach's identity and user context
    const userName = profile?.display_name || 'Chantre';
    const profileTypeStr = profile?.instrument
      ? `Instrumentiste / Musicien (${profile.instrument})`
      : `Chantre / Choriste (Pupitre : ${profile?.voice_part || 'À évaluer'})`;

    const statsStr = stats
      ? `Niveau ${stats.level}, XP Total ${stats.total_xp}, Assiduité aux répétitions ${stats.attendance_rate || 0}%`
      : 'Aucune statistique disponible pour le moment';

    const gapsStr = gaps && gaps.length > 0
      ? gaps.map((g: any) => `- ${g.category} (Sévérité: ${g.severity}/3, note: ${g.note || 'aucune'})`).join('\n')
      : 'Aucune lacune critique identifiée. Le membre progresse normalement !';

    const systemPrompt = `Tu es le "Maestro Coach IA", un assistant vocal et musical bienveillant, expert en direction de chœur, en technique vocale et en accompagnement instrumental pour les chants liturgiques et la louange.

Ton objectif est d'aider le membre à devenir un meilleur chantre ou musicien en lui donnant des conseils personnalisés, bienveillants et extrêmement pratiques.

Voici le contexte de l'utilisateur avec qui tu parles :
- Nom : ${userName}
- Type de profil : ${profileTypeStr}
- Statistiques de progression : ${statsStr}
- Lacunes / Points à travailler identifiés :
${gapsStr}

Règles de comportement :
1. Sois encourageant, chaleureux et professionnel.
2. Si le membre est chanteur (chantre), concentre tes conseils sur la technique vocale (respiration diaphragmatique, placement de la voix, justesse, voix de tête/poitrine, vibrato, gestion du stress).
3. Si le membre est instrumentiste (ex. piano, guitare, basse, batterie), concentre tes conseils sur l'accompagnement, la précision rythmique, le tempo (pratique au métronome), l'écoute des autres voix et la dynamique de groupe.
4. Donne des exercices pratiques, simples et courts à faire chez soi (ex: "Exercice des lèvres (lip trills) pendant 2 minutes", "Pratique des accords de transition lente à 60 BPM").
5. Rédige tes réponses en français, de manière claire et concise. Évite les trop longs discours pour faciliter la lecture.
6. Fais référence à son profil de temps en temps pour personnaliser ton discours.`;

    // Map chat history to Gemini API contents format
    // Filter out system or invalid roles, keep user and model
    const contents = (messages || []).map((msg: any) => {
      let role = 'user';
      if (msg.role === 'assistant' || msg.role === 'model') {
        role = 'model';
      }
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });

    // If there is no message, or the last message doesn't exist, seed a prompt
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: 'Bonjour Coach, peux-tu faire mon diagnostic de départ et me donner un conseil ?' }],
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Response:', errText);
      return NextResponse.json(
        { error: `Erreur de l'API Gemini : ${response.statusText}. Assurez-vous que votre clé API est valide.` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

    return NextResponse.json({ reply: replyText });
  } catch (err: any) {
    console.error('AI Coach Server Error:', err);
    return NextResponse.json(
      { error: err.message || 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
