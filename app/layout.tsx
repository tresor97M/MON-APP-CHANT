import './globals.css';
import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ThemeProvider } from '@/hooks/use-theme';
import { AuthProvider } from '@/hooks/use-auth';
import { LangProvider } from '@/hooks/use-lang';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Sora({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Chorale — Gestion, Répertoire & Formation',
  description:
    'Plateforme de gestion de chorale : répertoire de cantiques, calendrier du répertoire, répétitions et pointage, apprentissage par pupitre et formation continue.',
  applicationName: 'Chorale',
  authors: [{ name: 'Chorale' }],
  keywords: ['chorale', 'cantiques', 'répertoire', 'répétitions', 'pupitre', 'soprano', 'alto', 'ténor', 'basse'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className="bg-background">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`}>
        <LangProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <Sonner />
            </AuthProvider>
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}
