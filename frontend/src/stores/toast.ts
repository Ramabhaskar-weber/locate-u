import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: 'info' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ms?: number) => number;
  dismiss: (id: number) => void;
}

let n = 0;
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t, ms = 3800) => {
    const id = ++n;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    if (ms > 0) setTimeout(() => get().dismiss(id), ms);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = (title: string, opts: Omit<Toast, 'id' | 'title'> = {}, ms?: number) =>
  useToasts.getState().push({ title, ...opts }, ms);
