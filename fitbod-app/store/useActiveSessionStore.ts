import { create } from 'zustand';

interface ActiveSessionStore {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export const useActiveSessionStore = create<ActiveSessionStore>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}));
