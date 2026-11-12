/**
 * Utilidades puras de presentación (sin dependencia del DOM; probadas con Vitest).
 */
import { validateEmailRfc5322 } from '../security/sanitizer';

const LOCALE = 'es-CO';

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short' }).format(date);
}

export function formatDayMonth(date: Date): { day: string; month: string; weekday: string } {
  return {
    day: new Intl.DateTimeFormat(LOCALE, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(LOCALE, { month: 'short' }).format(date).replace('.', ''),
    weekday: new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(date),
  };
}

/** Duración legible "Xh Ym" a partir de minutos. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** UUID abreviado para el badge técnico. */
export function shortId(id: string): string {
  return id.substring(0, 8);
}

/** Valor compatible con <input type="datetime-local"> en hora local. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type IntervalCheck =
  | { ok: true; minutes: number; label: string }
  | { ok: false; minutes: number | null; label: string };

/**
 * Verificación previa del intervalo de un compromiso (fechaFin > fechaInicio y RN-04 ≥ 15 min).
 * Alimenta la insignia "Intervalo verificado" del formulario y de la tarjeta.
 */
export function checkInterval(start: Date, end: Date): IntervalCheck {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, minutes: null, label: 'Fechas incompletas o inválidas' };
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes <= 0) {
    return { ok: false, minutes, label: 'La fecha de fin debe ser posterior al inicio' };
  }
  if (minutes < 15) {
    return { ok: false, minutes, label: `RN-04: mínimo 15 min (actual: ${minutes} min)` };
  }
  return { ok: true, minutes, label: `Intervalo verificado (Duración: ${formatDuration(minutes)})` };
}

/** Separa una cadena de correos por comas, punto y coma o espacios. */
export function splitEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
}

/** Valida una lista de correos (RN-05) devolviendo los inválidos. */
export function invalidEmails(emails: string[]): string[] {
  return emails.filter(e => !validateEmailRfc5322(e));
}
