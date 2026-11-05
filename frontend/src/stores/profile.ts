import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  homeCity: string;
  avatarColor: string;
  foodPreference: 'Vegetarian' | 'Non-Veg' | 'Vegan' | 'Jain';
  travelStyle: 'Budget Backpacker' | 'Family Explorer' | 'Heritage & Culture' | 'Nature & Relaxation';
  language: 'Telugu' | 'English' | 'Hindi' | 'Tamil';
  emergencyContact: string;
}

export interface WalletExpense {
  id: string;
  title: string;
  amount: number;
  category: 'Transport' | 'Food' | 'Stay' | 'Shopping' | 'Sightseeing' | 'Misc';
  paidBy: string;
  date: string;
}

export interface GroupTrip {
  roomCode: string;
  tripName: string;
  destination: string;
  members: string[];
  notes: string[];
  createdAt: string;
}

interface ProfileState {
  profile: UserProfile;
  expenses: WalletExpense[];
  currentTrip: GroupTrip | null;
  updateProfile: (data: Partial<UserProfile>) => void;
  addExpense: (expense: Omit<WalletExpense, 'id' | 'date'>) => void;
  removeExpense: (id: string) => void;
  clearExpenses: () => void;
  createGroupTrip: (name: string, destination: string, memberNames: string[]) => string;
  addTripMember: (name: string) => void;
  addTripNote: (note: string) => void;
  leaveTrip: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Chidvilas',
  email: 'ramachidvilas@gmail.com',
  phone: '',
  homeCity: 'Mandapeta / Kakinada',
  avatarColor: '#2563eb',
  foodPreference: 'Non-Veg',
  travelStyle: 'Family Explorer',
  language: 'Telugu',
  emergencyContact: '112',
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      expenses: [
        { id: 'e1', title: 'Subbayya Gari Meals', amount: 480, category: 'Food', paidBy: 'Self', date: 'Today' },
        { id: 'e2', title: 'Rapido Auto to Beach', amount: 120, category: 'Transport', paidBy: 'Self', date: 'Today' },
      ],
      currentTrip: null,
      updateProfile: (data) =>
        set((state) => ({ profile: { ...state.profile, ...data } })),
      addExpense: (exp) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            {
              ...exp,
              id: 'exp_' + Date.now(),
              date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            },
          ],
        })),
      removeExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
      clearExpenses: () => set({ expenses: [] }),
      createGroupTrip: (name, destination, memberNames) => {
        const code = 'TRIP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const trip: GroupTrip = {
          roomCode: code,
          tripName: name,
          destination: destination,
          members: memberNames.length ? memberNames : ['Self'],
          notes: ['Don’t forget sunscreen & camera!', 'Meet at Kakinada Town station Platform 1'],
          createdAt: new Date().toLocaleDateString('en-IN'),
        };
        set({ currentTrip: trip });
        return code;
      },
      addTripMember: (name) => {
        const t = get().currentTrip;
        if (!t || t.members.includes(name)) return;
        set({ currentTrip: { ...t, members: [...t.members, name] } });
      },
      addTripNote: (note) => {
        const t = get().currentTrip;
        if (!t) return;
        set({ currentTrip: { ...t, notes: [...t.notes, note] } });
      },
      leaveTrip: () => set({ currentTrip: null }),
    }),
    {
      name: 'locate-u-user-profile-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
