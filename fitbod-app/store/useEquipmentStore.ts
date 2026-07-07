import { create } from 'zustand';

interface EquipmentStore {
  availableEquipmentIds: string[];
  setAvailableEquipmentIds: (ids: string[]) => void;
}

export const useEquipmentStore = create<EquipmentStore>((set) => ({
  availableEquipmentIds: [],
  setAvailableEquipmentIds: (ids) => set({ availableEquipmentIds: ids }),
}));
