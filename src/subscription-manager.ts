import type { ISubscription } from './interfaces/subscription.interface';
import type { ISubscriptionManagerConfig } from './interfaces/subscription-manager.config';

/**
 * Generic, framework-agnostic subscription manager.
 *
 * All external dependencies (storage, callbacks) are injected via
 * {@link ISubscriptionManagerConfig} — the library owns no side-effects.
 *
 * @typeParam T - The tenant's subscription shape (must extend {@link ISubscription}).
 *
 * @example
 * ```typescript
 * const manager = new SubscriptionManager<MySubscription>({
 *   storage: new LocalStorageAdapter(),
 *   storageKey: 'app:subscription',
 * });
 *
 * await manager.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
 * const sub = await manager.getSubscription();
 * ```
 */
export class SubscriptionManager<T extends ISubscription> {
  private readonly config: ISubscriptionManagerConfig<T>;
  private readonly listeners: Set<(sub: T | null) => void> = new Set();

  constructor(config: ISubscriptionManagerConfig<T>) {
    this.config = config;
  }

  // ── Getters ──────────────────────────────────────────────────────────

  /** Retrieve the current subscription from storage. Returns `null` if none exists. */
  async getSubscription(): Promise<T | null> {
    return this.config.storage.get(this.config.storageKey);
  }

  /** Convenience getter — `true` when a subscription exists and its `active` flag is set. */
  async isActive(): Promise<boolean> {
    const sub = await this.getSubscription();
    return sub?.active ?? false;
  }

  // ── Setters ──────────────────────────────────────────────────────────

  /**
   * Persist a subscription to storage.
   *
   * If `updatedAt` is falsy the manager auto-fills it with the current ISO timestamp.
   */
  async setSubscription(subscription: T): Promise<void> {
    const toStore: T = {
      ...subscription,
      updatedAt: subscription.updatedAt || new Date().toISOString(),
    };
    await this.config.storage.set(this.config.storageKey, toStore);
    this.notify(toStore);
  }

  /** Remove the subscription from storage and notify listeners with `null`. */
  async clearSubscription(): Promise<void> {
    await this.config.storage.remove(this.config.storageKey);
    this.notify(null);
  }

  // ── Observer ─────────────────────────────────────────────────────────

  /**
   * Register a listener that is called whenever the subscription changes.
   *
   * @returns An unsubscribe function.
   */
  subscribe(listener: (sub: T | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private notify(subscription: T | null): void {
    this.config.onChange?.(subscription);
    this.listeners.forEach((fn) => fn(subscription));
  }
}
