import { projectCaptureAbbreviation } from './quickCapture';

const AVATAR_COLORS = ['#e74c3c', '#e67e22', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#d97706'];

export const AVATAR_ANIMALS = [
  '🐶','🐱','🦊','🐻','🐼','🐨','🐯','🦁',
  '🐸','🐵','🐧','🦆','🦉','🦋','🐢','🐬',
  '🐙','🦈','🦝','🐺','🦦','🦥','🦔','🐿',
  '🦄','🦜','🦩','🐉','🦋','🐡',
];

export function pickAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function pickAvatarAnimal(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) + h);
  return AVATAR_ANIMALS[Math.abs(h) % AVATAR_ANIMALS.length];
}

export function projectInitials(name: string): string {
  return projectCaptureAbbreviation(name);
}
