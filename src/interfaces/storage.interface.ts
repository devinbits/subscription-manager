import type { ISubscription } from './subscription.interface';

/**
 * Storage adapter contract.
 *
 * The tenant provides an implementation (localStorage, AsyncStorage, a DB, etc.)
 * so the library stays free of environment-specific dependencies.
 *
 * @example
 * ```typescript
 * class LocalStorageAdapter<T extends ISubscription> implements IStorage<T> {
 *   async get(key: string) {
 *     const raw = localStorage.getItem(key);
 *     return raw ? JSON.parse(raw) as T : null;
 *   }
 *   async set(key: string, value: T) {
 *     localStorage.setItem(key, JSON.stringify(value));
 *   }
 *   async remove(key: string) {
 *     localStorage.removeItem(key);
 *   }
 * }
 * ```
 */
export interface IStorage<T extends ISubscription> {
  /** Retrieve a subscription by key. Return `null` if not found. */
  get(key: string): Promise<T | null>;

  /** Persist a subscription under the given key. */
  set(key: string, value: T): Promise<void>;

  /** Remove the subscription stored under the given key. */
  remove(key: string): Promise<void>;
}
