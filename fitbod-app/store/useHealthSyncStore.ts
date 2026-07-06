import { create } from 'zustand';

interface HealthSyncStore {
  isConnected: boolean;
  lastSyncedAt: string | null;
  setConnected: (connected: boolean) => void;
  setLastSyncedAt: (timestamp: string) => void;
}

export const useHealthSyncStore = create<HealthSyncStore>((set) => ({
  isConnected: false,
  lastSyncedAt: null,
  setConnected: (connected) => set({ isConnected: connected }),
  setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
}));
