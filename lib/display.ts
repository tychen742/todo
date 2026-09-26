import type { Profile } from './types';

export function emailDisplayName(email: string | null | undefined) {
  if (!email) return 'User';
  return email.split('@')[0] || email;
}

export function profileDisplayName(profile: Pick<Profile, 'email' | 'display_name'>) {
  return profile.display_name?.trim() || emailDisplayName(profile.email);
}

export function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
