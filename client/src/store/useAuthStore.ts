import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser } from '../types/auth';

interface AuthState {
  token: string | null;
  user: StaffUser | null;
  setSession: (token: string, user: StaffUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: 'servesync-staff-auth' }
  )
);
