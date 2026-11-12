/**
 * Constructor seguro de nodos DOM (Capa de Seguridad — Defensa de salida).
 * Todo el texto proveniente del usuario se inserta mediante `textContent`
 * (nodos de texto), nunca con `innerHTML`, eliminando la superficie XSS.
 */

type Child = Node | string | number | null | undefined | false;

export interface ElOptions {
  className?: string;
  id?: string;
  text?: string;
  title?: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[K]) => void }>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.title) node.title = options.title;
  if (options.text !== undefined) node.textContent = options.text;

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value === undefined || value === false) continue;
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  if (options.on) {
    for (const [evt, handler] of Object.entries(options.on)) {
      if (handler) node.addEventListener(evt, handler as EventListener);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number'
      ? document.createTextNode(String(child))
      : child);
  }

  return node;
}

/** Vacía un contenedor sin usar innerHTML. */
export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Separador ornamental decimonónico (❦ ✦ ❖). */
export function ornament(symbol: '❦' | '✦' | '❖' = '❦'): HTMLElement {
  return el('div', { className: 'ornament-rule', attrs: { 'aria-hidden': 'true' } }, [
    el('span', { text: symbol }),
  ]);
}
