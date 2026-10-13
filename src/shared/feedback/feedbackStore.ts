import { create } from 'zustand';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text?: string;
  style?: DialogButtonStyle;
  onPress?: (value?: string) => void;
}

export interface DialogConfig {
  title: string;
  message?: string;
  buttons: DialogButton[];
  cancelable?: boolean;
  /** Optional Feather icon shown above the title. */
  icon?: string;
}

interface FeedbackState {
  /** Mounted FeedbackHosts, last = topmost (inside the most recently opened modal). */
  hosts: number[];
  dialog: (DialogConfig & { id: number }) | null;
  registerHost: (id: number) => void;
  unregisterHost: (id: number) => void;
  showDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
}

let dialogSeq = 0;

export const useFeedbackStore = create<FeedbackState>((set) => ({
  hosts: [],
  dialog: null,
  registerHost: (id) => set((s) => ({ hosts: [...s.hosts.filter((h) => h !== id), id] })),
  unregisterHost: (id) => set((s) => ({ hosts: s.hosts.filter((h) => h !== id) })),
  showDialog: (config) => set({ dialog: { ...config, id: ++dialogSeq } }),
  closeDialog: () => set({ dialog: null }),
}));
