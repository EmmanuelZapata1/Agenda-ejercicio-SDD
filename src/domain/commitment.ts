import { CommitmentStatus } from './types';
import { TaskValidationException } from './exceptions';
import { generateSecureUUID, sanitizeString, validateEmailRfc5322 } from '../security/sanitizer';

export interface CommitmentProps {
  id?: string;
  userId?: string;
  titulo: string;
  descripcion?: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  ubicacion?: string;
  participantes: string[];
  estado?: CommitmentStatus;
  minutosRecordatorio?: number;
}

export class Commitment {
  private readonly _id: string;
  private readonly _userId: string;
  private _titulo: string;
  private _descripcion: string;
  private _fechaInicio: Date;
  private _fechaFin: Date;
  private _ubicacion: string;
  private _participantes: string[];
  private _estado: CommitmentStatus;
  private _minutosRecordatorio: number;

  constructor(props: CommitmentProps) {
    this._id = props.id || generateSecureUUID();

    // Sanitización y validación de título (Máx 100 caracteres)
    try {
      this._titulo = sanitizeString(props.titulo, 'titulo', 100, true);
    } catch (err: any) {
      throw new TaskValidationException(err.message);
    }

    // Descripción opcional (Máx 1000 caracteres)
    try {
      this._descripcion = sanitizeString(props.descripcion || '', 'descripcion', 1000, false);
    } catch (err: any) {
      throw new TaskValidationException(err.message);
    }

    // Ubicación opcional (Máx 200 caracteres)
    try {
      this._ubicacion = sanitizeString(props.ubicacion || '', 'ubicacion', 200, false);
    } catch (err: any) {
      throw new TaskValidationException(err.message);
    }

    // Fechas y validación temporal
    const start = new Date(props.fechaInicio);
    const end = new Date(props.fechaFin);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new TaskValidationException('Las fechas de inicio o fin del compromiso son inválidas.');
    }

    if (end.getTime() <= start.getTime()) {
      throw new TaskValidationException(
        `La fechaFin (${end.toISOString()}) debe ser estrictamente posterior a la fechaInicio (${start.toISOString()}).`
      );
    }

    // RN-04: Duración Mínima de Compromiso (al menos 15 minutos = 900,000 ms)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      throw new TaskValidationException(
        `RN-04: La duración del compromiso debe ser de al menos 15 minutos (duración actual: ${Math.round(durationMinutes)} minutos).`
      );
    }

    this._fechaInicio = start;
    this._fechaFin = end;

    // RN-05: Validación de Participantes (RFC 5322 y al menos 1)
    if (!props.participantes || !Array.isArray(props.participantes) || props.participantes.length === 0) {
      throw new TaskValidationException(
        'RN-05: La lista de participantes es obligatoria y debe contener al menos un correo.'
      );
    }

    const validatedEmails: string[] = [];
    for (const email of props.participantes) {
      const trimmedEmail = typeof email === 'string' ? email.trim() : '';
      if (!validateEmailRfc5322(trimmedEmail)) {
        throw new TaskValidationException(
          `RN-05: El correo de participante '${trimmedEmail}' no cumple con el formato estándar RFC 5322.`
        );
      }
      if (!validatedEmails.includes(trimmedEmail)) {
        validatedEmails.push(trimmedEmail);
      }
    }
    this._participantes = validatedEmails;

    // Usuario creador (por defecto el primer participante o el especificado)
    this._userId = props.userId || validatedEmails[0]!;

    // Estado inicial
    const validStatuses: CommitmentStatus[] = ['PROGRAMADO', 'CONFIRMADO', 'CANCELADO'];
    const initialStatus = props.estado || 'PROGRAMADO';
    if (!validStatuses.includes(initialStatus)) {
      throw new TaskValidationException(`Estado de compromiso '${initialStatus}' no válido.`);
    }
    this._estado = initialStatus;

    // Minutos de recordatorio (default 15, >= 0)
    const reminder = props.minutosRecordatorio !== undefined ? props.minutosRecordatorio : 15;
    if (typeof reminder !== 'number' || reminder < 0 || reminder > 10080) {
      throw new TaskValidationException('Los minutos de recordatorio deben estar entre 0 y 10080 (7 días).');
    }
    this._minutosRecordatorio = reminder;
  }

  // Getters
  public get id(): string { return this._id; }
  public get userId(): string { return this._userId; }
  public get titulo(): string { return this._titulo; }
  public get descripcion(): string { return this._descripcion; }
  public get fechaInicio(): Date { return new Date(this._fechaInicio); }
  public get fechaFin(): Date { return new Date(this._fechaFin); }
  public get ubicacion(): string { return this._ubicacion; }
  public get participantes(): string[] { return [...this._participantes]; }
  public get estado(): CommitmentStatus { return this._estado; }
  public get minutosRecordatorio(): number { return this._minutosRecordatorio; }

  public get durationMinutes(): number {
    return Math.round((this._fechaFin.getTime() - this._fechaInicio.getTime()) / (1000 * 60));
  }

  /**
   * Cancela el compromiso.
   */
  public cancel(): void {
    this._estado = 'CANCELADO';
  }

  /**
   * Confirma el compromiso.
   */
  public confirm(): void {
    if (this._estado === 'CANCELADO') {
      throw new TaskValidationException('No se puede confirmar un compromiso cancelado.');
    }
    this._estado = 'CONFIRMADO';
  }

  /**
   * RN-03: Verifica solapamiento de horario con otro compromiso.
   * Rango de traslape: (NuevoInicio < ExistenteFin) && (NuevoFin > ExistenteInicio)
   */
  public overlapsWith(start: Date, end: Date): boolean {
    return this._fechaInicio.getTime() < end.getTime() && this._fechaFin.getTime() > start.getTime();
  }

  public toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      titulo: this._titulo,
      descripcion: this._descripcion,
      fechaInicio: this._fechaInicio.toISOString(),
      fechaFin: this._fechaFin.toISOString(),
      ubicacion: this._ubicacion,
      participantes: this._participantes,
      estado: this._estado,
      minutosRecordatorio: this._minutosRecordatorio,
    };
  }

  public static fromJSON(raw: any): Commitment {
    return new Commitment({
      id: raw.id,
      userId: raw.userId,
      titulo: raw.titulo,
      descripcion: raw.descripcion,
      fechaInicio: new Date(raw.fechaInicio),
      fechaFin: new Date(raw.fechaFin),
      ubicacion: raw.ubicacion,
      participantes: raw.participantes,
      estado: raw.estado,
      minutosRecordatorio: raw.minutosRecordatorio,
    });
  }
}
