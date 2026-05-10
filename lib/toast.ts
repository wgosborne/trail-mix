// Toast notification system
// Uses a global event emitter to show/hide toasts

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Event emitter for toast notifications
const toastListeners: Set<(toast: Toast) => void> = new Set();
const removeListeners: Set<(id: string) => void> = new Set();

export function subscribeToToasts(callback: (toast: Toast) => void): () => void {
  toastListeners.add(callback);
  return () => toastListeners.delete(callback);
}

export function subscribeToToastRemoval(callback: (id: string) => void): () => void {
  removeListeners.add(callback);
  return () => removeListeners.delete(callback);
}

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000): string {
  const id = generateId();
  const toast: Toast = { id, message, type, duration };

  // Notify all listeners
  toastListeners.forEach(listener => listener(toast));

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string): void {
  removeListeners.forEach(listener => listener(id));
}

// Convenience functions
export function showSuccess(message: string, duration = 3000): string {
  return showToast(message, 'success', duration);
}

export function showError(message: string, duration = 4000): string {
  return showToast(message, 'error', duration);
}

export function showInfo(message: string, duration = 3000): string {
  return showToast(message, 'info', duration);
}

export function showWarning(message: string, duration = 3000): string {
  return showToast(message, 'warning', duration);
}
