/** Datos de demostración: solo se cargan si el cuaderno está vacío. */
import { TaskService } from './services/task.service';
import { CommitmentService } from './services/commitment.service';

export function seedDemoDataIfEmpty(taskService: TaskService, commitmentService: CommitmentService): void {
  const H = 3600_000;
  const now = Date.now();
  if (taskService.getAllTasks().length === 0 && commitmentService.getAllCommitments().length === 0) {
    taskService.createTask({
      titulo: 'Auditoría de tintas y pruebas litográficas',
      descripcion: 'Examinar la saturación de los pigmentos oliva y salvia sobre papel verjurado de 120 g.',
      fechaVencimiento: new Date(now + 20 * H),
      prioridad: 'CRITICA',
      etiquetas: ['Taller', 'Calidad'],
    });
    const enProceso = taskService.createTask({
      titulo: 'Composición tipográfica con Cinzel 14 pt',
      descripcion: 'Ajustar el interletraje de los títulos principales de la edición de lujo.',
      fechaVencimiento: new Date(now + 44 * H),
      prioridad: 'ALTA',
      etiquetas: ['Tipografía', 'Diseño'],
    });
    taskService.updateTaskStatus(enProceso.id, 'EN_PROCESO');
    taskService.createTask({
      titulo: 'Inventario de papeles y cartulinas',
      fechaVencimiento: new Date(now + 72 * H),
      prioridad: 'MEDIA',
      etiquetas: ['Almacén'],
    });
    const hecha = taskService.createTask({
      titulo: 'Enviar galeras corregidas al autor',
      fechaVencimiento: new Date(now + 6 * H),
      prioridad: 'BAJA',
      etiquetas: ['Correspondencia'],
    });
    taskService.updateTaskStatus(hecha.id, 'COMPLETADA');

    const start1 = new Date(now + 30 * H); start1.setMinutes(0, 0, 0);
    commitmentService.scheduleCommitment({
      userId: 'editor@cronos.co',
      titulo: 'Mesa redonda: preservación de oficios gráficos',
      descripcion: 'Encuentro con encuadernadores y maestros tipógrafos para el lanzamiento del catálogo.',
      fechaInicio: start1,
      fechaFin: new Date(start1.getTime() + 1.5 * H),
      ubicacion: 'Salón de Prensa Histórica, Carrera 7 # 12-42',
      participantes: ['editor@cronos.co', 'maestro.impresor@cronos.co', 'archivista@museo.org'],
      minutosRecordatorio: 30,
    });
    const start2 = new Date(now + 54 * H); start2.setMinutes(30, 0, 0);
    const confirmado = commitmentService.scheduleCommitment({
      userId: 'editor@cronos.co',
      titulo: 'Revisión de pruebas de color',
      fechaInicio: start2,
      fechaFin: new Date(start2.getTime() + 0.75 * H),
      ubicacion: 'https://meet.cronos.co/pruebas',
      participantes: ['editor@cronos.co', 'colorista@cronos.co'],
    });
    commitmentService.confirmCommitment(confirmado.id);
  }
}
