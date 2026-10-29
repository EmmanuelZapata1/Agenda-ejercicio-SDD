/**
 * Capa de Seguridad Transversal de Cronos & Co.
 * Mitigaciones activas contra XSS, Polución de Prototipos, Inyecciones y Fallos de Límites.
 */

export class SecurityValidationException extends Error {
  constructor(message: string) {
    super(`[Security Alert] ${message}`);
    this.name = 'SecurityValidationException';
    Object.setPrototypeOf(this, SecurityValidationException.prototype);
  }
}

/**
 * Codifica caracteres especiales para evitar ataques Cross-Site Scripting (XSS).
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza y valida cadenas de entrada contra desbordamiento y caracteres de control.
 */
export function sanitizeString(
  input: unknown,
  fieldName: string,
  maxLength: number,
  required: boolean = true
): string {
  if (input === null || input === undefined) {
    if (required) {
      throw new SecurityValidationException(`El campo '${fieldName}' es obligatorio.`);
    }
    return '';
  }

  if (typeof input !== 'string') {
    throw new SecurityValidationException(`El campo '${fieldName}' debe ser una cadena de texto.`);
  }

  // Eliminar caracteres nulos y de control no imprimibles
  const cleaned = input.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();

  if (required && cleaned.length === 0) {
    throw new SecurityValidationException(`El campo '${fieldName}' no puede estar vacío.`);
  }

  if (cleaned.length > maxLength) {
    throw new SecurityValidationException(
      `El campo '${fieldName}' excede la longitud máxima permitida de ${maxLength} caracteres (recibido: ${cleaned.length}).`
    );
  }

  return cleaned;
}

/**
 * Validador estricto de direcciones de correo electrónico bajo estándar RFC 5322.
 */
const RFC_5322_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmailRfc5322(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return RFC_5322_REGEX.test(trimmed);
}

/**
 * Generador criptográficamente seguro de Identificadores Únicos Universales (UUID v4).
 */
export function generateSecureUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback criptográfico en entornos donde randomUUID no esté disponible
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

/**
 * Deserializador seguro de JSON con reviver contra polución de prototipos (__proto__, constructor).
 */
export function safeJsonParse<T>(jsonStr: string | null, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // Descartar claves maliciosas
      }
      return value;
    }) as T;
  } catch {
    return fallback;
  }
}
