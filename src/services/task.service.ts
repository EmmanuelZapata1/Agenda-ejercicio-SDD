import { Task } from '../domain/task';
import { CreateTaskDTO, TaskStatus } from '../domain/types';
import { ITaskRepository } from '../repositories/task.repository';
import { TaskValidationException } from '../domain/exceptions';

export class TaskService {
  private readonly repository: ITaskRepository;

  constructor(repository: ITaskRepository) {
    this.repository = repository;
  }

  /**
   * Registra una nueva tarea validando RN-01.
   */
  public createTask(dto: CreateTaskDTO, now: Date = new Date()): Task {
    const task = new Task(
      {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        fechaVencimiento: dto.fechaVencimiento,
        prioridad: dto.prioridad,
        etiquetas: dto.etiquetas,
      },
      now
    );

    this.repository.save(task);
    return task;
  }

  /**
   * Actualiza el estado de una tarea aplicando restricciones de no reversibilidad RN-02.
   */
  public updateTaskStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.repository.findById(id);
    if (!task) {
      throw new TaskValidationException(`No se encontró la tarea con ID '${id}'.`);
    }

    task.changeStatus(newStatus);
    this.repository.save(task);
    return task;
  }

  /**
   * Consulta las tareas en estado PENDIENTE cuya fecha de vencimiento sea previa a 'now'.
   */
  public getPendingTasksOverdue(now: Date = new Date()): Task[] {
    const all = this.repository.findAll();
    return all.filter(t => t.isPendingAndOverdue(now));
  }

  /**
   * Retorna todas las tareas registradas ordenadas por fecha de vencimiento.
   */
  public getAllTasks(): Task[] {
    return this.repository.findAll().sort(
      (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime()
    );
  }

  public getTaskById(id: string): Task | null {
    return this.repository.findById(id);
  }

  public deleteTask(id: string): boolean {
    return this.repository.delete(id);
  }
}
