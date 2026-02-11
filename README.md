# subscription-manager

A **framework-agnostic**, dependency-injected subscription management library with first-class React support.

## Features

- 🔌 **Dependency Injection** — You provide storage, we manage subscriptions
- 🎯 **Type-safe** — Full TypeScript generics for your custom subscription shape
- ⚛️ **React Ready** — Built-in provider and hook for React apps
- 🧪 **Testable** — All dependencies are interfaces → trivially mockable
- 📦 **Tree-shakeable** — Core and React bindings are separate entry points

---

## Installation

```bash
npm install subscription-manager
```

For React apps, ensure you have React 17+ installed:

```bash
npm install react react-dom
```

---

## Quick Start

### 1. Define Your Subscription Type

```typescript
import type { ISubscription } from "subscription-manager";

interface MySubscription extends ISubscription {
  plan: "free" | "pro" | "enterprise";
  expiresAt: string;
}
```

### 2. Create a Storage Adapter

Implement the `IStorage<T>` interface for your environment:

```typescript
import type { IStorage } from "subscription-manager";

class LocalStorageAdapter<T extends ISubscription> implements IStorage<T> {
  async get(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  async set(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
```

### 3. Initialize the Manager

```typescript
import { SubscriptionManager } from "subscription-manager";

const manager = new SubscriptionManager<MySubscription>({
  storage: new LocalStorageAdapter(),
  storageKey: "app:subscription",
  onChange: (sub) => console.log("Subscription changed:", sub),
});
```

---

## Usage

### Core API (Framework-agnostic)

```typescript
// Set a subscription
await manager.setSubscription({
  active: true,
  plan: "pro",
  expiresAt: "2026-12-31",
  updatedAt: "", // auto-filled if empty
});

// Get the current subscription
const sub = await manager.getSubscription();
console.log(sub?.plan); // 'pro'

// Check if active
const isActive = await manager.isActive(); // true

// Clear subscription
await manager.clearSubscription();

// Subscribe to changes (observer pattern)
const unsubscribe = manager.subscribe((sub) => {
  console.log("Updated:", sub);
});

// Later: unsubscribe()
```

---

### React Integration

#### Wrap Your App with the Provider

```tsx
import { SubscriptionProvider } from "subscription-manager/react";

function App() {
  return (
    <SubscriptionProvider manager={manager}>
      <Dashboard />
    </SubscriptionProvider>
  );
}
```

#### Use the Hook in Components

```tsx
import { useSubscription } from "subscription-manager/react";

function Dashboard() {
  const {
    subscription,
    isActive,
    loading,
    error,
    setSubscription,
    clearSubscription,
  } = useSubscription<MySubscription>();

  if (loading) return <p>Loading subscription...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>Plan: {subscription?.plan ?? "None"}</h1>
      <p>Status: {isActive ? "Active ✅" : "Inactive ❌"}</p>

      <button
        onClick={() =>
          setSubscription({
            active: true,
            plan: "enterprise",
            expiresAt: "2027-01-01",
            updatedAt: "",
          })
        }
      >
        Upgrade to Enterprise
      </button>

      <button onClick={clearSubscription}>Cancel Subscription</button>
    </div>
  );
}
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your App (Tenant)                                      │
│  ┌──────────────────┐                                   │
│  │ Storage Adapter  │ ← implements IStorage<T>          │
│  │ (localStorage,   │                                   │
│  │  AsyncStorage,   │                                   │
│  │  IndexedDB, etc) │                                   │
│  └────────┬─────────┘                                   │
│           │ injected into                               │
│           ▼                                             │
│  ┌──────────────────────────────────┐                   │
│  │  SubscriptionManager<T>          │                   │
│  │  ┌────────────────────────────┐  │                   │
│  │  │ • getSubscription()        │  │                   │
│  │  │ • setSubscription(sub)     │  │                   │
│  │  │ • clearSubscription()      │  │                   │
│  │  │ • isActive()               │  │                   │
│  │  │ • subscribe(listener)      │  │                   │
│  │  └────────────────────────────┘  │                   │
│  └────────┬─────────────────────────┘                   │
│           │                                             │
│           ▼                                             │
│  ┌──────────────────────────────────┐                   │
│  │  React Provider (optional)       │                   │
│  │  • Hydrates state on mount       │                   │
│  │  • Subscribes to live updates    │                   │
│  │  • Exposes useSubscription hook  │                   │
│  └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Inversion of Control**: The library owns no side-effects. Storage, serialization, and callbacks are all injected by you.

2. **Observer Pattern**: The manager notifies all subscribers whenever the subscription changes (via `setSubscription` or `clearSubscription`).

3. **Auto-timestamping**: If `updatedAt` is empty when calling `setSubscription`, the manager auto-fills it with the current ISO timestamp.

4. **React Hydration**: The `SubscriptionProvider` calls `manager.getSubscription()` on mount to hydrate state from storage, then subscribes to live updates.

---

## API Reference

### Core Types

#### `ISubscription`

Base interface for subscriptions. Extend this with your domain-specific fields.

```typescript
interface ISubscription {
  active: boolean;
  updatedAt: string; // ISO-8601 timestamp
}
```

#### `IStorage<T>`

Storage adapter contract.

```typescript
interface IStorage<T extends ISubscription> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
```

#### `ISubscriptionManagerConfig<T>`

Configuration for creating a manager.

```typescript
interface ISubscriptionManagerConfig<T extends ISubscription> {
  storage: IStorage<T>;
  storageKey: string;
  onChange?: (subscription: T | null) => void;
}
```

---

### `SubscriptionManager<T>`

#### Constructor

```typescript
new SubscriptionManager<T>(config: ISubscriptionManagerConfig<T>)
```

#### Methods

| Method                    | Returns              | Description                                         |
| ------------------------- | -------------------- | --------------------------------------------------- |
| `getSubscription()`       | `Promise<T \| null>` | Retrieve current subscription from storage          |
| `setSubscription(sub: T)` | `Promise<void>`      | Persist a subscription (auto-fills `updatedAt`)     |
| `clearSubscription()`     | `Promise<void>`      | Remove subscription from storage                    |
| `isActive()`              | `Promise<boolean>`   | Check if subscription exists and is active          |
| `subscribe(listener)`     | `() => void`         | Register a change listener (returns unsubscribe fn) |

---

### React API

#### `<SubscriptionProvider>`

```tsx
<SubscriptionProvider manager={manager}>{children}</SubscriptionProvider>
```

#### `useSubscription<T>()`

Hook that returns:

```typescript
{
  subscription: T | null;
  loading: boolean;
  error: Error | null;
  setSubscription: (sub: T) => Promise<void>;
  clearSubscription: () => Promise<void>;
  isActive: boolean;
}
```

---

## Examples

### Using with AsyncStorage (React Native)

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IStorage } from "subscription-manager";

class AsyncStorageAdapter<T extends ISubscription> implements IStorage<T> {
  async get(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  async set(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}
```

### Using with IndexedDB

```typescript
class IndexedDBAdapter<T extends ISubscription> implements IStorage<T> {
  private dbName = "subscriptions";
  private storeName = "subs";

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

---

## Testing

The library includes a full test suite using Vitest:

```bash
npm test
```

Example test with a mock storage adapter:

```typescript
import { describe, it, expect, vi } from "vitest";
import { SubscriptionManager } from "subscription-manager";

const mockStorage = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
};

const manager = new SubscriptionManager({
  storage: mockStorage,
  storageKey: "test:sub",
});

it("persists a subscription", async () => {
  await manager.setSubscription({ active: true, updatedAt: "" });
  expect(mockStorage.set).toHaveBeenCalled();
});
```

---

## License

ISC

---

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.
