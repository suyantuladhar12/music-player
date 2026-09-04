import { create } from "zustand";

interface NotificationState {
  message: string | null;
  notify: (message: string) => void;
  dismiss: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  message: null,
  notify: (message: string) => set({ message }),
  dismiss: () => set({ message: null }),
}));
