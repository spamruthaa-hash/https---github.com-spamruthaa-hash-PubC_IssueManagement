export interface AppUser {
  email: string;
  password: string;
  name: string;
  initials: string;
}

export const USERS: AppUser[] = [
  {
    email: 'johndoe@publisher.com',
    password: 'admin',
    name: 'John Doe',
    initials: 'JD',
  },
  {
    email: 'janedan@publisher.com',
    password: 'admin',
    name: 'Jane Dan',
    initials: 'JD',
  },
  {
    email: 'johnd@publisher.com',
    password: 'admin',
    name: 'John D',
    initials: 'JD',
  },
];

export function authenticateUser(email: string, password: string): AppUser | null {
  const user = USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  return user ?? null;
}

export const JANE_DAN_EMAIL = 'janedan@publisher.com';

export function isJaneDanEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === JANE_DAN_EMAIL;
}

export const JOHN_D_EMAIL = 'johnd@publisher.com';

export function isJohnDEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === JOHN_D_EMAIL;
}
