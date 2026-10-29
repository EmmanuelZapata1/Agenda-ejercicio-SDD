import { Commitment } from '../domain/commitment';
import { CreateCommitmentDTO } from '../domain/types';
import { ICommitmentRepository } from '../repositories/commitment.repository';
import { ScheduleConflictException, TaskValidationException } from '../domain/exceptions';

export class CommitmentService {
  private readonly repository: ICommitmentRepository;

  constructor(repository: ICommitmentRepository) {
    this.repository = repository;
  }

  /**
   * RN-03: Verifica si existe un solapamiento con compromisos existentes
   * en estado PROGRAMADO o CONFIRMADO para el mismo usuario creador.
   * Rango: (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
   */
  public hasScheduleConflict(userId: string, start: Date, end: Date): boolean {
    const existing = this.repository.findByUserId(userId);
    return existing.some(comm => {
      if (comm.estado === 'CANCELADO') return false;
      return comm.overlapsWith(start, end);
    });
  }

  /**
   * Agenda un nuevo compromiso validando RN-03, RN-04 y RN-05.
   */
  public scheduleCommitment(dto: CreateCommitmentDTO): Commitment {
    const commitment = new Commitment({
      userId: dto.userId,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      ubicacion: dto.ubicacion,
      participantes: dto.participantes,
      minutosRecordatorio: dto.minutosRecordatorio,
      estado: dto.estado || 'PROGRAMADO',
    });

    // RN-03: Validación de Solapamiento para el usuario creador
    const hasConflict = this.hasScheduleConflict(
      commitment.userId,
      commitment.fechaInicio,
      commitment.fechaFin
    );

    if (hasConflict) {
      throw new ScheduleConflictException(
        `RN-03: Conflicto de horario detectado. El usuario '${commitment.userId}' ya tiene un compromiso programado o confirmado que se solapa con el intervalo (${commitment.fechaInicio.toISOString()} - ${commitment.fechaFin.toISOString()}).`
      );
    }

    this.repository.save(commitment);
    return commitment;
  }

  /**
   * Cancela un compromiso existente.
   */
  public cancelCommitment(id: string): void {
    const commitment = this.repository.findById(id);
    if (!commitment) {
      throw new TaskValidationException(`No se encontró el compromiso con ID '${id}'.`);
    }

    commitment.cancel();
    this.repository.save(commitment);
  }

  /**
   * Confirma un compromiso existente.
   */
  public confirmCommitment(id: string): void {
    const commitment = this.repository.findById(id);
    if (!commitment) {
      throw new TaskValidationException(`No se encontró el compromiso con ID '${id}'.`);
    }

    commitment.confirm();
    this.repository.save(commitment);
  }

  /**
   * Lista todos los compromisos ordenados cronológicamente por fecha de inicio.
   */
  public getAllCommitments(): Commitment[] {
    return this.repository.findAll().sort(
      (a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime()
    );
  }

  public getCommitmentById(id: string): Commitment | null {
    return this.repository.findById(id);
  }

  public deleteCommitment(id: string): boolean {
    return this.repository.delete(id);
  }
}
