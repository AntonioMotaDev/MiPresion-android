import { describe, it, expect } from 'vitest';
import { isComplete, sanitizeDigits } from '../src/logic/autoadvance.js';

describe('isComplete', () => {
  it('avanza con 3 dígitos', () => {
    expect(isComplete('120')).toBe(true);
    expect(isComplete('105')).toBe(true);
  });
  it('avanza con 2 dígitos si el primero es 3 o mayor', () => {
    expect(isComplete('95')).toBe(true);
    expect(isComplete('78')).toBe(true);
    expect(isComplete('30')).toBe(true);
  });
  it('espera un tercer dígito si empieza con 1 o 2', () => {
    expect(isComplete('12')).toBe(false);
    expect(isComplete('10')).toBe(false);
    expect(isComplete('25')).toBe(false);
  });
  it('no avanza con 0 o 1 dígitos', () => {
    expect(isComplete('')).toBe(false);
    expect(isComplete('9')).toBe(false);
  });
});

describe('sanitizeDigits', () => {
  it('quita lo que no es número y corta en 3', () => {
    expect(sanitizeDigits('1a2.0')).toBe('120');
    expect(sanitizeDigits('1234')).toBe('123');
    expect(sanitizeDigits(null)).toBe('');
  });
});
