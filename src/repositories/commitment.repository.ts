import { Commitment } from '../domain/commitment';
import { safeJsonParse } from '../security/sanitizer';

export interface ICommitmentRepository {
  save(commitment: Commitment): void;
  findById(id: string): Commitment | null;
  findAll(): Commitment[];
  findByUserId(userId: string): Commitment[];
  delete(id: string): boolean;
  clear(): void;
}

export class LocalStorageCommitmentRepository implements ICommitmentRepository {
  private readonly storageKey: string;
  private inMemoryFallback: Map<string, string> = new Map();

  constructor(storageKey: string = 'cronos_commitments_db') {
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

  public save(commitment: Commitment): void {
    const data = this.readRawData();
    data[commitment.id] = commitment.toJSON();
    this.writeRawData(data);
  }

  public findById(id: string): Commitment | null {
    const data = this.readRawData();
    const item = data[id];
    if (!item) return null;
    return Commitment.fromJSON(item);
  }

  public findAll(): Commitment[] {
    const data = this.readRawData();
    return Object.values(data).map(item => Commitment.fromJSON(item));
  }

  public findByUserId(userId: string): Commitment[] {
    const all = this.findAll();
    return all.filter(c => c.userId === userId || c.participantes.includes(userId));
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
