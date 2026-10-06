import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { workspaceNotesStorageKey } from './mindmaps';

export type AccountDeletionImpact = {
  kind: 'organization' | 'team' | 'project';
  id: string;
  name: string;
  other_members: number;
};

// Shared spaces that will be deleted for other members along with this account.
export async function loadAccountDeletionImpact(): Promise<AccountDeletionImpact[]> {
  const { data, error } = await supabase.rpc('account_deletion_preview');
  if (error) throw new Error(error.message);
  return (data ?? []) as AccountDeletionImpact[];
}

// Server data plus the notes that only live on this device.
export async function buildAccountExport(userId: string) {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw new Error(error.message);
  const [calendarNotes, workspaceNotes] = await Promise.all([
    AsyncStorage.getItem(`todo:calendar-notes:${userId}`).catch(() => null),
    AsyncStorage.getItem(workspaceNotesStorageKey(userId)).catch(() => null),
  ]);
  return {
    ...(data as Record<string, unknown>),
    this_device: {
      calendar_notes: calendarNotes ? JSON.parse(calendarNotes) : {},
      workspace_notes: workspaceNotes ? JSON.parse(workspaceNotes) : null,
    },
  };
}

// Web downloads a .json file; native opens the share sheet with the JSON text.
export async function saveAccountExport(exportData: unknown) {
  const json = JSON.stringify(exportData, null, 2);
  const filename = `rodoflow-export-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: json });
}

// Profile photos are removed through the Storage API (Supabase does not allow
// deleting storage objects from SQL), then the database function deletes the
// account and hands shared work to the remaining owners.
export async function deleteAccount(userId: string) {
  const { data: files, error: listError } = await supabase.storage.from('avatars').list(userId);
  if (listError) throw new Error(listError.message);
  if (files && files.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('avatars')
      .remove(files.map((file) => `${userId}/${file.name}`));
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);

  await Promise.all([
    AsyncStorage.removeItem(`todo:calendar-notes:${userId}`).catch(() => undefined),
    AsyncStorage.removeItem(workspaceNotesStorageKey(userId)).catch(() => undefined),
  ]);
  // The user no longer exists on the server, so only clear the local session.
  await supabase.auth.signOut({ scope: 'local' });
}
