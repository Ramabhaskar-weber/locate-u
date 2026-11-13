import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  homeCity: string;
  avatarColor: string;
  avatarUrl?: string | null;
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

export interface GroupMemberDetail {
  name: string;
  relation?: string;
  phone?: string;
  email?: string;
}

export interface GroupTrip {
  roomCode: string;
  tripName: string;
  destination: string;
  members: string[];
  memberDetails?: GroupMemberDetail[];
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
  createGroupTrip: (name: string, destination: string, memberNames?: string[]) => string;
  joinGroupTrip: (roomCode: string, tripName?: string, destination?: string, initialMembers?: string[]) => void;
  addTripMember: (name: string, relation?: string, phone?: string, email?: string) => void;
  removeTripMember: (name: string) => void;
  addTripNote: (note: string) => void;
  removeTripNote: (index: number) => void;
  leaveTrip: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Chidvilas',
  email: 'ramachidvilas@gmail.com',
  phone: '',
  homeCity: 'Kakinada',
  avatarColor: '#2563eb',
  avatarUrl: null,
  foodPreference: 'Vegetarian',
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
        const selfName = get().profile.name || 'Self';
        const baseMembers = memberNames && memberNames.length > 0 ? memberNames : [selfName];
        const code = 'TRIP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const trip: GroupTrip = {
          roomCode: code,
          tripName: name.trim() || 'Family Trip',
          destination: destination.trim() || 'Tirupati',
          members: baseMembers,
          memberDetails: baseMembers.map((m, idx) => ({
            name: m,
            relation: idx === 0 ? 'Organizer (Self)' : 'Family / Friend',
            phone: idx === 0 ? get().profile.phone : '',
            email: idx === 0 ? get().profile.email : '',
          })),
          notes: ['Don’t forget ID cards, tickets & chargers!', 'Share live location on Map before departure'],
          createdAt: new Date().toLocaleDateString('en-IN'),
        };
        set({ currentTrip: trip });
        return code;
      },
      joinGroupTrip: (roomCode, tripName, destination, initialMembers) => {
        const selfName = get().profile.name || 'Self';
        const rawMembers = initialMembers && initialMembers.length > 0 ? initialMembers : [selfName];
        const uniqueMembers = Array.from(new Set([...rawMembers, selfName]));
        const trip: GroupTrip = {
          roomCode: roomCode.trim().toUpperCase(),
          tripName: tripName?.trim() || 'Joined Family & Friends Trip',
          destination: destination?.trim() || 'Shared Destination',
          members: uniqueMembers,
          memberDetails: uniqueMembers.map((m) => ({
            name: m,
            relation: m === selfName ? 'You' : 'Group Member',
          })),
          notes: ['Joined via shared Room Code!', 'Coordinate pickup & expenses here'],
          createdAt: new Date().toLocaleDateString('en-IN'),
        };
        set({ currentTrip: trip });
      },
      addTripMember: (name, relation = 'Family', phone = '', email = '') => {
        const t = get().currentTrip;
        if (!t) return;
        const clean = name.trim();
        if (!clean) return;
        const existingLower = t.members.map((m) => m.toLowerCase());
        if (existingLower.includes(clean.toLowerCase())) return;
        const nextMembers = [...t.members, clean];
        const prevDetails = t.memberDetails || t.members.map((m) => ({ name: m, relation: 'Member' }));
        const nextDetails: GroupMemberDetail[] = [
          ...prevDetails,
          { name: clean, relation: relation.trim() || 'Family', phone: phone.trim(), email: email.trim() },
        ];
        set({
          currentTrip: {
            ...t,
            members: nextMembers,
            memberDetails: nextDetails,
          },
        });
      },
      removeTripMember: (name) => {
        const t = get().currentTrip;
        if (!t) return;
        if (t.members.length <= 1) return;
        const nextMembers = t.members.filter((m) => m !== name);
        const nextDetails = (t.memberDetails || []).filter((d) => d.name !== name);
        set({
          currentTrip: {
            ...t,
            members: nextMembers,
            memberDetails: nextDetails,
          },
        });
      },
      addTripNote: (note) => {
        const t = get().currentTrip;
        if (!t) return;
        const clean = note.trim();
        if (!clean) return;
        set({ currentTrip: { ...t, notes: [...t.notes, clean] } });
      },
      removeTripNote: (index) => {
        const t = get().currentTrip;
        if (!t) return;
        set({ currentTrip: { ...t, notes: t.notes.filter((_, idx) => idx !== index) } });
      },
      leaveTrip: () => set({ currentTrip: null }),
    }),
    {
      name: 'locate-u-user-profile-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
