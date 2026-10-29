/**
 * Tipos y enumeraciones del modelo de dominio Cronos & Co.
 * Contrato inmutable basado en la especificación SDD v1.0.0
 */

export type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

export type CommitmentStatus = 'PROGRAMADO' | 'CONFIRMADO' | 'CANCELADO';

export interface CreateTaskDTO {
  titulo: string;
  descripcion?: string;
  fechaVencimiento: Date | string;
  prioridad: Priority;
  etiquetas?: string[];
}

export interface CreateCommitmentDTO {
  userId?: string; // Creador del compromiso (por defecto el primer participante o UUID de sesión)
  titulo: string;
  descripcion?: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  ubicacion?: string;
  participantes: string[];
  minutosRecordatorio?: number;
  estado?: CommitmentStatus;
}
