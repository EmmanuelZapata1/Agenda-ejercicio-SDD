import { el } from '../dom';

export type AlertType = 'error' | 'success';

/** Aviso en línea (se usa dentro de los formularios). */
export function renderAlertBanner(message: string, type: AlertType, onClose?: () => void): HTMLElement {
  const banner = el('div', {
    className: `alert-banner ${type}`,
    attrs: { role: type === 'error' ? 'alert' : 'status' },
  });

  banner.append(
    el('div', { className: 'alert-body' }, [
      el('span', { className: 'alert-icon', text: type === 'error' ? '!' : '✓', attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'alert-text', text: message }),
    ]),
    el('button', {
      className: 'alert-close',
      text: '✕',
      attrs: { type: 'button', 'aria-label': 'Cerrar aviso' },
      on: { click: () => { banner.remove(); onClose?.(); } },
    })
  );

  return banner;
}

/**
 * Aviso flotante (toast): siempre visible sin importar dónde esté el scroll.
 * Los errores permanecen hasta cerrarse; los éxitos desaparecen solos.
 */
export function showToast(message: string, type: AlertType): void {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = el('div', { id: 'toast-region', className: 'toast-region', attrs: { 'aria-live': 'polite' } });
    document.body.appendChild(region);
  }
  while (region.children.length >= 3) region.firstElementChild?.remove();

  const toast = renderAlertBanner(message, type);
  toast.classList.add('toast');
  region.appendChild(toast);
  if (type === 'success') window.setTimeout(() => toast.remove(), 4000);
}
