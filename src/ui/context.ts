import { TaskService } from '../services/task.service';
import { CommitmentService } from '../services/commitment.service';
import { CommitmentStatus, Priority, TaskStatus } from '../domain/types';
import { Route } from './router';

export type TaskFilter = 'TODAS' | TaskStatus | 'VENCIDAS';
export type PriorityFilter = 'TODAS' | Priority;
export type CommFilter = 'TODOS' | CommitmentStatus;

/** Estado de vista que sobrevive al cambiar de página (filtros y búsqueda). */
export interface ViewState {
  taskStatus: TaskFilter;
  taskPriority: PriorityFilter;
  taskQuery: string;
  commStatus: CommFilter;
  commQuery: string;
  /** Id recién creado para resaltarlo al volver a la lista. */
  highlightId: string | null;
}

export interface AppContext {
  tasks: TaskService;
  commitments: CommitmentService;
  view: ViewState;
  navigate: (route: Route) => void;
  toast: (message: string, type: 'error' | 'success') => void;
  /** Actualiza contadores de la barra lateral tras cualquier cambio de datos. */
  refreshChrome: () => void;
}

export function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Ocurrió un error inesperado.';
  // Quita los prefijos técnicos de las excepciones para mostrar un texto claro.
  return err.message
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    // Las fechas ISO internas (2026-11-13T17:00:00.000Z) confunden: se omiten.
    .replace(/\s*\([^)]*\d{4}-\d{2}-\d{2}T[^)]*\)/g, '');
}
