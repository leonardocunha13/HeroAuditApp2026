// formValueStore.ts

type Listener = () => void;

class FormValueStore {
  private values: Record<string, string> = {};
  private listeners = new Set<Listener>();

  setValue = (id: string, value: string) => {
    // ✅ create a NEW object reference
    this.values = { ...this.values, [id]: value };
    this.emit();
  };

  getValues = () => this.values;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const formValueStore = new FormValueStore();