import { CreateTaskDTO, CreateCommitmentDTO, Priority } from '../../domain/types';
import { validateEmailRfc5322 } from '../../security/sanitizer';
import { clear, el } from '../dom';
import { checkInterval, splitEmails, toLocalInputValue } from '../format';
import { PRIORITY_LABEL } from './task-card';

export interface OfficialFormCallbacks {
  /** Devuelve true si la tarea quedó registrada (para limpiar el formulario). */
  onCreateTask: (dto: CreateTaskDTO) => boolean;
  /** Devuelve true si el compromiso quedó agendado. */
  onCreateCommitment: (dto: CreateCommitmentDTO) => boolean;
}

export interface OfficialForm {
  element: HTMLElement;
  showTab: (tab: 'task' | 'commitment') => void;
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function fieldGroup(opts: {
  id: string;
  label: string;
  control: Field;
  required?: boolean;
  counterMax?: number;
  hint?: string;
  wide?: boolean;
  extra?: HTMLElement;
}): { group: HTMLElement; error: HTMLElement } {
  const labelRow = el('label', { className: 'form-label', attrs: { for: opts.id } }, [
    el('span', {}, [opts.label, opts.required ? el('span', { className: 'req', text: ' *', attrs: { 'aria-hidden': 'true' } }) : null]),
  ]);

  if (opts.counterMax) {
    const counter = el('span', {
      className: 'char-counter',
      text: `0 / ${opts.counterMax}`,
      attrs: { 'aria-live': 'polite' },
    });
    const update = () => {
      const len = opts.control.value.length;
      counter.textContent = `${len} / ${opts.counterMax}`;
      counter.classList.toggle('limit-near', len >= (opts.counterMax ?? 0) * 0.9);
    };
    opts.control.addEventListener('input', update);
    // Evento propio para recalcular tras un reinicio programático del formulario.
    opts.control.addEventListener('cronos:refresh', update);
    labelRow.appendChild(counter);
  }

  const error = el('span', { className: 'field-error', attrs: { 'aria-live': 'polite' } });
  const hintId = `${opts.id}-hint`;
  if (opts.hint) opts.control.setAttribute('aria-describedby', hintId);

  const group = el('div', { className: `form-group${opts.wide ? ' span-all' : ''}` }, [
    labelRow,
    opts.control,
    opts.extra ?? null,
    opts.hint ? el('span', { className: 'form-hint', id: hintId, text: opts.hint }) : null,
    error,
  ]);
  return { group, error };
}

function setError(control: Field, errorEl: HTMLElement, message: string | null): void {
  errorEl.textContent = message ?? '';
  control.classList.toggle('has-error', !!message);
  control.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function renderOfficialForm(callbacks: OfficialFormCallbacks): OfficialForm {
  /* ───────────────────────── Tabs ───────────────────────── */
  const tabTask = el('button', {
    className: 'tab-btn active',
    id: 'tab-task',
    attrs: { type: 'button', role: 'tab', 'aria-selected': 'true', 'aria-controls': 'form-task' },
  }, [el('span', { className: 'tab-glyph', text: '✍\uFE0E', attrs: { 'aria-hidden': 'true' } }), 'Registrar Nueva Tarea', el('small', { text: 'Task' })]);

  const tabComm = el('button', {
    className: 'tab-btn',
    id: 'tab-commitment',
    attrs: { type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'form-commitment' },
  }, [el('span', { className: 'tab-glyph', text: '❖', attrs: { 'aria-hidden': 'true' } }), 'Registrar Compromiso', el('small', { text: 'Commitment' })]);

  /* ───────────────────────── Formulario de Tarea ───────────────────────── */
  const tTitle = el('input', { id: 'task-title', className: 'form-input', attrs: { type: 'text', maxlength: 100, required: true, placeholder: 'Ej. Redactar minuta de compromisos editoriales', autocomplete: 'off' } });
  const tDesc = el('textarea', { id: 'task-desc', className: 'form-textarea', attrs: { maxlength: 500, rows: 3, placeholder: 'Anotaciones, requerimientos y contexto…' } });
  const tDue = el('input', { id: 'task-due', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const tPriority = el('select', { id: 'task-priority', className: 'form-select', attrs: { required: true } },
    (['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as Priority[]).map(p => {
      const o = el('option', { text: PRIORITY_LABEL[p], attrs: { value: p } });
      o.selected = p === 'MEDIA';
      return o;
    }));
  const tTags = el('input', { id: 'task-tags', className: 'form-input', attrs: { type: 'text', placeholder: 'Trabajo, Personal, Obra', autocomplete: 'off' } });

  const fTitle = fieldGroup({ id: 'task-title', label: 'Título de la tarea', control: tTitle, required: true, counterMax: 100, wide: true });
  const fDesc = fieldGroup({ id: 'task-desc', label: 'Descripción (opcional)', control: tDesc, counterMax: 500, wide: true });
  const fDue = fieldGroup({ id: 'task-due', label: 'Fecha de vencimiento', control: tDue, required: true, hint: 'RN-01 · No puede quedar en el pasado.' });
  const fPriority = fieldGroup({ id: 'task-priority', label: 'Prioridad', control: tPriority, required: true });
  const fTags = fieldGroup({ id: 'task-tags', label: 'Etiquetas', control: tTags, hint: 'Separadas por comas.' });

  const resetTask = () => {
    tTitle.value = '';
    tDesc.value = '';
    tTags.value = '';
    tPriority.value = 'MEDIA';
    tDue.value = toLocalInputValue(new Date(Date.now() + 4 * 3600_000));
    [tTitle, tDesc].forEach(c => c.dispatchEvent(new Event('cronos:refresh')));
    setError(tTitle, fTitle.error, null);
    setError(tDue, fDue.error, null);
  };

  const formTask = el('form', {
    className: 'form-body',
    id: 'form-task',
    attrs: { role: 'tabpanel', 'aria-labelledby': 'tab-task', novalidate: true },
    on: {
      submit: (e) => {
        e.preventDefault();
        let ok = true;
        if (tTitle.value.trim().length === 0) { setError(tTitle, fTitle.error, 'El título es obligatorio.'); ok = false; }
        else setError(tTitle, fTitle.error, null);

        const due = new Date(tDue.value);
        if (isNaN(due.getTime())) { setError(tDue, fDue.error, 'Indica una fecha válida.'); ok = false; }
        else if (due.getTime() < Date.now()) { setError(tDue, fDue.error, 'RN-01: la fecha está en el pasado.'); ok = false; }
        else setError(tDue, fDue.error, null);
        if (!ok) return;

        const created = callbacks.onCreateTask({
          titulo: tTitle.value,
          descripcion: tDesc.value,
          fechaVencimiento: due,
          prioridad: tPriority.value as Priority,
          etiquetas: tTags.value.split(',').map(t => t.trim()).filter(Boolean),
        });
        if (created) resetTask();
      },
    },
  }, [
    el('div', { className: 'form-grid' }, [fTitle.group, fDesc.group, fDue.group, fPriority.group, fTags.group]),
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'btn-secondary', text: 'Limpiar Campos', attrs: { type: 'button' }, on: { click: resetTask } }),
      el('button', { className: 'btn-primary', attrs: { type: 'submit' } }, [el('span', { text: '✦', attrs: { 'aria-hidden': 'true' } }), 'Guardar Tarea']),
    ]),
  ]);

  /* ───────────────────────── Formulario de Compromiso ───────────────────────── */
  const cTitle = el('input', { id: 'comm-title', className: 'form-input', attrs: { type: 'text', maxlength: 100, required: true, placeholder: 'Ej. Comité de seguridad en obra', autocomplete: 'off' } });
  const cDesc = el('textarea', { id: 'comm-desc', className: 'form-textarea', attrs: { maxlength: 500, rows: 2, placeholder: 'Agenda u objetivo del encuentro…' } });
  const cStart = el('input', { id: 'comm-start', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const cEnd = el('input', { id: 'comm-end', className: 'form-input', attrs: { type: 'datetime-local', required: true } });
  const cCreator = el('input', { id: 'comm-creator', className: 'form-input', attrs: { type: 'email', required: true, placeholder: 'tu.correo@dominio.com', autocomplete: 'email' } });
  const cPartInput = el('input', { id: 'comm-participants', className: 'chip-input', attrs: { type: 'text', placeholder: 'Escribe un correo y pulsa Enter', autocomplete: 'off', inputmode: 'email' } });
  const cLocation = el('input', { id: 'comm-location', className: 'form-input', attrs: { type: 'text', maxlength: 200, placeholder: 'Dirección física o enlace virtual' } });
  const cReminder = el('input', { id: 'comm-reminder', className: 'form-input', attrs: { type: 'number', min: 0, max: 10080, step: 5, value: 15 } });

  const intervalSlot = el('div', { className: 'interval-slot', attrs: { 'aria-live': 'polite' } });
  const chipList = el('ul', { className: 'chip-list', attrs: { 'aria-label': 'Participantes agregados' } });
  const chipBox = el('div', { className: 'chip-box', on: { click: () => cPartInput.focus() } }, [chipList, cPartInput]);

  const fcTitle = fieldGroup({ id: 'comm-title', label: 'Título del compromiso', control: cTitle, required: true, counterMax: 100, wide: true });
  const fcDesc = fieldGroup({ id: 'comm-desc', label: 'Descripción (opcional)', control: cDesc, counterMax: 500, wide: true });
  const fcStart = fieldGroup({ id: 'comm-start', label: 'Inicio', control: cStart, required: true });
  const fcEnd = fieldGroup({ id: 'comm-end', label: 'Fin', control: cEnd, required: true, hint: 'RN-04 · Duración mínima de 15 minutos.' });
  const fcCreator = fieldGroup({ id: 'comm-creator', label: 'Correo del creador', control: cCreator, required: true, hint: 'RN-03 · Se verifica que no se cruce con tu agenda.' });
  // El chip-box envuelve el input real de participantes.
  const partLabel = el('label', { className: 'form-label', attrs: { for: 'comm-participants' } }, [el('span', { text: 'Participantes' })]);
  const partError = el('span', { className: 'field-error', attrs: { 'aria-live': 'polite' } });
  const fcParts = el('div', { className: 'form-group span-all' }, [
    partLabel,
    chipBox,
    el('span', { className: 'form-hint', text: 'RN-05 · Formato RFC 5322. El creador se incluye automáticamente.' }),
    partError,
  ]);
  const fcLocation = fieldGroup({ id: 'comm-location', label: 'Ubicación', control: cLocation, wide: true });
  const fcReminder = fieldGroup({ id: 'comm-reminder', label: 'Recordatorio (minutos previos)', control: cReminder, hint: 'Por defecto: 15 minutos previos.' });

  let extraParticipants: string[] = [];

  const renderChips = () => {
    clear(chipList);
    const creator = cCreator.value.trim();
    if (creator) {
      const valid = validateEmailRfc5322(creator);
      chipList.appendChild(el('li', { className: `participant-chip creator${valid ? '' : ' invalid'}` }, [
        creator,
        el('span', { className: 'creator-tag', text: 'Creador' }),
      ]));
    }
    extraParticipants.forEach(email => {
      chipList.appendChild(el('li', { className: 'participant-chip' }, [
        email,
        el('button', {
          className: 'chip-remove',
          text: '×',
          attrs: { type: 'button', 'aria-label': `Quitar ${email}` },
          on: {
            click: (e) => {
              e.stopPropagation();
              extraParticipants = extraParticipants.filter(p => p !== email);
              renderChips();
            },
          },
        }),
      ]));
    });
  };

  /** Agrega lo escrito en el input como chips; devuelve false si hubo inválidos. */
  const commitPendingParticipants = (): boolean => {
    const emails = splitEmails(cPartInput.value);
    if (emails.length === 0) return true;
    const bad: string[] = [];
    emails.forEach(email => {
      if (!validateEmailRfc5322(email)) { bad.push(email); return; }
      if (email !== cCreator.value.trim() && !extraParticipants.includes(email)) extraParticipants.push(email);
    });
    cPartInput.value = bad.join(', ');
    partError.textContent = bad.length ? `RN-05: correo inválido — ${bad.join(', ')}` : '';
    chipBox.classList.toggle('has-error', bad.length > 0);
    renderChips();
    return bad.length === 0;
  };

  cPartInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commitPendingParticipants();
    } else if (e.key === 'Backspace' && cPartInput.value === '' && extraParticipants.length > 0) {
      extraParticipants.pop();
      renderChips();
    }
  });
  cPartInput.addEventListener('blur', () => { commitPendingParticipants(); });
  cCreator.addEventListener('input', () => {
    renderChips();
    if (cCreator.value.trim() === '' || validateEmailRfc5322(cCreator.value.trim())) setError(cCreator, fcCreator.error, null);
  });

  const updateInterval = () => {
    clear(intervalSlot);
    const check = checkInterval(new Date(cStart.value), new Date(cEnd.value));
    intervalSlot.appendChild(el('span', { className: `interval-badge ${check.ok ? 'is-valid' : 'is-invalid'}` }, [
      el('span', { className: 'interval-icon', text: check.ok ? '✦' : '!', attrs: { 'aria-hidden': 'true' } }),
      check.label,
    ]));
    cEnd.classList.toggle('has-error', !check.ok);
    return check.ok;
  };
  cStart.addEventListener('input', () => {
    // Mantiene la duración previa al mover el inicio si el fin quedó atrás.
    const s = new Date(cStart.value).getTime();
    const e = new Date(cEnd.value).getTime();
    if (!isNaN(s) && (isNaN(e) || e <= s)) cEnd.value = toLocalInputValue(new Date(s + 3600_000));
    updateInterval();
  });
  cEnd.addEventListener('input', updateInterval);

  const resetComm = () => {
    const start = new Date(Date.now() + 24 * 3600_000);
    start.setMinutes(0, 0, 0);
    cTitle.value = '';
    cDesc.value = '';
    cLocation.value = '';
    cReminder.value = '15';
    cPartInput.value = '';
    cStart.value = toLocalInputValue(start);
    cEnd.value = toLocalInputValue(new Date(start.getTime() + 3600_000));
    extraParticipants = [];
    partError.textContent = '';
    chipBox.classList.remove('has-error');
    [cTitle, cDesc].forEach(c => c.dispatchEvent(new Event('cronos:refresh')));
    setError(cTitle, fcTitle.error, null);
    setError(cCreator, fcCreator.error, null);
    renderChips();
    updateInterval();
  };

  const formComm = el('form', {
    className: 'form-body',
    id: 'form-commitment',
    attrs: { role: 'tabpanel', 'aria-labelledby': 'tab-commitment', novalidate: true, hidden: true },
    on: {
      submit: (e) => {
        e.preventDefault();
        let ok = true;
        if (cTitle.value.trim().length === 0) { setError(cTitle, fcTitle.error, 'El título es obligatorio.'); ok = false; }
        else setError(cTitle, fcTitle.error, null);

        const creator = cCreator.value.trim();
        if (!validateEmailRfc5322(creator)) { setError(cCreator, fcCreator.error, 'RN-05: correo del creador inválido.'); ok = false; }
        else setError(cCreator, fcCreator.error, null);

        if (!commitPendingParticipants()) ok = false;
        if (!updateInterval()) ok = false;
        if (!ok) return;

        const reminder = Number.parseInt(cReminder.value || '15', 10);
        const created = callbacks.onCreateCommitment({
          userId: creator,
          titulo: cTitle.value,
          descripcion: cDesc.value,
          fechaInicio: new Date(cStart.value),
          fechaFin: new Date(cEnd.value),
          ubicacion: cLocation.value,
          participantes: [creator, ...extraParticipants],
          minutosRecordatorio: Number.isNaN(reminder) ? 15 : reminder,
        });
        if (created) {
          const keepCreator = cCreator.value;
          resetComm();
          cCreator.value = keepCreator;
          renderChips();
        }
      },
    },
  }, [
    el('div', { className: 'form-grid' }, [
      fcTitle.group, fcDesc.group, fcStart.group, fcEnd.group,
      el('div', { className: 'span-all' }, [intervalSlot]),
      fcCreator.group, fcReminder.group, fcParts, fcLocation.group,
    ]),
    el('div', { className: 'form-actions' }, [
      el('button', { className: 'btn-secondary', text: 'Limpiar Campos', attrs: { type: 'button' }, on: { click: resetComm } }),
      el('button', { className: 'btn-primary', attrs: { type: 'submit' } }, [el('span', { text: '❖', attrs: { 'aria-hidden': 'true' } }), 'Guardar Compromiso']),
    ]),
  ]);

  /* ───────────────────────── Ensamblaje ───────────────────────── */
  const showTab = (tab: 'task' | 'commitment') => {
    const isTask = tab === 'task';
    tabTask.classList.toggle('active', isTask);
    tabComm.classList.toggle('active', !isTask);
    tabTask.setAttribute('aria-selected', String(isTask));
    tabComm.setAttribute('aria-selected', String(!isTask));
    formTask.hidden = !isTask;
    formComm.hidden = isTask;
  };
  tabTask.addEventListener('click', () => showTab('task'));
  tabComm.addEventListener('click', () => showTab('commitment'));

  const tablist = el('div', { className: 'form-tabs', attrs: { role: 'tablist', 'aria-label': 'Tipo de registro' } }, [tabTask, tabComm]);
  tablist.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tabTask.classList.contains('active') ? 'commitment' : 'task';
      showTab(next);
      (next === 'task' ? tabTask : tabComm).focus();
    }
  });

  resetTask();
  resetComm();

  return {
    element: el('div', { className: 'form-container' }, [tablist, formTask, formComm]),
    showTab,
  };
}
