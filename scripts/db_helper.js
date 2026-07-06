const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file manually
const envPath = path.resolve(__dirname, '../../../../../../../../OneDrive/Desktop/MON APP DE CHANT/.env');
console.log('Reading env from:', envPath);
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (err) {
  // Try local directory path if absolute resolves weirdly
  try {
    envContent = fs.readFileSync('C:/Users/treso/OneDrive/Desktop/MON APP DE CHANT/.env', 'utf8');
  } catch (e) {
    console.error('Failed to read .env file:', e.message);
    process.exit(1);
  }
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials in .env file!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Successfully initialized Supabase connection.');

  // 1. Fetch user profiles
  console.log('\n--- Profiles list ---');
  const { data: profiles, error: pError } = await supabase
    .from('user_profiles')
    .select('id, user_id, display_name, role, email');
  
  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log(`Found ${profiles.length} profile(s):`);
    profiles.forEach(p => {
      console.log(`- ID: ${p.id} | UserID: ${p.user_id} | Name: ${p.display_name} | Role: ${p.role} | Email: ${p.email}`);
    });

    // If there is an argument to promote a user
    const targetUserId = process.argv[2];
    if (targetUserId) {
      console.log(`\nPromoting user ${targetUserId} to super_admin...`);
      const { data: updated, error: uError } = await supabase
        .from('user_profiles')
        .update({ role: 'super_admin' })
        .eq('user_id', targetUserId)
        .select();
      if (uError) {
        console.error('Error promoting user:', uError);
      } else {
        console.log('Success! Updated profile:', updated);
      }
    } else if (profiles.length > 0) {
      console.log('\nTip: To promote a user to super_admin, run:');
      console.log(`node db_helper.js <user_id>`);
    }
  }

  // 2. Fetch or seed Hymns
  console.log('\n--- Hymns check ---');
  const { data: hymns, error: hError } = await supabase
    .from('hymns')
    .select('id, number, title');
  
  if (hError) {
    console.error('Error fetching hymns:', hError);
  } else {
    console.log(`Found ${hymns.length} hymn(s) in database.`);
    if (hymns.length === 0) {
      console.log('Seeding sample hymns...');
      const sampleHymns = [
        {
          number: 1,
          title: 'Grâce Infinie (Amazing Grace)',
          author: 'John Newton',
          category: 'louange',
          language: 'fr',
          lyrics: 'Grâce infinie, ô quel doux son,\nQui sauva un misérable comme moi !\nJ’étais perdu, mais je suis retrouvé,\nJ’étais aveugle, maintenant je vois.',
          learning_status: 'repertoire_actif'
        },
        {
          number: 2,
          title: 'Grand Dieu, nous te bénissons',
          author: 'Ignaz Franz',
          category: 'adoration',
          language: 'fr',
          lyrics: 'Grand Dieu, nous te bénissons ;\nNous célébrons tes louanges.\nL’univers avec ses anges\nTe rend grâce dans ses chants.',
          learning_status: 'en_apprentissage'
        },
        {
          number: 3,
          title: 'Reste avec moi, Seigneur',
          author: 'Henry Francis Lyte',
          category: 'communion',
          language: 'fr',
          lyrics: 'Reste avec moi, Seigneur, le jour décline ;\nLa nuit s’approche et l’ombre s’épaissit.\nQuand tout s’en va, force divine,\nViens, ô Sauveur, et reste avec moi.',
          learning_status: 'nouveau'
        }
      ];

      const { data: inserted, error: iError } = await supabase
        .from('hymns')
        .insert(sampleHymns)
        .select();
      
      if (iError) {
        console.error('Error seeding hymns:', iError);
      } else {
        console.log(`Successfully seeded ${inserted.length} hymns!`);
      }
    }
  }

  // 3. Fetch or seed Training Paths & Modules
  console.log('\n--- Training Paths check ---');
  const { data: paths, error: pathError } = await supabase
    .from('training_paths')
    .select('id, name');

  if (pathError) {
    console.error('Error fetching training paths:', pathError);
  } else {
    console.log(`Found ${paths.length} training path(s) in database.`);
    if (paths.length === 0) {
      console.log('Seeding sample training paths & modules...');
      
      // Path 1: Vocal Respiration
      const { data: p1, error: e1 } = await supabase
        .from('training_paths')
        .insert({
          name: 'Respiration & Soutien Diaphragmatique',
          description: 'Maîtrisez la base de tout chantre : la respiration ventrale et la stabilité de l\'expiration.',
          target_gap_category: 'respiration',
          is_open: true
        })
        .select()
        .single();

      if (!e1 && p1) {
        console.log(`Added path: ${p1.name}`);
        await supabase.from('training_modules').insert([
          {
            path_id: p1.id,
            title: '1. Comprendre son diaphragme',
            content: 'Inspirez en gonflant le ventre sans hausser les épaules, puis retenez l\'air pendant 4 secondes.',
            xp_reward: 20,
            sort_order: 1
          },
          {
            path_id: p1.id,
            title: '2. L\'exercice du sifflement continu',
            content: 'Expirez lentement en produisant un son "Ssss" le plus stable et le plus long possible. Visez 10 secondes.',
            xp_reward: 25,
            sort_order: 2
          }
        ]);
      }

      // Path 2: Instrumentist Piano Accompagnement
      const { data: p2, error: e2 } = await supabase
        .from('training_paths')
        .insert({
          name: 'Accompagnement Harmonique (Piano/Clavier)',
          description: 'Pour les pianistes débutants : apprenez à structurer les accords pour la liturgie de la chorale.',
          target_gap_category: null,
          is_open: true
        })
        .select()
        .single();

      if (!e2 && p2) {
        console.log(`Added path: ${p2.name}`);
        await supabase.from('training_modules').insert([
          {
            path_id: p2.id,
            title: '1. Les accords parfaits de base',
            content: 'Maîtrisez les triades majeures et mineures dans les tonalités courantes (Do majeur, Sol majeur, Fa majeur).',
            xp_reward: 30,
            sort_order: 1
          },
          {
            path_id: p2.id,
            title: '2. Transition fluide sous métronome',
            content: 'Entraînez-vous à passer d\'un accord à l\'autre sans temps mort au tempo de 65 BPM.',
            xp_reward: 35,
            sort_order: 2
          }
        ]);
      }

      // Path 3: Rythme et Précision
      const { data: p3, error: e3 } = await supabase
        .from('training_paths')
        .insert({
          name: 'Rythme & Précision pour Louange',
          description: 'Améliorez votre rigueur de tempo. Indispensable pour les batteurs, bassistes et guitaristes.',
          target_gap_category: 'rythme',
          is_open: true
        })
        .select()
        .single();

      if (!e3 && p3) {
        console.log(`Added path: ${p3.name}`);
        await supabase.from('training_modules').insert([
          {
            path_id: p3.id,
            title: '1. Travailler sur le temps fort',
            content: 'Jouez ou marquez le temps fort (le 1er temps sur une mesure à 4 temps) de manière nette et consistante.',
            xp_reward: 20,
            sort_order: 1
          },
          {
            path_id: p3.id,
            title: '2. Les syncopes de base',
            content: 'Découvrez comment accentuer le contretemps pour donner du groove aux cantiques de louange rapide.',
            xp_reward: 30,
            sort_order: 2
          }
        ]);
      }
      console.log('Successfully seeded all paths and modules!');
    }
  }
}

run().catch(console.error);
