import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageTaskRepository } from '../src/repositories/task.repository';
import { LocalStorageCommitmentRepository } from '../src/repositories/commitment.repository';
import { Task } from '../src/domain/task';
import { Commitment } from '../src/domain/commitment';

describe('Capa de Repositorios Aislados', () => {
  let taskRepo: LocalStorageTaskRepository;
  let commRepo: LocalStorageCommitmentRepository;

  beforeEach(() => {
    taskRepo = new LocalStorageTaskRepository('test_tasks_db');
    commRepo = new LocalStorageCommitmentRepository('test_commitments_db');
    taskRepo.clear();
    commRepo.clear();
  });

  it('debe guardar y recuperar tareas del repositorio', () => {
    const task = new Task({
      titulo: 'Probar Repositorio',
      fechaVencimiento: new Date(Date.now() + 1000000),
      prioridad: 'MEDIA',
    });

    taskRepo.save(task);
    const retrieved = taskRepo.findById(task.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.titulo).toBe('Probar Repositorio');
    expect(retrieved?.prioridad).toBe('MEDIA');
  });

  it('debe listar todas las tareas y permitir eliminarlas', () => {
    const t1 = new Task({
      titulo: 'Tarea 1',
      fechaVencimiento: new Date(Date.now() + 1000000),
      prioridad: 'BAJA',
    });
    const t2 = new Task({
      titulo: 'Tarea 2',
      fechaVencimiento: new Date(Date.now() + 2000000),
      prioridad: 'ALTA',
    });

    taskRepo.save(t1);
    taskRepo.save(t2);
    expect(taskRepo.findAll().length).toBe(2);

    taskRepo.delete(t1.id);
    expect(taskRepo.findAll().length).toBe(1);
    expect(taskRepo.findById(t1.id)).toBeNull();
  });

  it('debe guardar y recuperar compromisos filtrados por usuario', () => {
    const comm1 = new Commitment({
      userId: 'creador@cronos.co',
      titulo: 'Reunión General',
      fechaInicio: new Date('2026-11-01T10:00:00Z'),
      fechaFin: new Date('2026-11-01T11:00:00Z'),
      participantes: ['creador@cronos.co', 'socio@cronos.co'],
    });

    const comm2 = new Commitment({
      userId: 'otro@cronos.co',
      titulo: 'Reunión Externa',
      fechaInicio: new Date('2026-11-02T10:00:00Z'),
      fechaFin: new Date('2026-11-02T11:00:00Z'),
      participantes: ['otro@cronos.co'],
    });

    commRepo.save(comm1);
    commRepo.save(comm2);

    const forUser = commRepo.findByUserId('creador@cronos.co');
    expect(forUser.length).toBe(1);
    expect(forUser[0]?.titulo).toBe('Reunión General');
  });
});
