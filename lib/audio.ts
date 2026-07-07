/**
 * Play a beautiful, premium notification sound chime using the Web Audio API.
 * This is 100% client-side, lightweight, and requires no external audio assets.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play a nice double chime: note 1 (E5), then note 2 (A5)
    // First Chime (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second Chime (A5 - 880 Hz) - slightly offset
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);

  } catch (e) {
    console.warn('Web Audio notification chime failed:', e);
  }
}

/**
 * Synthesizes a realistic telephone ringing tone in a loop using the Web Audio API.
 * Returns an object with a stop() function to terminate the loop.
 */
export function playRingingSound(): { stop: () => void } {
  if (typeof window === 'undefined') return { stop: () => {} };

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return { stop: () => {} };

    const ctx = new AudioContextClass();
    let isRinging = true;

    const ring = () => {
      if (!isRinging || ctx.state === 'closed') return;

      // US ringback tone is typically 440 Hz + 480 Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      // Soft start
      gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
      // Keep playing for 2 seconds
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime + 1.8);
      // Soft stop
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);

      osc1.stop(ctx.currentTime + 2.0);
      osc2.stop(ctx.currentTime + 2.0);

      // Repeat every 4 seconds (2s ringing + 2s silence)
      setTimeout(() => {
        if (isRinging) {
          ring();
        }
      }, 4000);
    };

    ring();

    return {
      stop: () => {
        isRinging = false;
        try {
          ctx.close();
        } catch (e) {
          // ignore
        }
      }
    };
  } catch (e) {
    console.warn('Ringing sound synthesis failed:', e);
    return { stop: () => {} };
  }
}

/**
 * Plays a brief descending hang-up tone.
 */
export function playHangupSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 400);
  } catch (e) {
    console.warn('Hangup sound synthesis failed:', e);
  }
}

/**
 * Plays a quick ascending double-chime when call is accepted.
 */
export function playCallConnectedSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First Chime (C5 - 523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second Chime (E5 - 659.25 Hz) with 0.12s delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    gain2.gain.setValueAtTime(0.08, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);

    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 500);
  } catch (e) {
    console.warn('Call connected sound synthesis failed:', e);
  }
}
