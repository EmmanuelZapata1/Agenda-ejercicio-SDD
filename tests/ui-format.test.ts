import { describe, it, expect } from 'vitest';
import { checkInterval, formatDuration, invalidEmails, shortId, splitEmails, toLocalInputValue } from '../src/ui/format';

describe('Utilidades de presentación (UI)', () => {
  it('formatDuration produce el formato Xh Ym del design system', () => {
    expect(formatDuration(15)).toBe('15m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('checkInterval valida fechaFin > fechaInicio y RN-04 (≥ 15 min)', () => {
    const start = new Date('2030-01-01T10:00:00');
    expect(checkInterval(start, new Date('2030-01-01T11:30:00'))).toMatchObject({
      ok: true,
      minutes: 90,
      label: 'Intervalo verificado (Duración: 1h 30m)',
    });
    expect(checkInterval(start, new Date('2030-01-01T10:10:00')).ok).toBe(false);
    expect(checkInterval(start, new Date('2030-01-01T09:00:00')).ok).toBe(false);
    expect(checkInterval(start, new Date('fecha inválida')).ok).toBe(false);
  });

  it('splitEmails e invalidEmails aplican RN-05 sobre la entrada del formulario', () => {
    const list = splitEmails('a@cronos.co, b@cronos.co;  malo@ c@museo.org');
    expect(list).toEqual(['a@cronos.co', 'b@cronos.co', 'malo@', 'c@museo.org']);
    expect(invalidEmails(list)).toEqual(['malo@']);
  });

  it('shortId y toLocalInputValue', () => {
    expect(shortId('12345678-aaaa-bbbb-cccc-1234567890ab')).toBe('12345678');
    expect(toLocalInputValue(new Date(2030, 0, 5, 9, 7))).toBe('2030-01-05T09:07');
  });
});
