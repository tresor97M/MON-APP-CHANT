import Link from 'next/link';
import { Music, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-6" style={{ background: '#0A1510' }}>
      <div className="text-center space-y-5 max-w-sm animate-fade-in">
        <div
          className="inline-grid place-items-center w-16 h-16 rounded-3xl shadow-lg mx-auto"
          style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)', boxShadow: '0 0 32px rgba(74,222,128,0.35)' }}
        >
          <Music className="w-8 h-8" style={{ color: '#071008' }} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">404</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cette page n'existe pas ou a été déplacée.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#071008]"
          style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)' }}
        >
          <Home className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
