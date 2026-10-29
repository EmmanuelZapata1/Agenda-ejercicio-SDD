import { describe, it, expect } from 'vitest';
import { Task } from '../src/domain/task';
import { Commitment } from '../src/domain/commitment';
import { TaskValidationException } from '../src/domain/exceptions';

describe('Capa de Dominio: Entidad Task', () => {
  const refNow = new Date('2026-10-30T10:00:00Z');

  it('debe crear una tarea válida correctamente', () => {
    const task = new Task(
      {
        titulo: 'Revisar informe de auditoría',
        descripcion: 'Verificar los balances trimestrales',
        fechaVencimiento: new Date('2026-10-30T15:00:00Z'),
        prioridad: 'ALTA',
        etiquetas: ['Auditoría', 'Finanzas'],
      },
      refNow
    );

    expect(task.id).toBeDefined();
    expect(task.titulo).toBe('Revisar informe de auditoría');
    expect(task.prioridad).toBe('ALTA');
    expect(task.estado).toBe('PENDIENTE');
    expect(task.etiquetas).toEqual(['Auditoría', 'Finanzas']);
  });

  it('RN-01: debe lanzar TaskValidationException si la fecha de vencimiento está en el pasado', () => {
    const pastDate = new Date('2026-10-30T09:00:00Z');
    expect(() => {
      new Task(
        {
          titulo: 'Tarea en el pasado',
          fechaVencimiento: pastDate,
          prioridad: 'MEDIA',
        },
        refNow
      );
    }).toThrow(TaskValidationException);
  });

  it('RN-02: una tarea COMPLETADA no puede cambiar a EN_PROCESO ni a PENDIENTE', () => {
    const task = new Task(
      {
        titulo: 'Tarea terminada',
        fechaVencimiento: new Date('2026-10-30T12:00:00Z'),
        prioridad: 'BAJA',
        estado: 'COMPLETADA',
      },
      refNow
    );

    expect(() => task.changeStatus('EN_PROCESO')).toThrow(TaskValidationException);
    expect(() => task.changeStatus('PENDIENTE')).toThrow(TaskValidationException);
  });

  it('RN-02: una tarea CANCELADA no puede cambiar a EN_PROCESO ni a PENDIENTE', () => {
    const task = new Task(
      {
        titulo: 'Tarea cancelada',
        fechaVencimiento: new Date('2026-10-30T12:00:00Z'),
        prioridad: 'BAJA',
        estado: 'CANCELADA',
      },
      refNow
    );

    expect(() => task.changeStatus('EN_PROCESO')).toThrow(TaskValidationException);
    expect(() => task.changeStatus('PENDIENTE')).toThrow(TaskValidationException);
  });

  it('debe permitir transiciones válidas: PENDIENTE -> EN_PROCESO -> COMPLETADA', () => {
    const task = new Task(
      {
        titulo: 'Tarea flujo normal',
        fechaVencimiento: new Date('2026-10-30T12:00:00Z'),
        prioridad: 'MEDIA',
      },
      refNow
    );

    expect(task.estado).toBe('PENDIENTE');
    task.changeStatus('EN_PROCESO');
    expect(task.estado).toBe('EN_PROCESO');
    task.changeStatus('COMPLETADA');
    expect(task.estado).toBe('COMPLETADA');
  });

  it('debe detectar correctamente si una tarea está pendiente y vencida', () => {
    const task = new Task(
      {
        titulo: 'Tarea por vencer',
        fechaVencimiento: new Date('2026-10-30T11:00:00Z'),
        prioridad: 'CRITICA',
      },
      refNow
    );

    expect(task.isPendingAndOverdue(new Date('2026-10-30T10:30:00Z'))).toBe(false);
    expect(task.isPendingAndOverdue(new Date('2026-10-30T11:01:00Z'))).toBe(true);
  });
});

describe('Capa de Dominio: Entidad Commitment', () => {
  it('debe crear un compromiso válido con participantes válidos', () => {
    const comm = new Commitment({
      titulo: 'Comité Editorial Litográfico',
      fechaInicio: new Date('2026-11-01T10:00:00Z'),
      fechaFin: new Date('2026-11-01T11:00:00Z'),
      participantes: ['editor@cronos.co', 'disenador@cronos.co'],
      ubicacion: 'Sala Aurora',
    });

    expect(comm.id).toBeDefined();
    expect(comm.titulo).toBe('Comité Editorial Litográfico');
    expect(comm.durationMinutes).toBe(60);
    expect(comm.participantes).toEqual(['editor@cronos.co', 'disenador@cronos.co']);
    expect(comm.estado).toBe('PROGRAMADO');
  });

  it('RN-04: debe lanzar TaskValidationException si la duración es menor a 15 minutos', () => {
    expect(() => {
      new Commitment({
        titulo: 'Reunión relámpago',
        fechaInicio: new Date('2026-11-01T10:00:00Z'),
        fechaFin: new Date('2026-11-01T10:14:00Z'), // 14 min
        participantes: ['contacto@cronos.co'],
      });
    }).toThrow(TaskValidationException);
  });

  it('RN-05: debe lanzar TaskValidationException si algún participante tiene correo RFC 5322 inválido', () => {
    expect(() => {
      new Commitment({
        titulo: 'Reunión sin correos válidos',
        fechaInicio: new Date('2026-11-01T10:00:00Z'),
        fechaFin: new Date('2026-11-01T10:30:00Z'),
        participantes: ['correo-invalido'],
      });
    }).toThrow(TaskValidationException);
  });

  it('RN-05: debe lanzar TaskValidationException si la lista de participantes está vacía', () => {
    expect(() => {
      new Commitment({
        titulo: 'Reunión sin asistentes',
        fechaInicio: new Date('2026-11-01T10:00:00Z'),
        fechaFin: new Date('2026-11-01T10:30:00Z'),
        participantes: [],
      });
    }).toThrow(TaskValidationException);
  });

  it('RN-03: debe verificar solapamiento temporal correctamente', () => {
    const comm = new Commitment({
      titulo: 'Compromiso Existente',
      fechaInicio: new Date('2026-11-01T10:00:00Z'),
      fechaFin: new Date('2026-11-01T11:00:00Z'),
      participantes: ['usuario@cronos.co'],
    });

    // Caso solapado total
    expect(
      comm.overlapsWith(new Date('2026-11-01T10:15:00Z'), new Date('2026-11-01T10:45:00Z'))
    ).toBe(true);

    // Caso solapado inicio
    expect(
      comm.overlapsWith(new Date('2026-11-01T09:30:00Z'), new Date('2026-11-01T10:30:00Z'))
    ).toBe(true);

    // Caso solapado fin
    expect(
      comm.overlapsWith(new Date('2026-11-01T10:30:00Z'), new Date('2026-11-01T11:30:00Z'))
    ).toBe(true);

    // Caso contiguo (sin solapamiento: inicio coincide con fin anterior)
    expect(
      comm.overlapsWith(new Date('2026-11-01T11:00:00Z'), new Date('2026-11-01T12:00:00Z'))
    ).toBe(false);

    // Caso completamente anterior
    expect(
      comm.overlapsWith(new Date('2026-11-01T08:00:00Z'), new Date('2026-11-01T09:00:00Z'))
    ).toBe(false);
  });
});
