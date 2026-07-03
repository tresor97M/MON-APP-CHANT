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
  title: "Maestro Studio — L'Art du Chant par l'IA",
  description: 'Libère ta voix. Entraîne-toi au chant avec un coach IA personnalisé. Écoute, analyse, justesse et technique vocale.',
  applicationName: 'Maestro Studio',
  authors: [{ name: 'Maestro Studio' }],
  keywords: ['chant', 'musique', 'coach vocal', 'IA', 'justesse', 'respiration', 'vocalises'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
