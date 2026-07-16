export type StaffRole = 'ADMIN' | 'KITCHEN';

export interface StaffUser {
  id: string;
  username: string;
  role: StaffRole;
}

export interface LoginResponse {
  token: string;
  user: StaffUser;
}
