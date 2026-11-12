import './style.css';
import { LocalStorageTaskRepository } from './repositories/task.repository';
import { LocalStorageCommitmentRepository } from './repositories/commitment.repository';
import { TaskService } from './services/task.service';
import { CommitmentService } from './services/commitment.service';
import { renderTaskCard, TASK_STATUS_LABEL, PRIORITY_LABEL } from './ui/components/task-card';
import { renderCommitmentCard, COMMITMENT_STATUS_LABEL } from './ui/components/commitment-card';
import { renderOfficialForm } from './ui/components/official-form';
import { renderAlertBanner } from './ui/components/alert-banner';
import { clear, el } from './ui/dom';
import { CommitmentStatus, Priority, TaskStatus } from './domain/types';

/* ───────────────────────── Composición de capas ───────────────────────── */
const taskService = new TaskService(new LocalStorageTaskRepository('cronos_tasks_db'));
const commitmentService = new CommitmentService(new LocalStorageCommitmentRepository('cronos_commitments_db'));

/* ───────────────────────── Estado de la vista ───────────────────────── */
type TaskFilter = 'TODAS' | TaskStatus | 'VENCIDAS';
type PriorityFilter = 'TODAS' | Priority;
type CommFilter = 'TODOS' | CommitmentStatus;

const view = {
  taskStatus: 'TODAS' as TaskFilter,
  taskPriority: 'TODAS' as PriorityFilter,
  commStatus: 'TODOS' as CommFilter,
};

const $ = (id: string) => document.getElementById(id) as HTMLElement;

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}

/* ───────────────────────── Avisos ───────────────────────── */
let alertTimer: number | undefined;
function showAlert(text: string, type: 'error' | 'success'): void {
  const zone = $('alert-zone');
  clear(zone);
  window.clearTimeout(alertTimer);
  zone.appendChild(renderAlertBanner(text, type, () => clear(zone)));
  if (type === 'success') alertTimer = window.setTimeout(() => clear(zone), 4500);
}

/* ───────────────────────── Datos de demostración ───────────────────────── */
function seedDemoDataIfEmpty(): void {
  const H = 3600_000;
  const now = Date.now();
  if (taskService.getAllTasks().length === 0 && commitmentService.getAllCommitments().length === 0) {
    taskService.createTask({
      titulo: 'Auditoría de tintas y pruebas litográficas',
      descripcion: 'Examinar la saturación de los pigmentos oliva y salvia sobre papel verjurado de 120 g.',
      fechaVencimiento: new Date(now + 20 * H),
      prioridad: 'CRITICA',
      etiquetas: ['Taller', 'Calidad'],
    });
    const enProceso = taskService.createTask({
      titulo: 'Composición tipográfica con Cinzel 14 pt',
      descripcion: 'Ajustar el interletraje de los títulos principales de la edición de lujo.',
      fechaVencimiento: new Date(now + 44 * H),
      prioridad: 'ALTA',
      etiquetas: ['Tipografía', 'Diseño'],
    });
    taskService.updateTaskStatus(enProceso.id, 'EN_PROCESO');
    taskService.createTask({
      titulo: 'Inventario de papeles y cartulinas',
      fechaVencimiento: new Date(now + 72 * H),
      prioridad: 'MEDIA',
      etiquetas: ['Almacén'],
    });
    const hecha = taskService.createTask({
      titulo: 'Enviar galeras corregidas al autor',
      fechaVencimiento: new Date(now + 6 * H),
      prioridad: 'BAJA',
      etiquetas: ['Correspondencia'],
    });
    taskService.updateTaskStatus(hecha.id, 'COMPLETADA');

    const start1 = new Date(now + 30 * H); start1.setMinutes(0, 0, 0);
    commitmentService.scheduleCommitment({
      userId: 'editor@cronos.co',
      titulo: 'Mesa redonda: preservación de oficios gráficos',
      descripcion: 'Encuentro con encuadernadores y maestros tipógrafos para el lanzamiento del catálogo.',
      fechaInicio: start1,
      fechaFin: new Date(start1.getTime() + 1.5 * H),
      ubicacion: 'Salón de Prensa Histórica, Carrera 7 # 12-42',
      participantes: ['editor@cronos.co', 'maestro.impresor@cronos.co', 'archivista@museo.org'],
      minutosRecordatorio: 30,
    });
    const start2 = new Date(now + 54 * H); start2.setMinutes(30, 0, 0);
    const confirmado = commitmentService.scheduleCommitment({
      userId: 'editor@cronos.co',
      titulo: 'Revisión de pruebas de color',
      fechaInicio: start2,
      fechaFin: new Date(start2.getTime() + 0.75 * H),
      ubicacion: 'https://meet.cronos.co/pruebas',
      participantes: ['editor@cronos.co', 'colorista@cronos.co'],
    });
    commitmentService.confirmCommitment(confirmado.id);
  }
}

/* ───────────────────────── Filtros ───────────────────────── */
function renderFilterBar<T extends string>(
  containerId: string,
  options: { value: T; label: string; count?: number }[],
  current: T,
  onPick: (value: T) => void
): void {
  const bar = $(containerId);
  clear(bar);
  options.forEach(opt => {
    bar.appendChild(el('button', {
      className: `filter-chip${opt.value === current ? ' is-active' : ''}`,
      attrs: { type: 'button', 'aria-pressed': String(opt.value === current) },
      on: { click: () => onPick(opt.value) },
    }, [
      opt.label,
      opt.count !== undefined ? el('span', { className: 'filter-count', text: String(opt.count) }) : null,
    ]));
  });
}

function emptyState(glyph: string, title: string, hint: string): HTMLElement {
  return el('div', { className: 'empty-state' }, [
    el('span', { className: 'empty-state-icon', text: glyph, attrs: { 'aria-hidden': 'true' } }),
    el('p', { className: 'empty-state-text', text: title }),
    el('span', { className: 'empty-state-hint', text: hint }),
  ]);
}

/* ───────────────────────── Render reactivo ───────────────────────── */
function refreshUI(): void {
  const now = new Date();
  const tasks = taskService.getAllTasks();
  const overdue = taskService.getPendingTasksOverdue(now);
  const commitments = commitmentService.getAllCommitments();
  const activeComm = commitments.filter(c => c.estado !== 'CANCELADO');

  // Libro de registro lateral
  $('stat-active-tasks').textContent = String(tasks.filter(t => t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO').length);
  $('stat-overdue-tasks').textContent = String(overdue.length);
  $('ledger-overdue').classList.toggle('is-alert', overdue.length > 0);
  $('stat-done-tasks').textContent = String(tasks.filter(t => t.estado === 'COMPLETADA').length);
  $('stat-active-comm').textContent = String(activeComm.length);
  $('nav-count-tasks').textContent = String(tasks.length);
  $('nav-count-comm').textContent = String(commitments.length);

  // Filtros de tareas
  const countBy = (s: TaskStatus) => tasks.filter(t => t.estado === s).length;
  renderFilterBar<TaskFilter>('filter-task-status', [
    { value: 'TODAS', label: 'Todas', count: tasks.length },
    ...(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map(s => ({ value: s as TaskFilter, label: TASK_STATUS_LABEL[s], count: countBy(s) })),
    { value: 'VENCIDAS', label: 'Vencidas', count: overdue.length },
  ], view.taskStatus, v => { view.taskStatus = v; refreshUI(); });

  renderFilterBar<PriorityFilter>('filter-task-priority', [
    { value: 'TODAS', label: 'Toda prioridad' },
    ...(['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as Priority[]).map(p => ({ value: p as PriorityFilter, label: PRIORITY_LABEL[p] })),
  ], view.taskPriority, v => { view.taskPriority = v; refreshUI(); });

  const visibleTasks = tasks.filter(t => {
    const statusOk = view.taskStatus === 'TODAS'
      || (view.taskStatus === 'VENCIDAS' ? t.isPendingAndOverdue(now) : t.estado === view.taskStatus);
    const prioOk = view.taskPriority === 'TODAS' || t.prioridad === view.taskPriority;
    return statusOk && prioOk;
  });

  $('counter-tasks').textContent = visibleTasks.length === tasks.length
    ? `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}`
    : `${visibleTasks.length} de ${tasks.length}`;

  const tasksContainer = $('tasks-container');
  clear(tasksContainer);
  if (visibleTasks.length === 0) {
    tasksContainer.appendChild(tasks.length === 0
      ? emptyState('✍\uFE0E', 'Aún no hay tareas en el cuaderno.', 'Registra la primera desde el formulario oficial de alta.')
      : emptyState('✦', 'Ninguna tarea coincide con el filtro.', 'Prueba con otro estado o prioridad.'));
  } else {
    visibleTasks.forEach(task => tasksContainer.appendChild(renderTaskCard(task, {
      onStatusChange: (id, newStatus) => {
        try {
          taskService.updateTaskStatus(id, newStatus);
          showAlert(`Estado actualizado a «${TASK_STATUS_LABEL[newStatus]}».`, 'success');
        } catch (err) {
          showAlert(message(err), 'error');
        }
        refreshUI();
      },
      onDelete: (id) => {
        if (!window.confirm('¿Eliminar definitivamente esta tarea del registro?')) return;
        taskService.deleteTask(id);
        showAlert('Tarea eliminada del registro.', 'success');
        refreshUI();
      },
    }, now)));
  }

  // Filtros de compromisos
  renderFilterBar<CommFilter>('filter-comm-status', [
    { value: 'TODOS', label: 'Todos', count: commitments.length },
    ...(Object.keys(COMMITMENT_STATUS_LABEL) as CommitmentStatus[]).map(s => ({
      value: s as CommFilter,
      label: COMMITMENT_STATUS_LABEL[s],
      count: commitments.filter(c => c.estado === s).length,
    })),
  ], view.commStatus, v => { view.commStatus = v; refreshUI(); });

  const visibleComm = commitments.filter(c => view.commStatus === 'TODOS' || c.estado === view.commStatus);
  $('counter-comm').textContent = visibleComm.length === commitments.length
    ? `${commitments.length} ${commitments.length === 1 ? 'compromiso' : 'compromisos'}`
    : `${visibleComm.length} de ${commitments.length}`;

  const commContainer = $('commitments-container');
  clear(commContainer);
  if (visibleComm.length === 0) {
    commContainer.appendChild(commitments.length === 0
      ? emptyState('❖', 'No hay compromisos agendados.', 'Agenda uno desde el formulario oficial de alta.')
      : emptyState('✦', 'Ningún compromiso coincide con el filtro.', 'Prueba con otro estado.'));
  } else {
    visibleComm.forEach(comm => commContainer.appendChild(renderCommitmentCard(comm, {
      onConfirm: (id) => {
        try {
          commitmentService.confirmCommitment(id);
          showAlert('Compromiso confirmado.', 'success');
        } catch (err) {
          showAlert(message(err), 'error');
        }
        refreshUI();
      },
      onCancel: (id) => {
        if (!window.confirm('¿Cancelar formalmente este compromiso?')) return;
        try {
          commitmentService.cancelCommitment(id);
          showAlert('Compromiso cancelado. Su franja horaria queda libre.', 'success');
        } catch (err) {
          showAlert(message(err), 'error');
        }
        refreshUI();
      },
      onDelete: (id) => {
        if (!window.confirm('¿Retirar este compromiso del libro de registros?')) return;
        commitmentService.deleteCommitment(id);
        showAlert('Compromiso retirado del registro.', 'success');
        refreshUI();
      },
    })));
  }
}

/* ───────────────────────── Navegación ───────────────────────── */
function setupNavigation(form: { showTab: (t: 'task' | 'commitment') => void }): void {
  const toggle = document.querySelector('.menu-toggle') as HTMLButtonElement;
  const sidebar = document.querySelector('.sidebar') as HTMLElement;
  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-link'));
  links.forEach(link => link.addEventListener('click', () => {
    sidebar.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (link.hash === '#compromisos') form.showTab('commitment');
    if (link.hash === '#tareas') form.showTab('task');
  }));

  // Resalta la sección visible. Tareas y Compromisos comparten fila en escritorio:
  // ante empate gana la primera en el orden del documento.
  const sections = ['panel', 'tareas', 'compromisos', 'alta'].map(id => $(id));
  let ticking = false;
  const syncActive = () => {
    ticking = false;
    const marker = window.innerHeight * 0.35;
    let current = sections[0]!;
    let currentTop = -Infinity;
    sections.forEach(sec => {
      const top = Math.round(sec.getBoundingClientRect().top);
      if (top <= marker && top > currentTop) { current = sec; currentTop = top; }
    });
    links.forEach(l => l.classList.toggle('is-active', l.hash === `#${current.id}`));
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; window.requestAnimationFrame(syncActive); }
  }, { passive: true });
  syncActive();

  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  $('today-label').textContent = `Edición del ${today}`;
}

/* ───────────────────────── Arranque ───────────────────────── */
function initApp(): void {
  try {
    seedDemoDataIfEmpty();
  } catch (err) {
    console.warn('No se pudieron sembrar datos de demostración:', err);
  }

  const form = renderOfficialForm({
    onCreateTask: (dto) => {
      try {
        taskService.createTask(dto);
        showAlert(`Tarea «${dto.titulo.trim()}» registrada en el cuaderno.`, 'success');
        refreshUI();
        return true;
      } catch (err) {
        showAlert(message(err), 'error');
        return false;
      }
    },
    onCreateCommitment: (dto) => {
      try {
        commitmentService.scheduleCommitment(dto);
        showAlert(`Compromiso «${dto.titulo.trim()}» agendado sin cruces de horario.`, 'success');
        refreshUI();
        return true;
      } catch (err) {
        showAlert(message(err), 'error');
        return false;
      }
    },
  });

  $('form-mount-point').appendChild(form.element);
  setupNavigation(form);
  refreshUI();

  // Reevalúa vencimientos cada minuto sin recargar.
  window.setInterval(refreshUI, 60_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
