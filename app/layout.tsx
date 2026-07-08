import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ThemeProvider } from '@/hooks/use-theme';
import { AuthProvider } from '@/hooks/use-auth';
import { LangProvider } from '@/hooks/use-lang';
import { Preloader } from '@/components/layout/preloader';
import { PWAInstallPrompt } from '@/components/layout/pwa-install-prompt';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Outfit({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Maestro — Chorale & Formation',
  description:
    'Gérez votre chorale, apprenez vos partitions et progressez avec votre Coach IA musical. Répétitions, cantiques, formation continue.',
  applicationName: 'Maestro',
  authors: [{ name: 'Maestro' }],
  keywords: ['chorale', 'cantiques', 'répertoire', 'répétitions', 'pupitre', 'soprano', 'alto', 'ténor', 'basse', 'coach IA', 'formation musicale'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Maestro',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Maestro',
    title: 'Maestro — Chorale & Formation',
    description: 'Gérez votre chorale et progressez avec votre Coach IA musical.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1510',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className="bg-background">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`}>
        <LangProvider>
          <ThemeProvider>
            <AuthProvider>
              <Preloader />
              {children}
              <PWAInstallPrompt />
              <Toaster />
              <Sonner />
            </AuthProvider>
          </ThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}

