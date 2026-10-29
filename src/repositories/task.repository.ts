import { Task } from '../domain/task';
import { safeJsonParse } from '../security/sanitizer';

export interface ITaskRepository {
  save(task: Task): void;
  findById(id: string): Task | null;
  findAll(): Task[];
  delete(id: string): boolean;
  clear(): void;
}

export class LocalStorageTaskRepository implements ITaskRepository {
  private readonly storageKey: string;
  private inMemoryFallback: Map<string, string> = new Map();

  constructor(storageKey: string = 'cronos_tasks_db') {
    this.storageKey = storageKey;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private readRawData(): Record<string, any> {
    if (this.isLocalStorageAvailable()) {
      const raw = window.localStorage.getItem(this.storageKey);
      return safeJsonParse<Record<string, any>>(raw, {});
    } else {
      const result: Record<string, any> = {};
      this.inMemoryFallback.forEach((val, key) => {
        result[key] = safeJsonParse(val, null);
      });
      return result;
    }
  }

  private writeRawData(data: Record<string, any>): void {
    const serialized = JSON.stringify(data);
    if (this.isLocalStorageAvailable()) {
      window.localStorage.setItem(this.storageKey, serialized);
    } else {
      this.inMemoryFallback.clear();
      Object.entries(data).forEach(([k, v]) => {
        this.inMemoryFallback.set(k, JSON.stringify(v));
      });
    }
  }

  public save(task: Task): void {
    const data = this.readRawData();
    data[task.id] = task.toJSON();
    this.writeRawData(data);
  }

  public findById(id: string): Task | null {
    const data = this.readRawData();
    const item = data[id];
    if (!item) return null;
    return Task.fromJSON(item);
  }

  public findAll(): Task[] {
    const data = this.readRawData();
    return Object.values(data).map(item => Task.fromJSON(item));
  }

  public delete(id: string): boolean {
    const data = this.readRawData();
    if (!data[id]) return false;
    delete data[id];
    this.writeRawData(data);
    return true;
  }

  public clear(): void {
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(this.storageKey);
    }
    this.inMemoryFallback.clear();
  }
}
