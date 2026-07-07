'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUp } from 'lucide-react';

export function Preloader() {
  const [show, setShow] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [visible, setVisible] = useState(false);
  
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('maestro_preloader_seen');
    if (seen !== 'true') {
      setShow(true);
      // Staggered text animations trigger shortly after mount
      const timer = setTimeout(() => setVisible(true), 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsAnimating(true);
    setTranslateY(window.innerHeight);
    setTimeout(() => {
      setShow(false);
      sessionStorage.setItem('maestro_preloader_seen', 'true');
    }, 500);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isAnimating) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY;
    if (diff > 0) {
      // Allow dragging up
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || isAnimating) return;
    isDragging.current = false;
    if (translateY > 100) {
      handleDismiss();
    } else {
      setTranslateY(0);
    }
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    touchStartY.current = e.clientY;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || isAnimating) return;
    const diff = touchStartY.current - e.clientY;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current || isAnimating) return;
    isDragging.current = false;
    if (translateY > 100) {
      handleDismiss();
    } else {
      setTranslateY(0);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-between overflow-hidden select-none bg-[#0A1510]"
      style={{
        transform: `translateY(-${translateY}px)`,
        transition: isDragging.current ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Image with elegant overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: 'url("/images/preloader-bg.png")',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1510]/80 via-[#0A1510]/20 to-[#0A1510]/95 pointer-events-none" />

      {/* Embedded CSS for animations */}
      <style jsx global>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.04); }
          28% { transform: scale(1); }
          42% { transform: scale(1.04); }
          70% { transform: scale(1); }
        }
        @keyframes bounceUp {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-6px); opacity: 0.9; }
        }
        .animate-heartbeat-text {
          animation: heartbeat 2.2s infinite ease-in-out;
          display: inline-block;
        }
        .animate-bounce-up {
          animation: bounceUp 2s infinite ease-in-out;
        }
      `}</style>

      {/* Top Header Text Section (All-caps, Italic, bold style matching original) */}
      <div className="flex flex-col items-start px-8 pt-24 md:pt-32 select-none relative z-10">
        <span 
          className="text-white text-5xl md:text-7xl font-black italic tracking-wide uppercase leading-[1.05] transition-all duration-700"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Élevez
        </span>
        <span 
          className="text-white text-5xl md:text-7xl font-black italic tracking-wide uppercase leading-[1.05] transition-all duration-700 delay-100"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Votre
        </span>
        <span 
          className="text-white text-5xl md:text-7xl font-black italic tracking-wide uppercase leading-[1.05] transition-all duration-700 delay-200"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Expérience
        </span>
        <span 
          className="bg-gradient-to-r from-primary via-emerald-400 to-amber-400 bg-clip-text text-transparent text-5xl md:text-7xl font-black italic tracking-wide uppercase leading-[1.05] transition-all duration-700 delay-300"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Vocale !
        </span>
      </div>

      {/* Bottom Slider & Chevrons Area */}
      <div className="w-full flex flex-col items-center px-6 pb-12 md:pb-16 select-none relative z-10">
        {/* Double chevrons floating up */}
        <div className="flex flex-col items-center mb-2 pointer-events-none">
          <ChevronsUp className="text-primary w-6 h-6 animate-bounce-up" />
        </div>

        {/* Swipe Pill Slider Container */}
        <div 
          onClick={handleDismiss}
          className="w-full max-w-sm h-16 rounded-full flex items-center justify-between p-1 bg-[#112018]/70 backdrop-blur-lg border border-[#4ADE80]/15 shadow-2xl relative cursor-pointer active:scale-[0.99] transition-transform duration-200"
        >
          {/* Left Arrow Button (amber tint, semi-transparent) */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500/60 pointer-events-none">
            <ChevronLeft size={20} />
          </div>

          {/* Centered text reacting like a heartbeat */}
          <span 
            className="text-sm font-semibold tracking-wider text-white/70 animate-heartbeat-text uppercase"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Glisser pour chanter
          </span>

          {/* Right Arrow Button (amber, solid, pulsating glow) */}
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500 text-[#0A1510] shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-transform">
            <ChevronRight size={22} className="stroke-[2.5]" />
          </div>
        </div>
      </div>
    </div>
  );
}
