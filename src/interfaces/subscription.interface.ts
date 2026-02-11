/**
 * Base subscription interface.
 *
 * Tenants extend this to add domain-specific fields:
 * @example
 * ```typescript
 * interface MySubscription extends ISubscription {
 *   plan: 'free' | 'pro' | 'enterprise';
 *   expiresAt: string;
 * }
 * ```
 */
export interface ISubscription {
  /** Whether the subscription is currently active */
  active: boolean;

  /** ISO-8601 timestamp of the last update — auto-set by the manager if omitted */
  updatedAt: string;
}
