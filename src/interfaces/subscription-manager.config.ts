import type { ISubscription } from './subscription.interface';
import type { IStorage } from './storage.interface';

/**
 * Configuration object for creating a {@link SubscriptionManager}.
 */
export interface ISubscriptionManagerConfig<T extends ISubscription> {
  /** Storage adapter provided by the tenant */
  storage: IStorage<T>;

  /** Unique key used to namespace this subscription in storage */
  storageKey: string;

  /**
   * Optional callback invoked whenever the subscription changes.
   * Useful for analytics, logging, or side-effects outside React.
   */
  onChange?: (subscription: T | null) => void;
}
