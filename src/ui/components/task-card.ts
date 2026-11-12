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

export function taskStatusBadge(status: TaskStatus): HTMLElement {
  const badge = el('span', { className: `status-badge status-${status}` });
  if (status === 'PENDIENTE') badge.appendChild(el('span', { className: 'status-dot', attrs: { 'aria-hidden': 'true' } }));
  if (status === 'COMPLETADA') badge.appendChild(el('span', { className: 'status-check', text: '✓', attrs: { 'aria-hidden': 'true' } }));
  badge.appendChild(document.createTextNode(TASK_STATUS_LABEL[status]));
  return badge;
}

export function renderTaskCard(task: Task, callbacks: TaskCardCallbacks, now: Date = new Date()): HTMLElement {
  const overdue = task.isPendingAndOverdue(now);

  // Acciones claras según el estado actual (RN-02: los estados terminales no retroceden).
  const action = (label: string, to: TaskStatus, variant = '') => el('button', {
    className: `btn-chip${variant}`,
    text: label,
    attrs: { type: 'button' },
    on: { click: () => callbacks.onStatusChange(task.id, to) },
  });
  const actions: HTMLElement[] = [];
  if (task.estado === 'PENDIENTE') actions.push(action('Iniciar', 'EN_PROCESO'), action('Completar', 'COMPLETADA', ' btn-chip-solid'));
  if (task.estado === 'EN_PROCESO') actions.push(action('Completar', 'COMPLETADA', ' btn-chip-solid'));
  if (task.estado === 'PENDIENTE' || task.estado === 'EN_PROCESO') actions.push(action('Cancelar', 'CANCELADA', ' btn-chip-danger'));

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
        ...actions,
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
