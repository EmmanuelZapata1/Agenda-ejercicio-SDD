# Cronos & Co. — Agenda de Tareas y Compromisos

Implementación del SDD [`sdd-agenda-tareas.md`](sdd-agenda-tareas.md) con el sistema de diseño
[`cronos_co._design_system.md`](cronos_co._design_system.md) (estética Aurora Vintage, rigor cromático 60/40).

## Ejecutar

```bash
npm install
npm run dev      # servidor de desarrollo (Vite)
npm test         # pruebas unitarias (Vitest)
npm run build    # verificación de tipos + build de producción en dist/
```

## Arquitectura

| Capa | Carpeta | Contenido |
| :--- | :--- | :--- |
| Dominio | `src/domain/` | Entidades `Task` y `Commitment`, enums, DTOs y excepciones (`TaskValidationException`, `ScheduleConflictException`) |
| Repositorios | `src/repositories/` | `ITaskRepository`, `ICommitmentRepository` y sus implementaciones sobre `localStorage` con parseo seguro |
| Servicios | `src/services/` | `TaskService` y `CommitmentService` (contratos de la sección 4 del SDD) |
| Seguridad | `src/security/` | Sanitización, validación RFC 5322, UUID con `crypto.randomUUID()`, JSON anti-polución de prototipos |
| Presentación | `src/ui/`, `src/main.ts`, `src/style.css` | Componentes construidos con nodos DOM (`textContent`, sin `innerHTML`) y tokens del design system |

## Reglas de negocio cubiertas

- **RN-01** — La fecha de vencimiento de una tarea no puede estar en el pasado.
- **RN-02** — `COMPLETADA` y `CANCELADA` son estados terminales (cada tarjeta solo ofrece las acciones válidas).
- **RN-03** — Sin solapamiento de compromisos `PROGRAMADO`/`CONFIRMADO` para el mismo creador.
- **RN-04** — Duración mínima de 15 minutos (insignia "Intervalo verificado" en vivo).
- **RN-05** — Participantes con formato RFC 5322; el creador se incluye siempre.

## Interfaz

La app está organizada en páginas separadas (enrutamiento por `#/ruta`, funcionan los botones Atrás/Adelante):

| Página | Ruta | Para qué sirve |
| :--- | :--- | :--- |
| Inicio | `#/inicio` | Resumen: pendientes, en proceso, vencidas y próximos compromisos |
| Tareas | `#/tareas` | Lista con buscador, filtros por estado y prioridad, y acciones Iniciar / Completar / Cancelar |
| Compromisos | `#/compromisos` | Lista con buscador, filtro por estado y acciones Confirmar / Cancelar |
| Nueva tarea | `#/nueva-tarea` | Formulario de alta de tareas |
| Nuevo compromiso | `#/nuevo-compromiso` | Formulario de alta con aviso en vivo de duración y cruces de horario |

- Escritorio (> 1025 px): navegación lateral fija de 240 px.
- Tablet (641–1024 px): barra superior con botón «Menú» y rejilla de 2 columnas.
- Móvil (< 640 px): una sola columna, filtros con scroll horizontal táctil y formularios apilados.
- Los avisos de éxito o error aparecen flotando abajo a la derecha, siempre a la vista; los errores de un formulario también se muestran junto al botón Guardar.
