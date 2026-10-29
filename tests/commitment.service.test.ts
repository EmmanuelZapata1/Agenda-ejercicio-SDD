import { describe, it, expect, beforeEach } from 'vitest';
import { CommitmentService } from '../src/services/commitment.service';
import { LocalStorageCommitmentRepository } from '../src/repositories/commitment.repository';
import { ScheduleConflictException, TaskValidationException } from '../src/domain/exceptions';

describe('CommitmentService: Reglas RN-03, RN-04, RN-05 y Conflictos', () => {
  let repository: LocalStorageCommitmentRepository;
  let service: CommitmentService;

  beforeEach(() => {
    repository = new LocalStorageCommitmentRepository('test_commitments_service_db');
    repository.clear();
    service = new CommitmentService(repository);
  });

  it('scheduleCommitment: debe agendar un compromiso con éxito', () => {
    const comm = service.scheduleCommitment({
      userId: 'autor@cronos.co',
      titulo: 'Revisión de Galeradas',
      descripcion: 'Corrección de pruebas de impresión',
      fechaInicio: new Date('2026-11-02T09:00:00Z'),
      fechaFin: new Date('2026-11-02T10:00:00Z'),
      participantes: ['autor@cronos.co', 'corrector@cronos.co'],
      ubicacion: 'Taller Central',
      minutosRecordatorio: 30,
    });

    expect(comm.id).toBeDefined();
    expect(comm.titulo).toBe('Revisión de Galeradas');
    expect(comm.estado).toBe('PROGRAMADO');
    expect(comm.minutosRecordatorio).toBe(30);

    const saved = service.getCommitmentById(comm.id);
    expect(saved).not.toBeNull();
  });

  it('RN-03: debe lanzar ScheduleConflictException si existe solapamiento para el mismo usuario', () => {
    // Compromiso base: 10:00 a 11:30
    service.scheduleCommitment({
      userId: 'editor@cronos.co',
      titulo: 'Mesa Redonda Tipográfica',
      fechaInicio: new Date('2026-11-02T10:00:00Z'),
      fechaFin: new Date('2026-11-02T11:30:00Z'),
      participantes: ['editor@cronos.co'],
    });

    // Intento 1: Solapamiento dentro del rango (10:30 a 11:15)
    expect(() => {
      service.scheduleCommitment({
        userId: 'editor@cronos.co',
        titulo: 'Reunión en conflicto parcial',
        fechaInicio: new Date('2026-11-02T10:30:00Z'),
        fechaFin: new Date('2026-11-02T11:15:00Z'),
        participantes: ['editor@cronos.co', 'otro@cronos.co'],
      });
    }).toThrow(ScheduleConflictException);

    // Intento 2: Solapamiento por inicio antes y fin dentro (09:45 a 10:15)
    expect(() => {
      service.scheduleCommitment({
        userId: 'editor@cronos.co',
        titulo: 'Reunión en conflicto inicial',
        fechaInicio: new Date('2026-11-02T09:45:00Z'),
        fechaFin: new Date('2026-11-02T10:15:00Z'),
        participantes: ['editor@cronos.co'],
      });
    }).toThrow(ScheduleConflictException);

    // Intento 3: Solapamiento por inicio dentro y fin después (11:15 a 12:00)
    expect(() => {
      service.scheduleCommitment({
        userId: 'editor@cronos.co',
        titulo: 'Reunión en conflicto final',
        fechaInicio: new Date('2026-11-02T11:15:00Z'),
        fechaFin: new Date('2026-11-02T12:00:00Z'),
        participantes: ['editor@cronos.co'],
      });
    }).toThrow(ScheduleConflictException);
  });

  it('RN-03: debe PERMITIR compromisos en el mismo horario para USUARIOS DIFERENTES', () => {
    service.scheduleCommitment({
      userId: 'usuario_a@cronos.co',
      titulo: 'Reunión A',
      fechaInicio: new Date('2026-11-02T10:00:00Z'),
      fechaFin: new Date('2026-11-02T11:00:00Z'),
      participantes: ['usuario_a@cronos.co'],
    });

    // Mismo horario pero otro usuario
    const commB = service.scheduleCommitment({
      userId: 'usuario_b@cronos.co',
      titulo: 'Reunión B',
      fechaInicio: new Date('2026-11-02T10:00:00Z'),
      fechaFin: new Date('2026-11-02T11:00:00Z'),
      participantes: ['usuario_b@cronos.co'],
    });

    expect(commB).toBeDefined();
    expect(commB.titulo).toBe('Reunión B');
  });

  it('RN-03: debe PERMITIR compromisos que se solapan con un compromiso CANCELADO', () => {
    const original = service.scheduleCommitment({
      userId: 'creativo@cronos.co',
      titulo: 'Reunión Original',
      fechaInicio: new Date('2026-11-02T14:00:00Z'),
      fechaFin: new Date('2026-11-02T15:00:00Z'),
      participantes: ['creativo@cronos.co'],
    });

    service.cancelCommitment(original.id);
    expect(service.getCommitmentById(original.id)?.estado).toBe('CANCELADO');

    // Ahora se debe poder agendar en el mismo intervalo sin error
    const nuevo = service.scheduleCommitment({
      userId: 'creativo@cronos.co',
      titulo: 'Nueva Reunión en espacio liberado',
      fechaInicio: new Date('2026-11-02T14:00:00Z'),
      fechaFin: new Date('2026-11-02T15:00:00Z'),
      participantes: ['creativo@cronos.co'],
    });

    expect(nuevo).toBeDefined();
    expect(nuevo.titulo).toBe('Nueva Reunión en espacio liberado');
  });

  it('RN-04: scheduleCommitment debe rechazar compromisos con duración inferior a 15 min', () => {
    expect(() => {
      service.scheduleCommitment({
        userId: 'usuario@cronos.co',
        titulo: 'Muy breve',
        fechaInicio: new Date('2026-11-02T16:00:00Z'),
        fechaFin: new Date('2026-11-02T16:10:00Z'), // 10 min
        participantes: ['usuario@cronos.co'],
      });
    }).toThrow(TaskValidationException);
  });

  it('RN-05: scheduleCommitment debe rechazar compromisos con correos inválidos', () => {
    expect(() => {
      service.scheduleCommitment({
        userId: 'valido@cronos.co',
        titulo: 'Reunión con participante erróneo',
        fechaInicio: new Date('2026-11-02T16:00:00Z'),
        fechaFin: new Date('2026-11-02T16:30:00Z'),
        participantes: ['valido@cronos.co', 'correo..invalido@@'],
      });
    }).toThrow(TaskValidationException);
  });
});
