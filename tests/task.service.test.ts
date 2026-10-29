import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '../src/services/task.service';
import { LocalStorageTaskRepository } from '../src/repositories/task.repository';
import { TaskValidationException } from '../src/domain/exceptions';

describe('TaskService: Reglas de Negocio RN-01, RN-02 y Consultas', () => {
  let repository: LocalStorageTaskRepository;
  let service: TaskService;
  const mockNow = new Date('2026-10-30T10:00:00Z');

  beforeEach(() => {
    repository = new LocalStorageTaskRepository('test_tasks_service_db');
    repository.clear();
    service = new TaskService(repository);
  });

  it('createTask: debe registrar una tarea con éxito cuando la fecha es válida', () => {
    const task = service.createTask(
      {
        titulo: 'Diseñar portada de catálogo',
        descripcion: 'Estilo editorial con tipografía Cinzel',
        fechaVencimiento: new Date('2026-10-30T18:00:00Z'),
        prioridad: 'ALTA',
        etiquetas: ['Diseño', 'Editorial'],
      },
      mockNow
    );

    expect(task.id).toBeDefined();
    expect(task.titulo).toBe('Diseñar portada de catálogo');
    expect(task.estado).toBe('PENDIENTE');

    const saved = service.getTaskById(task.id);
    expect(saved).not.toBeNull();
    expect(saved?.titulo).toBe('Diseñar portada de catálogo');
  });

  it('RN-01: createTask debe lanzar TaskValidationException si fechaVencimiento está en el pasado', () => {
    expect(() => {
      service.createTask(
        {
          titulo: 'Tarea vencida de origen',
          fechaVencimiento: new Date('2026-10-30T09:00:00Z'),
          prioridad: 'MEDIA',
        },
        mockNow
      );
    }).toThrow(TaskValidationException);
  });

  it('RN-02: updateTaskStatus debe impedir reabrir tareas COMPLETADAS', () => {
    const task = service.createTask(
      {
        titulo: 'Revisión final de pruebas',
        fechaVencimiento: new Date('2026-10-30T14:00:00Z'),
        prioridad: 'CRITICA',
      },
      mockNow
    );

    service.updateTaskStatus(task.id, 'EN_PROCESO');
    service.updateTaskStatus(task.id, 'COMPLETADA');

    expect(() => service.updateTaskStatus(task.id, 'PENDIENTE')).toThrow(TaskValidationException);
    expect(() => service.updateTaskStatus(task.id, 'EN_PROCESO')).toThrow(TaskValidationException);
  });

  it('RN-02: updateTaskStatus debe impedir reactivar tareas CANCELADAS', () => {
    const task = service.createTask(
      {
        titulo: 'Tarea a cancelar',
        fechaVencimiento: new Date('2026-10-30T14:00:00Z'),
        prioridad: 'BAJA',
      },
      mockNow
    );

    service.updateTaskStatus(task.id, 'CANCELADA');
    expect(() => service.updateTaskStatus(task.id, 'PENDIENTE')).toThrow(TaskValidationException);
  });

  it('getPendingTasksOverdue: debe retornar únicamente tareas pendientes cuya fecha ya pasó', () => {
    // Tarea 1: Vencida a las 11:00
    service.createTask(
      {
        titulo: 'Tarea vencida 1',
        fechaVencimiento: new Date('2026-10-30T11:00:00Z'),
        prioridad: 'ALTA',
      },
      mockNow
    );

    // Tarea 2: Vence a las 16:00 (Aún no vencida a las 12:00)
    service.createTask(
      {
        titulo: 'Tarea futura',
        fechaVencimiento: new Date('2026-10-30T16:00:00Z'),
        prioridad: 'MEDIA',
      },
      mockNow
    );

    // Tarea 3: Vencida a las 10:30 pero completada
    const t3 = service.createTask(
      {
        titulo: 'Tarea vencida pero completada',
        fechaVencimiento: new Date('2026-10-30T10:30:00Z'),
        prioridad: 'BAJA',
      },
      mockNow
    );
    service.updateTaskStatus(t3.id, 'COMPLETADA');

    const evaluationTime = new Date('2026-10-30T12:00:00Z');
    const overdue = service.getPendingTasksOverdue(evaluationTime);

    expect(overdue.length).toBe(1);
    expect(overdue[0]?.titulo).toBe('Tarea vencida 1');
  });
});
