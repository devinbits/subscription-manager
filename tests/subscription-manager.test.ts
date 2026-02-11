import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionManager } from '../src/subscription-manager';
import type { ISubscription } from '../src/interfaces/subscription.interface';
import type { IStorage } from '../src/interfaces/storage.interface';

// ── Test subscription type ──────────────────────────────────────────────

interface TestSubscription extends ISubscription {
  plan: 'free' | 'pro';
}

// ── In-memory mock storage ──────────────────────────────────────────────

function createMockStorage(): IStorage<TestSubscription> {
  const store = new Map<string, TestSubscription>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: TestSubscription) => {
      store.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('SubscriptionManager', () => {
  const STORAGE_KEY = 'test:sub';
  let storage: IStorage<TestSubscription>;
  let manager: SubscriptionManager<TestSubscription>;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new SubscriptionManager<TestSubscription>({
      storage,
      storageKey: STORAGE_KEY,
    });
  });

  // ── getSubscription ────────────────────────────────────────────────

  it('returns null when no subscription exists', async () => {
    const result = await manager.getSubscription();
    expect(result).toBeNull();
    expect(storage.get).toHaveBeenCalledWith(STORAGE_KEY);
  });

  // ── setSubscription / getSubscription round-trip ───────────────────

  it('persists and retrieves a subscription', async () => {
    const sub: TestSubscription = { active: true, plan: 'pro', updatedAt: '' };

    await manager.setSubscription(sub);
    const result = await manager.getSubscription();

    expect(result).not.toBeNull();
    expect(result!.active).toBe(true);
    expect(result!.plan).toBe('pro');
  });

  // ── updatedAt auto-fill ────────────────────────────────────────────

  it('auto-fills updatedAt when it is empty', async () => {
    const sub: TestSubscription = { active: true, plan: 'free', updatedAt: '' };

    await manager.setSubscription(sub);
    const result = await manager.getSubscription();

    expect(result!.updatedAt).toBeTruthy();
    // Should be a valid ISO string
    expect(new Date(result!.updatedAt).toISOString()).toBe(result!.updatedAt);
  });

  it('preserves updatedAt when already provided', async () => {
    const ts = '2025-01-01T00:00:00.000Z';
    const sub: TestSubscription = { active: true, plan: 'pro', updatedAt: ts };

    await manager.setSubscription(sub);
    const result = await manager.getSubscription();

    expect(result!.updatedAt).toBe(ts);
  });

  // ── isActive ───────────────────────────────────────────────────────

  it('returns true when subscription is active', async () => {
    await manager.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
    expect(await manager.isActive()).toBe(true);
  });

  it('returns false when subscription is inactive', async () => {
    await manager.setSubscription({ active: false, plan: 'free', updatedAt: '' });
    expect(await manager.isActive()).toBe(false);
  });

  it('returns false when no subscription exists', async () => {
    expect(await manager.isActive()).toBe(false);
  });

  // ── clearSubscription ──────────────────────────────────────────────

  it('removes subscription from storage', async () => {
    await manager.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
    await manager.clearSubscription();

    const result = await manager.getSubscription();
    expect(result).toBeNull();
    expect(storage.remove).toHaveBeenCalledWith(STORAGE_KEY);
  });

  // ── subscribe (observer pattern) ──────────────────────────────────

  it('notifies listeners on setSubscription', async () => {
    const listener = vi.fn();
    manager.subscribe(listener);

    const sub: TestSubscription = { active: true, plan: 'pro', updatedAt: '' };
    await manager.setSubscription(sub);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, plan: 'pro' }),
    );
  });

  it('notifies listeners with null on clearSubscription', async () => {
    const listener = vi.fn();
    manager.subscribe(listener);

    await manager.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
    await manager.clearSubscription();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);
  });

  it('stops notifying after unsubscribe', async () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    await manager.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    await manager.setSubscription({ active: false, plan: 'free', updatedAt: '' });
    expect(listener).toHaveBeenCalledTimes(1); // still 1
  });

  // ── onChange config callback ───────────────────────────────────────

  it('calls onChange callback on setSubscription', async () => {
    const onChange = vi.fn();
    const mgr = new SubscriptionManager<TestSubscription>({
      storage,
      storageKey: STORAGE_KEY,
      onChange,
    });

    await mgr.setSubscription({ active: true, plan: 'pro', updatedAt: '' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, plan: 'pro' }),
    );
  });

  it('calls onChange callback with null on clearSubscription', async () => {
    const onChange = vi.fn();
    const mgr = new SubscriptionManager<TestSubscription>({
      storage,
      storageKey: STORAGE_KEY,
      onChange,
    });

    await mgr.setSubscription({ active: true, plan: 'pro', updatedAt: '' });
    await mgr.clearSubscription();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
