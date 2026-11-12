/**
 * Enrutador por hash (#/ruta). Cada sección de la app es una página separada,
 * así funciona sin servidor y los botones Atrás/Adelante del navegador sirven.
 */

export type Route = 'inicio' | 'tareas' | 'compromisos' | 'nueva-tarea' | 'nuevo-compromiso';

export const ROUTES: Route[] = ['inicio', 'tareas', 'compromisos', 'nueva-tarea', 'nuevo-compromiso'];

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '').split('?')[0]?.trim() ?? '';
  return (ROUTES as string[]).includes(clean) ? (clean as Route) : 'inicio';
}

export function hrefFor(route: Route): string {
  return `#/${route}`;
}

export function navigate(route: Route): void {
  const target = hrefFor(route);
  if (window.location.hash === target) {
    // Misma ruta: forzar re-render (p. ej. tras cambiar un filtro desde Inicio).
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function onRouteChange(handler: (route: Route) => void): void {
  window.addEventListener('hashchange', () => handler(parseRoute(window.location.hash)));
}
