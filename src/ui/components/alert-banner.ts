import { el } from '../dom';

export function renderAlertBanner(
  message: string,
  type: 'error' | 'success',
  onClose: () => void
): HTMLElement {
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
      on: { click: () => { banner.remove(); onClose(); } },
    })
  );

  return banner;
}
