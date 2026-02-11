import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ISubscription } from '../interfaces/subscription.interface';
import type { SubscriptionManager } from '../subscription-manager';

// ── Context value ────────────────────────────────────────────────────────

export interface SubscriptionContextValue<T extends ISubscription> {
  /** Current subscription, or `null` if none is set */
  subscription: T | null;
  /** `true` while the initial hydration from storage is in-flight */
  loading: boolean;
  /** Populated if hydration fails */
  error: Error | null;
  /** Persist a subscription (delegates to the manager) */
  setSubscription: (sub: T) => Promise<void>;
  /** Remove the subscription (delegates to the manager) */
  clearSubscription: () => Promise<void>;
  /** Convenience boolean derived from `subscription?.active` */
  isActive: boolean;
}

// Using `any` for the context default is intentional — it's overridden by the provider.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SubscriptionContext = createContext<SubscriptionContextValue<any> | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────

export interface SubscriptionProviderProps<T extends ISubscription> {
  manager: SubscriptionManager<T>;
  children: React.ReactNode;
}

/**
 * Provides subscription state to the React tree.
 *
 * Hydrates from the manager on mount and subscribes to live updates.
 *
 * @example
 * ```tsx
 * <SubscriptionProvider manager={manager}>
 *   <App />
 * </SubscriptionProvider>
 * ```
 */
export function SubscriptionProvider<T extends ISubscription>({
  manager,
  children,
}: SubscriptionProviderProps<T>) {
  const [subscription, setSubscriptionState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a stable ref to avoid re-subscribing on every render
  const managerRef = useRef(manager);
  managerRef.current = manager;

  // Hydrate on mount
  useEffect(() => {
    let cancelled = false;

    managerRef.current
      .getSubscription()
      .then((sub: T | null) => {
        if (!cancelled) {
          setSubscriptionState(sub);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    // Subscribe to future changes
    const unsubscribe = managerRef.current.subscribe((sub: T | null) => {
      if (!cancelled) {
        setSubscriptionState(sub);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [manager]);

  const setSubscription = useCallback(
    async (sub: T) => {
      await managerRef.current.setSubscription(sub);
    },
    [manager],
  );

  const clearSubscription = useCallback(async () => {
    await managerRef.current.clearSubscription();
  }, [manager]);

  const value = useMemo<SubscriptionContextValue<T>>(
    () => ({
      subscription,
      loading,
      error,
      setSubscription,
      clearSubscription,
      isActive: subscription?.active ?? false,
    }),
    [subscription, loading, error, setSubscription, clearSubscription],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Access subscription state from within a {@link SubscriptionProvider}.
 *
 * @throws If used outside a provider.
 *
 * @example
 * ```tsx
 * function Plan() {
 *   const { subscription, isActive, setSubscription } = useSubscription<MySubscription>();
 *   // …
 * }
 * ```
 */
export function useSubscription<T extends ISubscription>(): SubscriptionContextValue<T> {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      'useSubscription must be used within a <SubscriptionProvider>',
    );
  }
  return ctx as SubscriptionContextValue<T>;
}
