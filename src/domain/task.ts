import { Priority, TaskStatus } from './types';
import { TaskValidationException } from './exceptions';
import { generateSecureUUID, sanitizeString } from '../security/sanitizer';

export interface TaskProps {
  id?: string;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: Date | string;
  prioridad: Priority;
  estado?: TaskStatus;
  etiquetas?: string[];
}

export class Task {
  private readonly _id: string;
  private _titulo: string;
  private _descripcion: string;
  private _fechaVencimiento: Date;
  private _prioridad: Priority;
  private _estado: TaskStatus;
  private _etiquetas: string[];

  constructor(props: TaskProps, creationReferenceDate: Date = new Date()) {
    // ID Criptográficamente seguro
    this._id = props.id || generateSecureUUID();

    // Sanitización y longitud máxima (Máx 100)
    try {
      this._titulo = sanitizeString(props.titulo, 'titulo', 100, true);
    } catch (err: any) {
      throw new TaskValidationException(err.message);
    }

    // Descripción opcional (Máx 500)
    try {
      this._descripcion = sanitizeString(props.descripcion || '', 'descripcion', 500, false);
    } catch (err: any) {
      throw new TaskValidationException(err.message);
    }

    // RN-01: Validación de Fecha de Vencimiento no en el pasado
    const parsedDate = new Date(props.fechaVencimiento);
    if (isNaN(parsedDate.getTime())) {
      throw new TaskValidationException('La fecha de vencimiento es inválida.');
    }

    // Permitir tolerancia de hasta 1 segundo por diferencias de reloj en tests o input
    if (parsedDate.getTime() < creationReferenceDate.getTime() - 1000) {
      throw new TaskValidationException(
        `RN-01: La fecha de vencimiento (${parsedDate.toISOString()}) no puede estar en el pasado con respecto al momento de creación (${creationReferenceDate.toISOString()}).`
      );
    }
    this._fechaVencimiento = parsedDate;

    // Prioridad
    const validPriorities: Priority[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
    if (!validPriorities.includes(props.prioridad)) {
      throw new TaskValidationException(`Prioridad '${props.prioridad}' no válida.`);
    }
    this._prioridad = props.prioridad;

    // Estado inicial (por defecto PENDIENTE)
    const validStatuses: TaskStatus[] = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'];
    const initialStatus = props.estado || 'PENDIENTE';
    if (!validStatuses.includes(initialStatus)) {
      throw new TaskValidationException(`Estado '${initialStatus}' no válido.`);
    }
    this._estado = initialStatus;

    // Etiquetas sanitizadas
    this._etiquetas = (props.etiquetas || [])
      .map(tag => sanitizeString(tag, 'etiqueta', 30, false))
      .filter(tag => tag.length > 0);
  }

  // Getters inmutables
  public get id(): string { return this._id; }
  public get titulo(): string { return this._titulo; }
  public get descripcion(): string { return this._descripcion; }
  public get fechaVencimiento(): Date { return new Date(this._fechaVencimiento); }
  public get prioridad(): Priority { return this._prioridad; }
  public get estado(): TaskStatus { return this._estado; }
  public get etiquetas(): string[] { return [...this._etiquetas]; }

  /**
   * RN-02: Transiciones de Estado de Tarea
   * Una tarea COMPLETADA o CANCELADA no puede cambiar a EN_PROCESO o PENDIENTE.
   */
  public changeStatus(newStatus: TaskStatus): void {
    if (this._estado === newStatus) return;

    if (
      (this._estado === 'COMPLETADA' || this._estado === 'CANCELADA') &&
      (newStatus === 'PENDIENTE' || newStatus === 'EN_PROCESO')
    ) {
      throw new TaskValidationException(
        `RN-02: Transición de estado inválida. Una tarea en estado '${this._estado}' no puede cambiar a '${newStatus}'.`
      );
    }

    this._estado = newStatus;
  }

  /**
   * Actualiza la fecha de vencimiento garantizando RN-01.
   */
  public updateDueDate(newDate: Date | string, referenceNow: Date = new Date()): void {
    const parsed = new Date(newDate);
    if (isNaN(parsed.getTime())) {
      throw new TaskValidationException('La fecha de vencimiento es inválida.');
    }
    if (parsed.getTime() < referenceNow.getTime() - 1000) {
      throw new TaskValidationException(
        `RN-01: La fecha de vencimiento actualizada no puede estar en el pasado.`
      );
    }
    this._fechaVencimiento = parsed;
  }

  /**
   * Determina si la tarea está pendiente y vencida dado un instante de tiempo.
   */
  public isPendingAndOverdue(now: Date = new Date()): boolean {
    return this._estado === 'PENDIENTE' && this._fechaVencimiento.getTime() < now.getTime();
  }

  /**
   * Serialización limpia para persistencia.
   */
  public toJSON() {
    return {
      id: this._id,
      titulo: this._titulo,
      descripcion: this._descripcion,
      fechaVencimiento: this._fechaVencimiento.toISOString(),
      prioridad: this._prioridad,
      estado: this._estado,
      etiquetas: this._etiquetas,
    };
  }

  public static fromJSON(raw: any): Task {
    return new Task({
      id: raw.id,
      titulo: raw.titulo,
      descripcion: raw.descripcion,
      fechaVencimiento: new Date(raw.fechaVencimiento),
      prioridad: raw.prioridad,
      estado: raw.estado,
      etiquetas: raw.etiquetas,
    }, new Date(0)); // Permitir reconstrucción de registros históricos
  }
}
