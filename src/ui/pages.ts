/**
 * Páginas de la aplicación. Cada sección vive en su propia página:
 * Inicio · Tareas · Compromisos · Nueva tarea · Nuevo compromiso.
 */
import { Task } from '../domain/task';
import { Commitment } from '../domain/commitment';
import { Priority, TaskStatus, CommitmentStatus } from '../domain/types';
import { AppContext, CommFilter, PriorityFilter, TaskFilter, errorMessage } from './context';
import { clear, el } from './dom';
import { formatDateTime, formatDayMonth, formatTime, matchesQuery } from './format';
import { hrefFor, Route } from './router';
import { renderTaskCard, taskStatusBadge, TASK_STATUS_LABEL, PRIORITY_LABEL } from './components/task-card';
import { renderCommitmentCard, COMMITMENT_STATUS_LABEL } from './components/commitment-card';
import { renderTaskForm, renderCommitmentForm } from './components/forms';

const CREATOR_KEY = 'cronos_last_creator';

/* ═════════════════════ Piezas comunes ═════════════════════ */

function link(route: Route, text: string, className: string, glyph?: string): HTMLAnchorElement {
  return el('a', { className, attrs: { href: hrefFor(route) } }, [
    glyph ? el('span', { text: glyph, attrs: { 'aria-hidden': 'true' } }) : null,
    text,
  ]);
}

function pageHeader(opts: {
  crumbs?: { label: string; route?: Route }[];
  title: string;
  subtitle: string;
  actions?: HTMLElement[];
}): HTMLElement {
  return el('header', { className: 'page-header' }, [
    opts.crumbs
      ? el('nav', { className: 'breadcrumb', attrs: { 'aria-label': 'Ruta' } }, opts.crumbs.flatMap((c, i) => [
          i > 0 ? el('span', { className: 'crumb-sep', text: '/', attrs: { 'aria-hidden': 'true' } }) : null,
          c.route
            ? el('a', { className: 'crumb', text: c.label, attrs: { href: hrefFor(c.route) } })
            : el('span', { className: 'crumb is-current', text: c.label, attrs: { 'aria-current': 'page' } }),
        ]))
      : null,
    el('div', { className: 'page-header-row' }, [
      el('div', { className: 'page-header-text' }, [
        el('h1', { className: 'page-title', text: opts.title, attrs: { tabindex: -1 } }),
        el('p', { className: 'page-subtitle', text: opts.subtitle }),
      ]),
      opts.actions && opts.actions.length ? el('div', { className: 'page-actions' }, opts.actions) : null,
    ]),
    el('div', { className: 'ornament-rule', attrs: { 'aria-hidden': 'true' } }, [el('span', { text: '✦' })]),
  ]);
}

function searchField(id: string, label: string, placeholder: string, value: string, onChange: (q: string) => void): HTMLElement {
  const input = el('input', {
    id,
    className: 'search-input',
    attrs: { type: 'search', autocomplete: 'off', placeholder, 'data-search': 'true' },
  });
  input.value = value;
  const clearBtn = el('button', { className: 'search-clear', text: '✕', attrs: { type: 'button', 'aria-label': 'Limpiar búsqueda' } });
  clearBtn.hidden = value === '';

  let timer: number | undefined;
  const apply = () => { clearBtn.hidden = input.value === ''; onChange(input.value); };
  input.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(apply, 120); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { input.value = ''; apply(); } });
  clearBtn.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });

  return el('div', { className: 'search-bar', attrs: { role: 'search' } }, [
    el('label', { className: 'search-label', text: label, attrs: { for: id } }),
    el('div', { className: 'search-field' }, [
      el('span', { className: 'search-icon', text: '⌕', attrs: { 'aria-hidden': 'true' } }),
      input,
      clearBtn,
      el('kbd', { className: 'search-kbd', text: '/', title: 'Atajo: pulsa / para buscar' }),
    ]),
  ]);
}

function filterBar<T extends string>(
  label: string,
  options: { value: T; label: string; count?: number }[],
  current: T,
  onPick: (value: T) => void,
  small = false
): HTMLElement {
  return el('div', { className: `filter-group${small ? ' is-small' : ''}` }, [
    el('span', { className: 'filter-label', text: label }),
    el('div', { className: 'filter-bar', attrs: { role: 'group', 'aria-label': label } }, options.map(opt =>
      el('button', {
        className: `filter-chip${opt.value === current ? ' is-active' : ''}`,
        attrs: { type: 'button', 'aria-pressed': String(opt.value === current), 'data-value': opt.value },
        on: { click: () => onPick(opt.value) },
      }, [opt.label, opt.count !== undefined ? el('span', { className: 'filter-count', text: String(opt.count) }) : null])
    )),
  ]);
}

function emptyState(glyph: string, title: string, hint: string, action?: HTMLElement): HTMLElement {
  return el('div', { className: 'empty-state' }, [
    el('span', { className: 'empty-state-icon', text: glyph, attrs: { 'aria-hidden': 'true' } }),
    el('p', { className: 'empty-state-text', text: title }),
    el('span', { className: 'empty-state-hint', text: hint }),
    action ?? null,
  ]);
}

/** Re-renderiza una zona conservando el foco del chip pulsado. */
function keepFocus(container: HTMLElement, render: () => void): void {
  const active = document.activeElement as HTMLElement | null;
  const value = active?.dataset?.value;
  const groupLabel = active?.closest('.filter-bar')?.getAttribute('aria-label');
  render();
  if (value && groupLabel) {
    container.querySelector<HTMLElement>(`.filter-bar[aria-label="${groupLabel}"] [data-value="${value}"]`)?.focus();
  }
}

function flashHighlight(ctx: AppContext, container: HTMLElement): void {
  if (!ctx.view.highlightId) return;
  const card = container.querySelector<HTMLElement>(`[id$="${ctx.view.highlightId}"]`);
  ctx.view.highlightId = null;
  if (!card) return;
  card.classList.add('is-new');
  window.setTimeout(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
}

/* ═════════════════════ Inicio ═════════════════════ */

export function renderHomePage(ctx: AppContext): HTMLElement {
  const now = new Date();
  const tasks = ctx.tasks.getAllTasks();
  const overdue = ctx.tasks.getPendingTasksOverdue(now);
  const commitments = ctx.commitments.getAllCommitments();
  const count = (s: TaskStatus) => tasks.filter(t => t.estado === s).length;

  const goTasks = (status: TaskFilter) => () => {
    ctx.view.taskStatus = status;
    ctx.view.taskPriority = 'TODAS';
    ctx.view.taskQuery = '';
    ctx.navigate('tareas');
  };
  const goComm = (status: CommFilter) => () => {
    ctx.view.commStatus = status;
    ctx.view.commQuery = '';
    ctx.navigate('compromisos');
  };

  const statCard = (label: string, value: number, hint: string, onClick: () => void, tone = '') =>
    el('button', { className: `stat-card${tone ? ` ${tone}` : ''}`, attrs: { type: 'button' }, on: { click: onClick } }, [
      el('span', { className: 'stat-value', text: String(value) }),
      el('span', { className: 'stat-label', text: label }),
      el('span', { className: 'stat-hint', text: hint }),
    ]);

  const upcomingTasks = tasks
    .filter(t => t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO')
    .slice(0, 4);
  const upcomingComm = commitments
    .filter(c => c.estado !== 'CANCELADO' && c.fechaFin.getTime() >= now.getTime())
    .slice(0, 4);

  const taskRow = (t: Task) => el('li', { className: `mini-row${t.isPendingAndOverdue(now) ? ' is-overdue' : ''}` }, [
    el('span', { className: `priority-dot priority-${t.prioridad}`, title: `Prioridad ${PRIORITY_LABEL[t.prioridad]}` }),
    el('div', { className: 'mini-main' }, [
      el('span', { className: 'mini-title', text: t.titulo }),
      el('span', { className: 'mini-meta', text: `${t.isPendingAndOverdue(now) ? 'Venció' : 'Vence'} ${formatDateTime(t.fechaVencimiento)}` }),
    ]),
    taskStatusBadge(t.estado),
  ]);

  const commRow = (c: Commitment) => {
    const d = formatDayMonth(c.fechaInicio);
    return el('li', { className: 'mini-row' }, [
      el('span', { className: 'mini-date' }, [el('strong', { text: d.day }), el('small', { text: d.month })]),
      el('div', { className: 'mini-main' }, [
        el('span', { className: 'mini-title', text: c.titulo }),
        el('span', { className: 'mini-meta', text: `${formatTime(c.fechaInicio)} – ${formatTime(c.fechaFin)}${c.ubicacion ? ` · ${c.ubicacion}` : ''}` }),
      ]),
      el('span', { className: `status-badge cstatus-${c.estado}`, text: COMMITMENT_STATUS_LABEL[c.estado] }),
    ]);
  };

  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);

  return el('div', { className: 'page page-home' }, [
    el('p', { className: 'page-eyebrow', text: `Edición del ${today}` }),
    pageHeader({
      title: 'Cuaderno de Tareas & Compromisos',
      subtitle: 'Un vistazo a lo pendiente y a lo que viene.',
      actions: [
        link('nueva-tarea', 'Nueva tarea', 'btn-primary', '+'),
        link('nuevo-compromiso', 'Nuevo compromiso', 'btn-secondary', '+'),
      ],
    }),
    overdue.length > 0
      ? el('div', { className: 'overdue-callout', attrs: { role: 'status' } }, [
          el('span', { className: 'alert-icon', text: '!', attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: overdue.length === 1 ? 'Tienes 1 tarea vencida.' : `Tienes ${overdue.length} tareas vencidas.` }),
          el('button', { className: 'btn-chip btn-chip-danger', text: 'Ver vencidas', attrs: { type: 'button' }, on: { click: goTasks('VENCIDAS') } }),
        ])
      : null,
    el('section', { className: 'stat-grid', attrs: { 'aria-label': 'Resumen' } }, [
      statCard('Pendientes', count('PENDIENTE'), 'Ver tareas pendientes →', goTasks('PENDIENTE')),
      statCard('En proceso', count('EN_PROCESO'), 'Ver tareas en proceso →', goTasks('EN_PROCESO')),
      statCard('Vencidas', overdue.length, 'Ver tareas vencidas →', goTasks('VENCIDAS'), overdue.length ? 'is-alert' : ''),
      statCard('Compromisos vigentes', commitments.filter(c => c.estado !== 'CANCELADO').length, 'Ver compromisos →', goComm('TODOS')),
    ]),
    el('div', { className: 'home-panels' }, [
      el('section', { className: 'panel', attrs: { 'aria-labelledby': 'h-up-tasks' } }, [
        el('div', { className: 'panel-head' }, [
          el('h2', { className: 'section-title', id: 'h-up-tasks' }, [el('span', { className: 'section-glyph', text: '✍︎', attrs: { 'aria-hidden': 'true' } }), 'Próximas tareas']),
          link('tareas', 'Ver todas →', 'panel-link'),
        ]),
        upcomingTasks.length
          ? el('ul', { className: 'mini-list' }, upcomingTasks.map(taskRow))
          : emptyState('✍︎', 'No tienes tareas por hacer.', 'Crea una para empezar.', link('nueva-tarea', 'Nueva tarea', 'btn-chip', '+')),
      ]),
      el('section', { className: 'panel', attrs: { 'aria-labelledby': 'h-up-comm' } }, [
        el('div', { className: 'panel-head' }, [
          el('h2', { className: 'section-title', id: 'h-up-comm' }, [el('span', { className: 'section-glyph', text: '❖', attrs: { 'aria-hidden': 'true' } }), 'Próximos compromisos']),
          link('compromisos', 'Ver todos →', 'panel-link'),
        ]),
        upcomingComm.length
          ? el('ul', { className: 'mini-list' }, upcomingComm.map(commRow))
          : emptyState('❖', 'No hay compromisos próximos.', 'Agenda uno nuevo.', link('nuevo-compromiso', 'Nuevo compromiso', 'btn-chip', '+')),
      ]),
    ]),
  ]);
}

/* ═════════════════════ Tareas ═════════════════════ */

export function renderTasksPage(ctx: AppContext): HTMLElement {
  const filters = el('div', { className: 'toolbar-filters' });
  const summary = el('p', { className: 'result-summary', attrs: { 'aria-live': 'polite' } });
  const list = el('div', { className: 'card-grid' });

  const render = () => {
    const now = new Date();
    const tasks = ctx.tasks.getAllTasks();
    const overdueCount = tasks.filter(t => t.isPendingAndOverdue(now)).length;
    const v = ctx.view;

    keepFocus(filters, () => {
      clear(filters);
      filters.append(
        filterBar<TaskFilter>('Estado', [
          { value: 'TODAS', label: 'Todas', count: tasks.length },
          ...(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map(s => ({ value: s as TaskFilter, label: TASK_STATUS_LABEL[s], count: tasks.filter(t => t.estado === s).length })),
          { value: 'VENCIDAS', label: 'Vencidas', count: overdueCount },
        ], v.taskStatus, val => { v.taskStatus = val; render(); }),
        filterBar<PriorityFilter>('Prioridad', [
          { value: 'TODAS', label: 'Todas' },
          ...(['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as Priority[]).map(p => ({ value: p as PriorityFilter, label: PRIORITY_LABEL[p] })),
        ], v.taskPriority, val => { v.taskPriority = val; render(); }, true),
      );
    });

    const visible = tasks.filter(t =>
      (v.taskStatus === 'TODAS' || (v.taskStatus === 'VENCIDAS' ? t.isPendingAndOverdue(now) : t.estado === v.taskStatus))
      && (v.taskPriority === 'TODAS' || t.prioridad === v.taskPriority)
      && matchesQuery([t.titulo, t.descripcion, ...t.etiquetas], v.taskQuery));

    const filtered = v.taskStatus !== 'TODAS' || v.taskPriority !== 'TODAS' || v.taskQuery.trim() !== '';
    clear(summary);
    summary.append(
      filtered ? `Mostrando ${visible.length} de ${tasks.length} tareas` : `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'} en total`,
      filtered
        ? el('button', {
            className: 'link-btn', text: 'Quitar filtros', attrs: { type: 'button' },
            on: { click: () => { v.taskStatus = 'TODAS'; v.taskPriority = 'TODAS'; v.taskQuery = ''; ctx.navigate('tareas'); } },
          })
        : '',
    );

    clear(list);
    if (tasks.length === 0) {
      list.appendChild(emptyState('✍︎', 'Aún no hay tareas.', 'Crea la primera para empezar tu cuaderno.', link('nueva-tarea', 'Nueva tarea', 'btn-primary', '+')));
    } else if (visible.length === 0) {
      list.appendChild(emptyState('✦', 'Ninguna tarea coincide.', 'Cambia la búsqueda o los filtros.'));
    } else {
      visible.forEach(task => list.appendChild(renderTaskCard(task, {
        onStatusChange: (id, status) => {
          try {
            ctx.tasks.updateTaskStatus(id, status);
            ctx.toast(`Tarea marcada como «${TASK_STATUS_LABEL[status]}».`, 'success');
          } catch (err) {
            ctx.toast(errorMessage(err), 'error');
          }
          render();
          ctx.refreshChrome();
        },
        onDelete: (id) => {
          if (!window.confirm('¿Eliminar esta tarea? No se puede deshacer.')) return;
          ctx.tasks.deleteTask(id);
          ctx.toast('Tarea eliminada.', 'success');
          render();
          ctx.refreshChrome();
        },
      }, now)));
      flashHighlight(ctx, list);
    }
  };

  const page = el('div', { className: 'page page-list' }, [
    pageHeader({
      crumbs: [{ label: 'Inicio', route: 'inicio' }, { label: 'Tareas' }],
      title: 'Tareas',
      subtitle: 'Todo lo que tienes por hacer, ordenado por fecha límite.',
      actions: [link('nueva-tarea', 'Nueva tarea', 'btn-primary', '+')],
    }),
    el('div', { className: 'toolbar' }, [
      searchField('search-tasks', 'Buscar tareas', 'Título, descripción o etiqueta…', ctx.view.taskQuery, q => { ctx.view.taskQuery = q; render(); }),
      filters,
    ]),
    summary,
    list,
  ]);
  render();
  return page;
}

/* ═════════════════════ Compromisos ═════════════════════ */

export function renderCommitmentsPage(ctx: AppContext): HTMLElement {
  const filters = el('div', { className: 'toolbar-filters' });
  const summary = el('p', { className: 'result-summary', attrs: { 'aria-live': 'polite' } });
  const list = el('div', { className: 'card-grid' });

  const render = () => {
    const all = ctx.commitments.getAllCommitments();
    const v = ctx.view;

    keepFocus(filters, () => {
      clear(filters);
      filters.append(filterBar<CommFilter>('Estado', [
        { value: 'TODOS', label: 'Todos', count: all.length },
        ...(Object.keys(COMMITMENT_STATUS_LABEL) as CommitmentStatus[]).map(s => ({
          value: s as CommFilter, label: COMMITMENT_STATUS_LABEL[s], count: all.filter(c => c.estado === s).length,
        })),
      ], v.commStatus, val => { v.commStatus = val; render(); }));
    });

    const visible = all.filter(c =>
      (v.commStatus === 'TODOS' || c.estado === v.commStatus)
      && matchesQuery([c.titulo, c.descripcion, c.ubicacion, ...c.participantes], v.commQuery));

    const filtered = v.commStatus !== 'TODOS' || v.commQuery.trim() !== '';
    clear(summary);
    summary.append(
      filtered ? `Mostrando ${visible.length} de ${all.length} compromisos` : `${all.length} ${all.length === 1 ? 'compromiso' : 'compromisos'} en total`,
      filtered
        ? el('button', {
            className: 'link-btn', text: 'Quitar filtros', attrs: { type: 'button' },
            on: { click: () => { v.commStatus = 'TODOS'; v.commQuery = ''; ctx.navigate('compromisos'); } },
          })
        : '',
    );

    const act = (fn: () => void, ok: string) => {
      try { fn(); ctx.toast(ok, 'success'); } catch (err) { ctx.toast(errorMessage(err), 'error'); }
      render();
      ctx.refreshChrome();
    };

    clear(list);
    if (all.length === 0) {
      list.appendChild(emptyState('❖', 'Aún no hay compromisos.', 'Agenda tu primera reunión o cita.', link('nuevo-compromiso', 'Nuevo compromiso', 'btn-primary', '+')));
    } else if (visible.length === 0) {
      list.appendChild(emptyState('✦', 'Ningún compromiso coincide.', 'Cambia la búsqueda o el filtro.'));
    } else {
      visible.forEach(comm => list.appendChild(renderCommitmentCard(comm, {
        onConfirm: (id) => act(() => ctx.commitments.confirmCommitment(id), 'Compromiso confirmado.'),
        onCancel: (id) => {
          if (!window.confirm('¿Cancelar este compromiso? Su horario quedará libre.')) return;
          act(() => ctx.commitments.cancelCommitment(id), 'Compromiso cancelado.');
        },
        onDelete: (id) => {
          if (!window.confirm('¿Eliminar este compromiso? No se puede deshacer.')) return;
          act(() => { ctx.commitments.deleteCommitment(id); }, 'Compromiso eliminado.');
        },
      })));
      flashHighlight(ctx, list);
    }
  };

  const page = el('div', { className: 'page page-list' }, [
    pageHeader({
      crumbs: [{ label: 'Inicio', route: 'inicio' }, { label: 'Compromisos' }],
      title: 'Compromisos',
      subtitle: 'Reuniones y citas agendadas, en orden cronológico.',
      actions: [link('nuevo-compromiso', 'Nuevo compromiso', 'btn-primary', '+')],
    }),
    el('div', { className: 'toolbar' }, [
      searchField('search-comm', 'Buscar compromisos', 'Título, lugar o correo de un participante…', ctx.view.commQuery, q => { ctx.view.commQuery = q; render(); }),
      filters,
    ]),
    summary,
    list,
  ]);
  render();
  return page;
}

/* ═════════════════════ Nueva tarea ═════════════════════ */

export function renderNewTaskPage(ctx: AppContext): HTMLElement {
  const form = renderTaskForm(dto => {
    try {
      const task = ctx.tasks.createTask(dto);
      ctx.view.taskStatus = 'TODAS';
      ctx.view.taskPriority = 'TODAS';
      ctx.view.taskQuery = '';
      ctx.view.highlightId = task.id;
      ctx.toast(`Tarea «${task.titulo}» guardada.`, 'success');
      ctx.refreshChrome();
      ctx.navigate('tareas');
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorMessage(err) };
    }
  });

  return el('div', { className: 'page page-form' }, [
    pageHeader({
      crumbs: [{ label: 'Inicio', route: 'inicio' }, { label: 'Tareas', route: 'tareas' }, { label: 'Nueva tarea' }],
      title: 'Nueva tarea',
      subtitle: 'Los campos con * son obligatorios.',
      actions: [link('tareas', 'Volver a tareas', 'btn-secondary', '←')],
    }),
    form,
  ]);
}

/* ═════════════════════ Nuevo compromiso ═════════════════════ */

function readLastCreator(): string {
  try { return window.localStorage.getItem(CREATOR_KEY) ?? ''; } catch { return ''; }
}

function saveLastCreator(email: string): void {
  try { window.localStorage.setItem(CREATOR_KEY, email); } catch { /* almacenamiento no disponible */ }
}

export function renderNewCommitmentPage(ctx: AppContext): HTMLElement {
  const form = renderCommitmentForm({
    defaultCreator: readLastCreator(),
    findConflict: (creator, start, end) => {
      const clash = ctx.commitments.getAllCommitments().find(c =>
        c.estado !== 'CANCELADO'
        && (c.userId === creator || c.participantes.includes(creator))
        && c.overlapsWith(start, end));
      return clash ? clash.titulo : null;
    },
    onSubmit: (dto) => {
      try {
        const comm = ctx.commitments.scheduleCommitment(dto);
        saveLastCreator(comm.userId);
        ctx.view.commStatus = 'TODOS';
        ctx.view.commQuery = '';
        ctx.view.highlightId = comm.id;
        ctx.toast(`Compromiso «${comm.titulo}» agendado.`, 'success');
        ctx.refreshChrome();
        ctx.navigate('compromisos');
        return { ok: true };
      } catch (err) {
        return { ok: false, message: errorMessage(err) };
      }
    },
  });

  return el('div', { className: 'page page-form' }, [
    pageHeader({
      crumbs: [{ label: 'Inicio', route: 'inicio' }, { label: 'Compromisos', route: 'compromisos' }, { label: 'Nuevo compromiso' }],
      title: 'Nuevo compromiso',
      subtitle: 'Los campos con * son obligatorios.',
      actions: [link('compromisos', 'Volver a compromisos', 'btn-secondary', '←')],
    }),
    form,
  ]);
}
