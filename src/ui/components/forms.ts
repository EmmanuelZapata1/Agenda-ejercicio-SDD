import { CreateTaskDTO, CreateCommitmentDTO, Priority } from '../../domain/types';
import { validateEmailRfc5322 } from '../../security/sanitizer';
import { clear, el } from '../dom';
import { checkInterval, splitEmails, toLocalInputValue } from '../format';
import { renderAlertBanner } from './alert-banner';
import { PRIORITY_LABEL } from './task-card';

export type SubmitResult = { ok: true } | { ok: false; message: string };

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/* ═════════════════════ Utilidades de campo ═════════════════════ */

interface FieldOptions {
  id: string;
  label: string;
  control: Field | HTMLElement;
  required?: boolean;
  counterFor?: { input: HTMLInputElement | HTMLTextAreaElement; max: number };
  hint?: string;
  wide?: boolean;
}

interface FieldHandle {
  group: HTMLElement;
  setError: (message: string | null) => void;
  refreshCounter: () => void;
}

function field(opts: FieldOptions): FieldHandle {
  const label = el('label', { className: 'form-label', attrs: { for: opts.id } }, [
    el('span', {}, [
      opts.label,
      opts.required ? el('span', { className: 'req', text: ' *', title: 'Obligatorio' }) : null,
    ]),
  ]);

  let refreshCounter = () => {};
  if (opts.counterFor) {
    const { input, max } = opts.counterFor;
    const counter = el('span', { className: 'char-counter' });
    refreshCounter = () => {
      const len = input.value.length;
      counter.textContent = `${len} / ${max}`;
      counter.classList.toggle('limit-near', len >= max * 0.9);
    };
    input.addEventListener('input', refreshCounter);
    refreshCounter();
    label.appendChild(counter);
  }

  const error = el('span', { className: 'field-error', id: `${opts.id}-error`, attrs: { 'aria-live': 'polite' } });
  const hint = opts.hint ? el('span', { className: 'form-hint', id: `${opts.id}-hint`, text: opts.hint }) : null;
  const target = opts.control instanceof HTMLInputElement || opts.control instanceof HTMLTextAreaElement || opts.control instanceof HTMLSelectElement
    ? opts.control
    : (opts.control.querySelector('input') as HTMLInputElement | null);
  target?.setAttribute('aria-describedby', [hint?.id, error.id].filter(Boolean).join(' '));

  const group = el('div', { className: `form-group${opts.wide ? ' span-all' : ''}` }, [label, opts.control, hint, error]);

  return {
    group,
    refreshCounter,
    setError: (message) => {
      error.textContent = message ?? '';
      const box = opts.control instanceof HTMLElement && !(target === opts.control) ? opts.control : target;
      box?.classList.toggle('has-error', !!message);
      target?.setAttribute('aria-invalid', message ? 'true' : 'false');
    },
  };
}

function formShell(opts: {
  id: string;
  fields: HTMLElement[];
  submitLabel: string;
  glyph: string;
  onSubmit: () => void;
  onReset: () => void;
}): { form: HTMLFormElement; showFormError: (msg: string | null) => void } {
  const errorSlot = el('div', { className: 'form-error-slot' });
  const form = el('form', {
    className: 'form-body',
    id: opts.id,
    attrs: { novalidate: true },
    on: { submit: (e) => { e.preventDefault(); opts.onSubmit(); } },
  }, [
    el('div', { className: 'form-grid' }, opts.fields),
    errorSlot,
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'btn-secondary', text: 'Limpiar campos', attrs: { type: 'button' }, on: { click: () => { opts.onReset(); } } }),
      el('button', { className: 'btn-primary', attrs: { type: 'submit' } }, [
        el('span', { text: opts.glyph, attrs: { 'aria-hidden': 'true' } }),
        opts.submitLabel,
      ]),
    ]),
  ]);

  const showFormError = (msg: string | null) => {
    clear(errorSlot);
    if (!msg) return;
    const banner = renderAlertBanner(msg, 'error');
    errorSlot.appendChild(banner);
    banner.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  // Al corregir cualquier campo, el aviso general deja de aplicar.
  form.addEventListener('input', () => clear(errorSlot));

  return { form, showFormError };
}

/* ═════════════════════ Formulario de Tarea ═════════════════════ */

export function renderTaskForm(onSubmit: (dto: CreateTaskDTO) => SubmitResult): HTMLElement {
  const title = el('input', { id: 'task-title', className: 'form-input', attrs: { type: 'text', maxlength: 100, required: true, placeholder: 'Ej. Revisar el informe de inspección', autocomplete: 'off' } });
  const desc = el('textarea', { id: 'task-desc', className: 'form-textarea', attrs: { maxlength: 500, rows: 3, placeholder: 'Detalles, pasos o contexto (opcional)' } });
  const due = el('input', { id: 'task-due', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const priority = el('select', { id: 'task-priority', className: 'form-select' },
    (['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as Priority[]).map(p => el('option', { text: PRIORITY_LABEL[p], attrs: { value: p } })));
  const tags = el('input', { id: 'task-tags', className: 'form-input', attrs: { type: 'text', placeholder: 'Ej. Trabajo, Personal', autocomplete: 'off' } });

  const fTitle = field({ id: 'task-title', label: 'Título', control: title, required: true, counterFor: { input: title, max: 100 }, wide: true });
  const fDesc = field({ id: 'task-desc', label: 'Descripción', control: desc, counterFor: { input: desc, max: 500 }, wide: true });
  const fDue = field({ id: 'task-due', label: 'Fecha y hora límite', control: due, required: true, hint: 'No puede ser una fecha pasada.' });
  const fPriority = field({ id: 'task-priority', label: 'Prioridad', control: priority, required: true });
  const fTags = field({ id: 'task-tags', label: 'Etiquetas', control: tags, hint: 'Separadas por comas.', wide: true });

  const reset = () => {
    title.value = '';
    desc.value = '';
    tags.value = '';
    priority.value = 'MEDIA';
    due.value = toLocalInputValue(new Date(Date.now() + 24 * 3600_000));
    fTitle.refreshCounter();
    fDesc.refreshCounter();
    [fTitle, fDue].forEach(f => f.setError(null));
    shell.showFormError(null);
  };

  const shell = formShell({
    id: 'form-task',
    fields: [fTitle.group, fDesc.group, fDue.group, fPriority.group, fTags.group],
    submitLabel: 'Guardar tarea',
    glyph: '✦',
    onReset: reset,
    onSubmit: () => {
      shell.showFormError(null);
      let ok = true;
      if (title.value.trim() === '') { fTitle.setError('Escribe un título.'); ok = false; } else fTitle.setError(null);

      const dueDate = new Date(due.value);
      if (isNaN(dueDate.getTime())) { fDue.setError('Elige una fecha y hora.'); ok = false; }
      else if (dueDate.getTime() < Date.now()) { fDue.setError('Esa fecha ya pasó. Elige una fecha futura.'); ok = false; }
      else fDue.setError(null);

      if (!ok) {
        shell.form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        return;
      }

      const result = onSubmit({
        titulo: title.value,
        descripcion: desc.value,
        fechaVencimiento: dueDate,
        prioridad: priority.value as Priority,
        etiquetas: tags.value.split(',').map(t => t.trim()).filter(Boolean),
      });
      if (result.ok) reset();
      else shell.showFormError(result.message);
    },
  });

  reset();
  return el('div', { className: 'form-container' }, [shell.form]);
}

/* ═════════════════════ Formulario de Compromiso ═════════════════════ */

export interface CommitmentFormOptions {
  onSubmit: (dto: CreateCommitmentDTO) => SubmitResult;
  /** Devuelve el título del compromiso con el que se cruzaría (RN-03), o null. */
  findConflict: (creator: string, start: Date, end: Date) => string | null;
  defaultCreator: string;
}

export function renderCommitmentForm(opts: CommitmentFormOptions): HTMLElement {
  const title = el('input', { id: 'comm-title', className: 'form-input', attrs: { type: 'text', maxlength: 100, required: true, placeholder: 'Ej. Reunión del comité de seguridad', autocomplete: 'off' } });
  const desc = el('textarea', { id: 'comm-desc', className: 'form-textarea', attrs: { maxlength: 500, rows: 2, placeholder: 'Tema u objetivo (opcional)' } });
  const start = el('input', { id: 'comm-start', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const end = el('input', { id: 'comm-end', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const creator = el('input', { id: 'comm-creator', className: 'form-input', attrs: { type: 'email', required: true, placeholder: 'tu.correo@dominio.com', autocomplete: 'email' } });
  const partInput = el('input', { id: 'comm-participants', className: 'chip-input', attrs: { type: 'email', placeholder: 'correo@dominio.com', autocomplete: 'off' } });
  const location = el('input', { id: 'comm-location', className: 'form-input', attrs: { type: 'text', maxlength: 200, placeholder: 'Dirección o enlace de la reunión (opcional)' } });
  const reminder = el('select', { id: 'comm-reminder', className: 'form-select' },
    [0, 5, 10, 15, 30, 60, 120, 1440].map(m => el('option', {
      text: m === 0 ? 'Sin recordatorio' : m < 60 ? `${m} minutos antes` : m === 1440 ? '1 día antes' : `${m / 60} hora${m > 60 ? 's' : ''} antes`,
      attrs: { value: m },
    })));

  /* Participantes: chips + botón Agregar (no hace falta saber que Enter agrega) */
  let extras: string[] = [];
  const chipList = el('ul', { className: 'chip-list', attrs: { 'aria-label': 'Participantes agregados' } });
  const addBtn = el('button', { className: 'btn-chip', text: 'Agregar', attrs: { type: 'button' } });
  const partBox = el('div', { className: 'participants-editor' }, [
    chipList,
    el('div', { className: 'chip-add-row' }, [partInput, addBtn]),
  ]);

  const intervalSlot = el('div', { className: 'interval-slot', attrs: { 'aria-live': 'polite' } });

  const fTitle = field({ id: 'comm-title', label: 'Título', control: title, required: true, counterFor: { input: title, max: 100 }, wide: true });
  const fDesc = field({ id: 'comm-desc', label: 'Descripción', control: desc, counterFor: { input: desc, max: 500 }, wide: true });
  const fStart = field({ id: 'comm-start', label: 'Empieza', control: start, required: true });
  const fEnd = field({ id: 'comm-end', label: 'Termina', control: end, required: true, hint: 'Mínimo 15 minutos de duración.' });
  const fCreator = field({ id: 'comm-creator', label: 'Tu correo (organizador)', control: creator, required: true, hint: 'Se revisa que no tengas otro compromiso a esa hora.' });
  const fReminder = field({ id: 'comm-reminder', label: 'Recordatorio', control: reminder });
  const fParts = field({ id: 'comm-participants', label: 'Otros participantes', control: partBox, hint: 'Escribe un correo y pulsa «Agregar». Tú ya estás incluido.', wide: true });
  const fLocation = field({ id: 'comm-location', label: 'Lugar', control: location, wide: true });

  const renderChips = () => {
    clear(chipList);
    const c = creator.value.trim();
    if (c) {
      chipList.appendChild(el('li', { className: `participant-chip creator${validateEmailRfc5322(c) ? '' : ' invalid'}` }, [
        c, el('span', { className: 'creator-tag', text: 'Creador' }),
      ]));
    }
    extras.forEach(email => chipList.appendChild(el('li', { className: 'participant-chip' }, [
      email,
      el('button', {
        className: 'chip-remove',
        text: '×',
        attrs: { type: 'button', 'aria-label': `Quitar ${email}` },
        on: { click: () => { extras = extras.filter(p => p !== email); renderChips(); } },
      }),
    ])));
  };

  /** Pasa lo escrito a chips. Devuelve false si quedó algún correo inválido. */
  const addPending = (): boolean => {
    const emails = splitEmails(partInput.value);
    if (emails.length === 0) { fParts.setError(null); return true; }
    const bad = emails.filter(e => !validateEmailRfc5322(e));
    emails.filter(e => validateEmailRfc5322(e)).forEach(e => {
      if (e !== creator.value.trim() && !extras.includes(e)) extras.push(e);
    });
    partInput.value = bad.join(', ');
    fParts.setError(bad.length ? `Correo no válido: ${bad.join(', ')}` : null);
    renderChips();
    return bad.length === 0;
  };

  addBtn.addEventListener('click', () => { addPending(); partInput.focus(); });
  partInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPending(); }
  });

  const updateInterval = (): boolean => {
    clear(intervalSlot);
    const s = new Date(start.value);
    const e = new Date(end.value);
    const check = checkInterval(s, e);
    intervalSlot.appendChild(el('span', { className: `interval-badge ${check.ok ? 'is-valid' : 'is-invalid'}` }, [
      el('span', { className: 'interval-icon', text: check.ok ? '✦' : '!', attrs: { 'aria-hidden': 'true' } }),
      check.label,
    ]));
    let conflictFree = true;
    const c = creator.value.trim();
    if (check.ok && validateEmailRfc5322(c)) {
      const clash = opts.findConflict(c, s, e);
      if (clash) {
        conflictFree = false;
        intervalSlot.appendChild(el('span', { className: 'interval-badge is-invalid' }, [
          el('span', { className: 'interval-icon', text: '!', attrs: { 'aria-hidden': 'true' } }),
          `Se cruza con «${clash}»`,
        ]));
      }
    }
    end.classList.toggle('has-error', !check.ok || !conflictFree);
    return check.ok && conflictFree;
  };

  start.addEventListener('input', () => {
    // Si el fin queda antes del inicio, se mueve para mantener 1 hora.
    const s = new Date(start.value).getTime();
    const e = new Date(end.value).getTime();
    if (!isNaN(s) && (isNaN(e) || e <= s)) end.value = toLocalInputValue(new Date(s + 3600_000));
    updateInterval();
  });
  end.addEventListener('input', updateInterval);
  creator.addEventListener('input', () => {
    renderChips();
    fCreator.setError(null);
    updateInterval();
  });

  const reset = () => {
    const s = new Date(Date.now() + 24 * 3600_000);
    s.setMinutes(0, 0, 0);
    title.value = '';
    desc.value = '';
    location.value = '';
    reminder.value = '15';
    partInput.value = '';
    start.value = toLocalInputValue(s);
    end.value = toLocalInputValue(new Date(s.getTime() + 3600_000));
    if (!creator.value) creator.value = opts.defaultCreator;
    extras = [];
    fTitle.refreshCounter();
    fDesc.refreshCounter();
    [fTitle, fCreator, fParts].forEach(f => f.setError(null));
    shell.showFormError(null);
    renderChips();
    updateInterval();
  };

  const shell = formShell({
    id: 'form-commitment',
    fields: [
      fTitle.group, fStart.group, fEnd.group,
      el('div', { className: 'span-all' }, [intervalSlot]),
      fCreator.group, fReminder.group, fParts.group, fLocation.group, fDesc.group,
    ],
    submitLabel: 'Guardar compromiso',
    glyph: '❖',
    onReset: reset,
    onSubmit: () => {
      shell.showFormError(null);
      let ok = true;
      if (title.value.trim() === '') { fTitle.setError('Escribe un título.'); ok = false; } else fTitle.setError(null);

      const c = creator.value.trim();
      if (!validateEmailRfc5322(c)) { fCreator.setError('Escribe un correo válido, p. ej. nombre@dominio.com'); ok = false; }
      else fCreator.setError(null);

      if (!addPending()) ok = false;
      if (!updateInterval()) ok = false;

      if (!ok) {
        shell.form.querySelector<HTMLElement>('[aria-invalid="true"], .has-error')?.focus();
        if (!shell.form.querySelector('[aria-invalid="true"]')) {
          shell.showFormError('Revisa las fechas: el compromiso debe durar al menos 15 minutos y no cruzarse con otro.');
        }
        return;
      }

      const result = opts.onSubmit({
        userId: c,
        titulo: title.value,
        descripcion: desc.value,
        fechaInicio: new Date(start.value),
        fechaFin: new Date(end.value),
        ubicacion: location.value,
        participantes: [c, ...extras],
        minutosRecordatorio: Number.parseInt(reminder.value, 10),
      });
      if (result.ok) reset();
      else shell.showFormError(result.message);
    },
  });

  reset();
  return el('div', { className: 'form-container' }, [shell.form]);
}
