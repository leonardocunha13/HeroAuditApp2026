// GLOBAL lightweight store (no React context needed)

type Listener = () => void;

class FormValueStore {
  private values: Record<string, string> = {};
  private listeners: Listener[] = [];

  setValue(id: string, value: string) {
    this.values[id] = value;
    this.emit();
  }

  getValues() {
    return this.values;
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(l => l());
  }
}

export const formValueStore = new FormValueStore();