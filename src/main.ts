import './style.css';
import { LocalStorageTaskRepository } from './repositories/task.repository';
import { LocalStorageCommitmentRepository } from './repositories/commitment.repository';
import { TaskService } from './services/task.service';
import { CommitmentService } from './services/commitment.service';
import { seedDemoDataIfEmpty } from './seed';
import { AppContext } from './ui/context';
import { clear } from './ui/dom';
import { navigate, onRouteChange, parseRoute, Route } from './ui/router';
import { showToast } from './ui/components/alert-banner';
import {
  renderHomePage,
  renderTasksPage,
  renderCommitmentsPage,
  renderNewTaskPage,
  renderNewCommitmentPage,
} from './ui/pages';

/* ───────────────────────── Composición de capas ───────────────────────── */
const taskService = new TaskService(new LocalStorageTaskRepository('cronos_tasks_db'));
const commitmentService = new CommitmentService(new LocalStorageCommitmentRepository('cronos_commitments_db'));

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const PAGE_TITLES: Record<Route, string> = {
  'inicio': 'Inicio',
  'tareas': 'Tareas',
  'compromisos': 'Compromisos',
  'nueva-tarea': 'Nueva tarea',
  'nuevo-compromiso': 'Nuevo compromiso',
};

const ctx: AppContext = {
  tasks: taskService,
  commitments: commitmentService,
  view: {
    taskStatus: 'TODAS',
    taskPriority: 'TODAS',
    taskQuery: '',
    commStatus: 'TODOS',
    commQuery: '',
    highlightId: null,
  },
  navigate,
  toast: showToast,
  refreshChrome,
};

/* ───────────────────────── Barra lateral ───────────────────────── */
function refreshChrome(): void {
  const now = new Date();
  const tasks = taskService.getAllTasks();
  const overdue = taskService.getPendingTasksOverdue(now);
  const commitments = commitmentService.getAllCommitments();

  $('stat-active-tasks').textContent = String(tasks.filter(t => t.estado === 'PENDIENTE' || t.estado === 'EN_PROCESO').length);
  $('stat-overdue-tasks').textContent = String(overdue.length);
  $('ledger-overdue').classList.toggle('is-alert', overdue.length > 0);
  $('stat-done-tasks').textContent = String(tasks.filter(t => t.estado === 'COMPLETADA').length);
  $('stat-active-comm').textContent = String(commitments.filter(c => c.estado !== 'CANCELADO').length);
  $('nav-count-tasks').textContent = String(tasks.length);
  $('nav-count-comm').textContent = String(commitments.length);
}

function setMenuOpen(open: boolean): void {
  document.querySelector('.sidebar')?.classList.toggle('is-open', open);
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
}

function setupChrome(): void {
  const toggle = document.querySelector('.menu-toggle') as HTMLButtonElement;
  toggle.addEventListener('click', () => setMenuOpen(!document.querySelector('.sidebar')?.classList.contains('is-open')));
  document.querySelector('.sidebar-scrim')?.addEventListener('click', () => setMenuOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenuOpen(false);
    // Atajo "/" para buscar en las páginas de listas.
    const target = e.target as HTMLElement;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (e.key === '/' && !typing) {
      const search = document.querySelector<HTMLInputElement>('[data-search]');
      if (search) { e.preventDefault(); search.focus(); }
    }
  });
}

/* ───────────────────────── Render de página ───────────────────────── */
let currentRoute: Route = 'inicio';

function renderRoute(route: Route, moveFocus = true): void {
  currentRoute = route;
  const view = $('view');
  clear(view);

  const page =
    route === 'tareas' ? renderTasksPage(ctx)
    : route === 'compromisos' ? renderCommitmentsPage(ctx)
    : route === 'nueva-tarea' ? renderNewTaskPage(ctx)
    : route === 'nuevo-compromiso' ? renderNewCommitmentPage(ctx)
    : renderHomePage(ctx);
  view.appendChild(page);

  document.querySelectorAll<HTMLAnchorElement>('.nav-link').forEach(a => {
    const active = a.dataset.route === route;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${PAGE_TITLES[route]} · Cronos & Co.`;
  setMenuOpen(false);
  refreshChrome();

  if (moveFocus) {
    window.scrollTo({ top: 0 });
    // En formularios el foco va al primer campo; en el resto, al título.
    const first = route.startsWith('nuev') ? page.querySelector<HTMLElement>('input') : page.querySelector<HTMLElement>('h1');
    first?.focus({ preventScroll: true });
  }
}

/* ───────────────────────── Arranque ───────────────────────── */
function initApp(): void {
  try {
    seedDemoDataIfEmpty(taskService, commitmentService);
  } catch (err) {
    console.warn('No se pudieron cargar los datos de demostración:', err);
  }

  setupChrome();
  onRouteChange(route => renderRoute(route));
  if (!window.location.hash) history.replaceState(null, '', '#/inicio');
  renderRoute(parseRoute(window.location.hash), false);

  // Reevalúa vencimientos cada minuto en las páginas de consulta (no en formularios).
  window.setInterval(() => {
    if (currentRoute === 'inicio') renderRoute(currentRoute, false);
    else refreshChrome();
  }, 60_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
