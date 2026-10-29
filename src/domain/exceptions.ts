/**
 * Excepciones de Dominio del Sistema Cronos & Co.
 * En estricto cumplimiento con SDD Sección 5.3
 */

export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}

/**
 * Disparada cuando se violan las reglas de negocio de tareas o validaciones de fecha/duración.
 */
export class TaskValidationException extends DomainException {
  constructor(message: string) {
    super(`[Validación de Tarea] ${message}`);
    this.name = 'TaskValidationException';
    Object.setPrototypeOf(this, TaskValidationException.prototype);
  }
}

/**
 * Disparada cuando se detecta un conflicto o solapamiento de horario entre compromisos.
 */
export class ScheduleConflictException extends DomainException {
  constructor(message: string) {
    super(`[Conflicto de Horario] ${message}`);
    this.name = 'ScheduleConflictException';
    Object.setPrototypeOf(this, ScheduleConflictException.prototype);
  }
}
