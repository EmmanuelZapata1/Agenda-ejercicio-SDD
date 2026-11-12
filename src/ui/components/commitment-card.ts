import { Commitment } from '../../domain/commitment';
import { CommitmentStatus } from '../../domain/types';
import { el } from '../dom';
import { checkInterval, formatDayMonth, formatTime, shortId } from '../format';

export interface CommitmentCardCallbacks {
  onCancel: (id: string) => void;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}

export const COMMITMENT_STATUS_LABEL: Record<CommitmentStatus, string> = {
  PROGRAMADO: 'Programado',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
};

/** Insignia de validación de intervalo (verde aurora / rojo terracota). */
export function intervalBadge(start: Date, end: Date): HTMLElement {
  const check = checkInterval(start, end);
  return el('span', {
    className: `interval-badge ${check.ok ? 'is-valid' : 'is-invalid'}`,
    attrs: { role: 'status' },
  }, [
    el('span', { className: 'interval-icon', text: check.ok ? '✦' : '!', attrs: { 'aria-hidden': 'true' } }),
    check.label,
  ]);
}

function dateBlock(label: string, date: Date): HTMLElement {
  const d = formatDayMonth(date);
  return el('div', { className: 'date-block' }, [
    el('span', { className: 'date-block-label', text: label }),
    el('time', { className: 'date-block-value', attrs: { datetime: date.toISOString() } }, [
      el('span', { className: 'date-day', text: d.day }),
      el('span', { className: 'date-rest' }, [
        el('span', { className: 'date-month', text: `${d.month} · ${d.weekday}` }),
        el('span', { className: 'date-time', text: formatTime(date) }),
      ]),
    ]),
  ]);
}

export function renderCommitmentCard(comm: Commitment, callbacks: CommitmentCardCallbacks): HTMLElement {
  const cancelled = comm.estado === 'CANCELADO';

  const actions: HTMLElement[] = [];
  if (comm.estado === 'PROGRAMADO') {
    actions.push(el('button', {
      className: 'btn-chip',
      text: 'Confirmar',
      attrs: { type: 'button' },
      on: { click: () => callbacks.onConfirm(comm.id) },
    }));
  }
  if (!cancelled) {
    actions.push(el('button', {
      className: 'btn-chip btn-chip-danger',
      text: 'Cancelar',
      attrs: { type: 'button' },
      on: { click: () => callbacks.onCancel(comm.id) },
    }));
  }
  actions.push(el('button', {
    className: 'btn-icon',
    text: '✕',
    title: 'Retirar del registro',
    attrs: { type: 'button', 'aria-label': `Retirar compromiso "${comm.titulo}"` },
    on: { click: () => callbacks.onDelete(comm.id) },
  }));

  return el('article', {
    className: `entity-card commitment-card${cancelled ? ' is-cancelled' : ''}`,
    id: `comm-${comm.id}`,
    attrs: { 'data-status': comm.estado },
  }, [
    el('header', { className: 'card-top-bar' }, [
      el('span', { className: 'card-uuid card-uuid-comm', title: comm.id, text: `UUID · ${shortId(comm.id)}` }),
      el('span', { className: `status-badge cstatus-${comm.estado}`, text: COMMITMENT_STATUS_LABEL[comm.estado] }),
    ]),
    el('h3', { className: 'card-title', text: comm.titulo }),
    comm.descripcion ? el('p', { className: 'card-desc', text: comm.descripcion }) : null,
    el('div', { className: 'date-range' }, [
      dateBlock('Inicio', comm.fechaInicio),
      el('span', { className: 'date-arrow', text: '→', attrs: { 'aria-hidden': 'true' } }),
      dateBlock('Fin', comm.fechaFin),
    ]),
    intervalBadge(comm.fechaInicio, comm.fechaFin),
    el('dl', { className: 'card-metadata' }, [
      comm.ubicacion
        ? el('div', { className: 'meta-item' }, [el('dt', { text: 'Lugar' }), el('dd', { text: comm.ubicacion })])
        : null,
      el('div', { className: 'meta-item' }, [
        el('dt', { text: 'Recordatorio' }),
        el('dd', { text: `${comm.minutosRecordatorio} minutos previos` }),
      ]),
    ]),
    el('div', { className: 'participants' }, [
      el('span', { className: 'participants-label', text: `Participantes (${comm.participantes.length})` }),
      el('ul', { className: 'participants-list' }, comm.participantes.map(email => {
        const isCreator = email === comm.userId;
        return el('li', { className: `participant-chip${isCreator ? ' creator' : ''}`, title: email }, [
          email,
          isCreator ? el('span', { className: 'creator-tag', text: 'Creador' }) : null,
        ]);
      })),
    ]),
    el('footer', { className: 'card-actions-bar card-actions-end' }, [
      el('div', { className: 'card-actions' }, actions),
    ]),
  ]);
}
