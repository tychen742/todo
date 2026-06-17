import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type ProjectInvitation = {
  project_id: string;
  project_name: string;
  email: string;
  status: string;
  invited_by_email: string | null;
  invited_by_display_name: string | null;
};

export default function ProjectInviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const invitationToken = Array.isArray(token) ? token[0] : token;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!invitationToken) {
        setError('Missing invitation token.');
        setLoading(false);
        return;
      }

      const [{ data: sessionData }, { data: inviteData, error: inviteError }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.rpc('get_project_invitation_by_token', { p_token: invitationToken }),
      ]);

      if (cancelled) return;

      if (inviteError) {
        setError(inviteError.message);
        setLoading(false);
        return;
      }

      const invite = (inviteData?.[0] ?? null) as ProjectInvitation | null;
      setInvitation(invite);
      setSignedInEmail(sessionData.session?.user.email?.toLowerCase() ?? null);
      setLoading(false);
    }

    load().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Could not load invitation.');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [invitationToken]);

  async function acceptInvitation() {
    if (!invitationToken || accepting) return;
    setAccepting(true);
    setError('');
    try {
      const { data, error: acceptError } = await supabase.rpc('accept_project_invitation', {
        p_token: invitationToken,
      });
      if (acceptError) {
        setError(acceptError.message);
        return;
      }

      const projectId = data?.[0]?.project_id;
      if (!projectId) {
        setError('The invitation could not be accepted.');
        return;
      }

      setMessage('Invitation accepted. Opening the project...');
      router.replace(`/project/${projectId}`);
    } finally {
      setAccepting(false);
    }
  }

  const canAccept = !!invitation && !!signedInEmail && signedInEmail === invitation.email.toLowerCase() && invitation.status === 'pending';

  return (
    <>
      <Stack.Screen options={{ title: 'Project invitation' }} />
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 560, backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827' }}>Project invitation</Text>
          {loading ? (
            <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading invitation...</Text>
          ) : error ? (
            <Text style={{ marginTop: 16, color: '#dc2626', fontWeight: '600' }}>{error}</Text>
          ) : invitation ? (
            <>
              <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: '#111827' }}>
                {invitation.project_name}
              </Text>
              <Text style={{ marginTop: 8, color: '#6b7280', lineHeight: 22 }}>
                {invitation.invited_by_display_name || invitation.invited_by_email || 'Someone'} invited
                {' '}
                {invitation.email}
                {' '}
                to this project in TODO.prj.
              </Text>
              <Text style={{ marginTop: 12, color: '#374151', lineHeight: 22 }}>
                If you are not already a member of TODO.prj, create a member account first. Then sign in with this email address to accept the invitation.
              </Text>
              {signedInEmail ? (
                <Text style={{ marginTop: 12, color: signedInEmail === invitation.email.toLowerCase() ? '#059669' : '#b45309', fontWeight: '600' }}>
                  Signed in as {signedInEmail}
                </Text>
              ) : null}
              {message ? <Text style={{ marginTop: 12, color: '#2563eb' }}>{message}</Text> : null}
              <View style={{ marginTop: 20, flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <Pressable
                  onPress={() => router.replace('/')}
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db' }}
                >
                  <Text style={{ fontWeight: '700', color: '#374151' }}>Go to app</Text>
                </Pressable>
                <Pressable
                  onPress={acceptInvitation}
                  disabled={!canAccept || accepting}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: canAccept && !accepting ? '#111827' : '#cbd5e1',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: '#fff' }}>
                    {accepting ? 'Accepting...' : 'Accept invitation'}
                  </Text>
                </Pressable>
              </View>
              {!signedInEmail && (
                <Text style={{ marginTop: 12, color: '#6b7280' }}>
                  Open TODO.prj, sign in or create your account, then return to this link to accept.
                </Text>
              )}
              {signedInEmail && signedInEmail !== invitation.email.toLowerCase() && (
                <Text style={{ marginTop: 12, color: '#b45309' }}>
                  Sign out and sign back in with the invited email address to accept this invitation.
                </Text>
              )}
            </>
          ) : null}
        </View>
      </View>
    </>
  );
}
