import { Task } from '../../domain/task';
import { TaskStatus, Priority } from '../../domain/types';
import { el } from '../dom';
import { formatDateTime, shortId } from '../format';

export interface TaskCardCallbacks {
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onDelete: (id: string) => void;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

const TERMINAL: TaskStatus[] = ['COMPLETADA', 'CANCELADA'];

/** RN-02: un estado terminal no puede volver a PENDIENTE ni EN_PROCESO. */
function isTransitionAllowed(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return !(TERMINAL.includes(from) && (to === 'PENDIENTE' || to === 'EN_PROCESO'));
}

export function taskStatusBadge(status: TaskStatus): HTMLElement {
  const badge = el('span', { className: `status-badge status-${status}` });
  if (status === 'PENDIENTE') badge.appendChild(el('span', { className: 'status-dot', attrs: { 'aria-hidden': 'true' } }));
  if (status === 'COMPLETADA') badge.appendChild(el('span', { className: 'status-check', text: '✓', attrs: { 'aria-hidden': 'true' } }));
  badge.appendChild(document.createTextNode(TASK_STATUS_LABEL[status]));
  return badge;
}

export function renderTaskCard(task: Task, callbacks: TaskCardCallbacks, now: Date = new Date()): HTMLElement {
  const overdue = task.isPendingAndOverdue(now);

  const select = el('select', {
    className: 'status-select',
    attrs: { 'aria-label': `Cambiar estado de "${task.titulo}"` },
    on: {
      change: (e) => callbacks.onStatusChange(task.id, (e.target as HTMLSelectElement).value as TaskStatus),
    },
  });
  (Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).forEach(status => {
    const option = el('option', { text: TASK_STATUS_LABEL[status], attrs: { value: status } });
    option.selected = status === task.estado;
    option.disabled = !isTransitionAllowed(task.estado, status);
    select.appendChild(option);
  });

  const isTerminal = TERMINAL.includes(task.estado);

  return el('article', {
    className: `entity-card task-card${overdue ? ' is-overdue' : ''}${task.estado === 'CANCELADA' ? ' is-cancelled' : ''}`,
    id: `task-${task.id}`,
    attrs: { 'data-status': task.estado, 'data-priority': task.prioridad },
  }, [
    el('header', { className: 'card-top-bar' }, [
      el('span', { className: 'card-uuid', title: task.id, text: `ID · ${shortId(task.id)}` }),
      el('span', {
        className: `priority-badge priority-${task.prioridad}`,
        text: PRIORITY_LABEL[task.prioridad],
        attrs: { 'aria-label': `Prioridad ${PRIORITY_LABEL[task.prioridad]}` },
      }),
    ]),
    el('h3', { className: 'card-title', text: task.titulo }),
    task.descripcion ? el('p', { className: 'card-desc', text: task.descripcion }) : null,
    el('dl', { className: 'card-metadata' }, [
      el('div', { className: `meta-item${overdue ? ' overdue' : ''}` }, [
        el('dt', { text: 'Vence' }),
        el('dd', {}, [
          el('time', { text: formatDateTime(task.fechaVencimiento), attrs: { datetime: task.fechaVencimiento.toISOString() } }),
          overdue ? el('span', { className: 'overdue-flag', text: 'Vencida' }) : null,
        ]),
      ]),
    ]),
    task.etiquetas.length > 0
      ? el('ul', { className: 'tag-list', attrs: { 'aria-label': 'Etiquetas' } },
          task.etiquetas.map(t => el('li', { className: 'tag-chip', text: `#${t}` })))
      : null,
    el('footer', { className: 'card-actions-bar' }, [
      taskStatusBadge(task.estado),
      el('div', { className: 'card-actions' }, [
        isTerminal && task.estado === 'CANCELADA' ? null : select,
        el('button', {
          className: 'btn-icon',
          text: '✕',
          title: 'Eliminar tarea',
          attrs: { type: 'button', 'aria-label': `Eliminar tarea "${task.titulo}"` },
          on: { click: () => callbacks.onDelete(task.id) },
        }),
      ]),
    ]),
  ]);
}
