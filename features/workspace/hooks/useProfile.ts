import { useCallback, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import type { Profile } from '../../../lib/types';
import { emailDisplayName, profileDisplayName } from '../../../lib/display';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';

type ProfileDeps = Pick<
    FeedbackState,
    | 'setError'
    | 'setMessage'
    | 'showToast'
  > &
  Pick<
    AuthState,
    | 'session'
  >;

export function useProfile({
  setError,
  setMessage,
  showToast,
  session,
}: ProfileDeps) {
  const [navExpanded, setNavExpanded] = useState(false);
  const [statusEditing, setStatusEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [animalPickerVisible, setAnimalPickerVisible] = useState(false);
  const [customAnimal, setCustomAnimal] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editDisplayNameValue, setEditDisplayNameValue] = useState('');
  const accountDisplayName = profile
    ? profileDisplayName(profile)
    : emailDisplayName(session?.user.email);

  const ensureProfile = useCallback(async (currentSession: Session) => {
    const profileEmail = currentSession.user.email?.toLowerCase();
    if (!profileEmail) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: currentSession.user.id,
        email: profileEmail,
      })
      .select('id, email, display_name, avatar_url, status')
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData);
    setStatusDraft(profileData.status ?? '');
  }, [setError]);

  async function uploadProfilePhoto() {
    if (!session) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    const contentType = asset.mimeType ?? 'image/jpeg';
    const extension = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
    const path = `${session.user.id}/avatar-${Date.now()}.${extension}`;

    let body: Blob;
    if (asset.file) {
      body = asset.file;
    } else {
      body = await fetch(asset.uri).then((res) => res.blob());
    }
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, body, { contentType, upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = publicUrlData.publicUrl;
    const { data: nextProfile, error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', session.user.id)
      .select('id, email, display_name, avatar_url, status')
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(nextProfile);
    setCustomAnimal(null);
    setAnimalPickerVisible(false);
    showToast('Profile photo updated.');
  }

  async function saveStatus() {
    setStatusEditing(false);
    if (!session) return;
    const status = statusDraft.trim() || null;
    await supabase.from('profiles').update({ status }).eq('id', session.user.id);
    setProfile((prev) => prev ? { ...prev, status } : prev);
  }

  async function saveDisplayName() {
    if (!session) return;
    const name = editDisplayNameValue.trim();
    const { error: err } = await supabase.from('profiles').update({ display_name: name || null }).eq('id', session.user.id);
    if (err) { setError(err.message); return; }
    setProfile((prev) => prev ? { ...prev, display_name: name || null } : prev);
    setEditingDisplayName(false);
    setError('');
  }

  function choosePlannedUserFeature(label: string) {
    setMessage(`${label} is planned.`);
    setError('');
  }

  return {
    navExpanded,
    setNavExpanded,
    statusEditing,
    setStatusEditing,
    profile,
    setProfile,
    animalPickerVisible,
    setAnimalPickerVisible,
    customAnimal,
    setCustomAnimal,
    statusDraft,
    setStatusDraft,
    editingDisplayName,
    setEditingDisplayName,
    editDisplayNameValue,
    setEditDisplayNameValue,
    accountDisplayName,
    ensureProfile,
    uploadProfilePhoto,
    saveStatus,
    saveDisplayName,
  };
}

export type ProfileState = ReturnType<typeof useProfile>;
