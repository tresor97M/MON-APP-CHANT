import { describe, it, expect } from 'vitest';
import {
  autoCorrelate, hzToMidi, midiToHz, midiToNoteName, hzToNoteName,
  computePitchAccuracy, buildCurveFromNotes,
} from './pitch';

describe('hzToMidi / midiToHz', () => {
  it('convertit La4 (440Hz) en MIDI 69', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 5);
  });

  it('fait l\'aller-retour Hz -> MIDI -> Hz sans dérive', () => {
    expect(midiToHz(hzToMidi(261.63))).toBeCloseTo(261.63, 1);
  });

  it('retourne 0 pour une fréquence nulle ou négative', () => {
    expect(hzToMidi(0)).toBe(0);
    expect(hzToMidi(-10)).toBe(0);
  });
});

describe('midiToNoteName / hzToNoteName', () => {
  it('nomme MIDI 69 "La4" et MIDI 60 "Do4"', () => {
    expect(midiToNoteName(69)).toBe('La4');
    expect(midiToNoteName(60)).toBe('Do4');
  });

  it('reconnaît 261.63 Hz comme Do4 (Do central)', () => {
    expect(hzToNoteName(261.63)).toBe('Do4');
  });

  it('retourne une chaîne vide pour une fréquence invalide', () => {
    expect(hzToNoteName(0)).toBe('');
  });
});

describe('autoCorrelate', () => {
  function sineBuffer(freq: number, sampleRate: number, size: number, amplitude = 0.8): Float32Array {
    const buf = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return buf;
  }

  it('détecte une sinusoïde à 440Hz à quelques Hz près', () => {
    const sampleRate = 44100;
    const buf = sineBuffer(440, sampleRate, 2048);
    const detected = autoCorrelate(buf, sampleRate);
    expect(detected).toBeGreaterThan(0);
    expect(Math.abs(detected - 440)).toBeLessThan(10);
  });

  it('détecte une sinusoïde grave (Do3, 130.81Hz) à quelques Hz près', () => {
    const sampleRate = 44100;
    const buf = sineBuffer(130.81, sampleRate, 4096);
    const detected = autoCorrelate(buf, sampleRate);
    expect(detected).toBeGreaterThan(0);
    expect(Math.abs(detected - 130.81)).toBeLessThan(5);
  });

  it('retourne -1 pour un signal silencieux (sous le seuil RMS)', () => {
    const buf = new Float32Array(2048); // tout à zéro
    expect(autoCorrelate(buf, 44100)).toBe(-1);
  });
});

describe('computePitchAccuracy', () => {
  it('retourne 100 quand toutes les frames sont parfaitement justes', () => {
    const history = Array.from({ length: 20 }, () => ({ cents: 0, just: true }));
    expect(computePitchAccuracy(history, 25)).toBe(100);
  });

  it('retourne 0 quand il n\'y a que du silence', () => {
    const history = Array.from({ length: 20 }, () => ({ cents: 0, just: false }));
    expect(computePitchAccuracy(history, 25)).toBe(0);
  });

  it('retourne 0 pour un historique vide', () => {
    expect(computePitchAccuracy([], 25)).toBe(0);
  });

  it('donne un crédit dégressif : un écart plus grand donne un score plus bas', () => {
    const smallDeviation = [{ cents: 10, just: true }];
    const bigDeviation = [{ cents: 60, just: false }];
    const scoreSmall = computePitchAccuracy(smallDeviation, 25);
    const scoreBig = computePitchAccuracy(bigDeviation, 25);
    expect(scoreSmall).toBeGreaterThan(scoreBig);
  });

  it('ignore les frames de silence dans la moyenne (ne les compte pas comme fausses)', () => {
    const withSilence = [
      { cents: 0, just: true }, { cents: 0, just: true },
      { cents: 0, just: false }, { cents: 0, just: false }, { cents: 0, just: false },
    ];
    // 2 frames chantées parfaitement justes, 3 frames de silence ignorées -> doit rester à 100.
    expect(computePitchAccuracy(withSilence, 25)).toBe(100);
  });
});

describe('buildCurveFromNotes', () => {
  it('retourne un tableau vide pour une liste de notes vide', () => {
    expect(buildCurveFromNotes([], 0.5)).toEqual([]);
  });

  it('répartit les notes dans l\'ordre sur les tranches demandées', () => {
    const curve = buildCurveFromNotes([100, 200], 1, 10);
    expect(curve).toHaveLength(10);
    expect(curve[0]).toBe(100);
    expect(curve[curve.length - 1]).toBe(200);
  });
});
