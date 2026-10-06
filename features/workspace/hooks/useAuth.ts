import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { AuthErrorField } from '../../../lib/types';
import {
  authRedirectUrl,
  forceOAuthRedirectUrl,
  getAuthCallbackParams,
  markOAuthRedirectIntent,
  oauthRedirectUrl,
  promoteLocalSessionToProduction,
  redirectNonCanonicalWebHost,
  sessionFromAuthCallbackParams,
} from '../../../lib/authSession';
import type { FeedbackState } from './useFeedback';

type AuthDeps = Pick<
    FeedbackState,
    | 'setError'
    | 'setMessage'
  >;

export function useAuth({
  setError,
  setMessage,
}: AuthDeps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authErrorField, setAuthErrorField] = useState<AuthErrorField>(null);
  const sessionUserIdRef = useRef<string | null>(null);

  async function submitAuth() {
    if (redirectNonCanonicalWebHost()) return;

    const trimmedDisplayName = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (authMode === 'signUp' && !trimmedDisplayName) {
      setAuthErrorField('displayName');
      setError('Enter your name.');
      return;
    }
    if (!normalizedEmail) {
      setAuthErrorField('email');
      setError('Enter your email.');
      return;
    }
    if (!password) {
      setAuthErrorField('password');
      setError('Enter your password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthErrorField('email');
      setError('Enter a valid email address.');
      return;
    }
    if (authMode === 'signUp' && password.length < 8) {
      setAuthErrorField('password');
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!isSupabaseConfigured) {
      setAuthErrorField('all');
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setAuthErrorField(null);
    setMessage('');

    const result =
      authMode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: authRedirectUrl(),
              data: { display_name: trimmedDisplayName },
            },
          });

    if (result.error) {
      setAuthLoading(false);
      setAuthErrorField('all');
      setError(result.error.message);
      return;
    }

    if (authMode === 'signUp' && !result.data.session) {
      setAuthLoading(false);
      setMessage('Account created! Check your email to confirm, then sign in.');
      return;
    }

    if (result.data.session) {
      if (promoteLocalSessionToProduction(result.data.session)) return;
      sessionUserIdRef.current = result.data.session.user.id;
      setSession(result.data.session);
    }
    setAuthLoading(false);
  }

  async function sendPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthErrorField('email');
      setError('Enter your email first.');
      return;
    }
    if (!isSupabaseConfigured) {
      setAuthErrorField('all');
      setError('Add Supabase env vars to sync todos.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setAuthErrorField(null);
    setMessage('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: authRedirectUrl(),
    });

    setAuthLoading(false);

    if (resetError) {
      setAuthErrorField('email');
      setError(resetError.message);
      return;
    }

    setMessage('Check your email for a password reset link.');
  }

  async function signInWithOAuth(provider: 'google' | 'apple') {
    if (redirectNonCanonicalWebHost()) return;

    if (!isSupabaseConfigured) {
      setAuthErrorField('all');
      setError('Add Supabase env vars to sign in.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setAuthErrorField(null);

    try {
      const redirectTo = provider === 'google' ? oauthRedirectUrl() : authRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (!data?.url) {
        setError(`Unable to start ${provider} sign-in.`);
        return;
      }

      if (Platform.OS === 'web') {
        markOAuthRedirectIntent();
        window.location.href = forceOAuthRedirectUrl(data.url, redirectTo);
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (authResult.type !== 'success') {
        if (authResult.type === 'cancel') {
          setMessage(`${provider === 'google' ? 'Google' : 'Apple'} sign-in canceled.`);
        }
        return;
      }

      const callbackParams = getAuthCallbackParams(authResult.url);
      if (!callbackParams) {
        setError(`Unable to complete ${provider} sign-in.`);
        return;
      }

      const nextSession = await sessionFromAuthCallbackParams(callbackParams);
      if (nextSession) {
        sessionUserIdRef.current = nextSession.user.id;
        setSession(nextSession);
      }
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : `Unable to complete ${provider} sign-in.`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function saveRecoveryPassword() {
    const nextPassword = recoveryPassword.trim();
    if (nextPassword.length < 6) {
      setError('Enter a password with at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setError('');
    setMessage('');

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });

    setAuthLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPasswordRecovery(false);
    setRecoveryPassword('');
    setMessage('Password updated.');
  }

  return {
    session,
    setSession,
    authInitialized,
    setAuthInitialized,
    authLoading,
    setAuthLoading,
    authMode,
    setAuthMode,
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    passwordRecovery,
    setPasswordRecovery,
    recoveryPassword,
    setRecoveryPassword,
    showPassword,
    setShowPassword,
    authErrorField,
    setAuthErrorField,
    sessionUserIdRef,
    submitAuth,
    sendPasswordReset,
    signInWithOAuth,
    saveRecoveryPassword,
  };
}

export type AuthState = ReturnType<typeof useAuth>;
