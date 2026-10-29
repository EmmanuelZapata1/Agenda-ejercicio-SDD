import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeString,
  validateEmailRfc5322,
  generateSecureUUID,
  safeJsonParse,
  SecurityValidationException,
} from '../src/security/sanitizer';

describe('Capa de Seguridad Transversal', () => {
  describe('escapeHtml', () => {
    it('debe escapar caracteres peligrosos para prevenir XSS', () => {
      const malicious = '<script>alert("xss")</script>&"\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#39;');
    });
  });

  describe('sanitizeString', () => {
    it('debe rechazar cadenas que sobrepasen la longitud máxima', () => {
      const longTitle = 'a'.repeat(101);
      expect(() => sanitizeString(longTitle, 'titulo', 100)).toThrow(SecurityValidationException);
    });

    it('debe recortar caracteres de control no imprimibles', () => {
      const dirty = 'Tarea\u0000 con byte nulo\u001F';
      const clean = sanitizeString(dirty, 'titulo', 100);
      expect(clean).toBe('Tarea con byte nulo');
    });

    it('debe rechazar campos obligatorios vacíos', () => {
      expect(() => sanitizeString('   ', 'titulo', 100, true)).toThrow(SecurityValidationException);
    });
  });

  describe('validateEmailRfc5322', () => {
    it('debe aceptar correos con formato válido RFC 5322', () => {
      expect(validateEmailRfc5322('usuario@cronos.co')).toBe(true);
      expect(validateEmailRfc5322('maria.gonzalez@empresa.com.co')).toBe(true);
    });

    it('debe rechazar correos inválidos o maliciosos', () => {
      expect(validateEmailRfc5322('invalido-sin-arroba')).toBe(false);
      expect(validateEmailRfc5322('usuario@')).toBe(false);
      expect(validateEmailRfc5322('@dominio.com')).toBe(false);
      expect(validateEmailRfc5322('user<script>@domain.com')).toBe(false);
    });
  });

  describe('generateSecureUUID', () => {
    it('debe generar UUIDs en formato v4 válido', () => {
      const uuid = generateSecureUUID();
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidV4Regex);
    });
  });

  describe('safeJsonParse', () => {
    it('debe neutralizar intentos de polución de prototipos', () => {
      const payload = '{"title":"Seguro", "__proto__":{"polluted":"yes"}}';
      const result = safeJsonParse<{ title: string; polluted?: string }>(payload, { title: '' });
      expect(result.title).toBe('Seguro');
      expect((result as any).polluted).toBeUndefined();
      expect(({} as any).polluted).toBeUndefined();
    });
  });
});
