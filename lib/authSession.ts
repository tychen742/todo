import { Platform } from 'react-native';
import { createURL } from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const webAppUrl = 'https://rodoflow.com';

const legacyWebHosts = [
  'todo-eight-gamma.vercel.app',
  'todo-tsangyao-chen-s-projects.vercel.app',
];
const localOAuthRedirectParam = 'rodoflow_local_redirect';
const oauthReturnStorageKey = 'rodoflow:oauth-return-to-production';

export function authRedirectUrl() {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? undefined : window.location.origin;
  }

  return createURL('');
}

function isAllowedLocalWebOrigin(origin: string | null | undefined) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function oauthRedirectUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return authRedirectUrl();
  if (!isAllowedLocalWebOrigin(window.location.origin)) return authRedirectUrl();

  const destination = new URL(webAppUrl);
  destination.searchParams.set(localOAuthRedirectParam, window.location.origin);
  return destination.toString();
}

export function forceOAuthRedirectUrl(url: string, redirectTo = authRedirectUrl()) {
  if (!redirectTo) return url;

  try {
    const oauthUrl = new URL(url);
    oauthUrl.searchParams.set('redirect_to', redirectTo);
    return oauthUrl.toString();
  } catch {
    return url;
  }
}

function redirectLegacyWebHostToProduction() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if (!legacyWebHosts.includes(window.location.hostname)) return false;

  const destination = new URL(webAppUrl);
  destination.pathname = window.location.pathname;
  destination.search = window.location.search;
  destination.hash = window.location.hash;
  window.location.replace(destination.toString());
  return true;
}

export function markOAuthRedirectIntent() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.sessionStorage?.setItem(oauthReturnStorageKey, '1');
}

export function promoteLocalSessionToProduction(currentSession: Session | null) {
  if (!currentSession) return false;
  window.sessionStorage?.removeItem(oauthReturnStorageKey);
  return false;
}

export function redirectNonCanonicalWebHost() {
  return redirectLegacyWebHostToProduction();
}

function forwardOAuthCallbackToLocalDev() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  if (window.location.origin !== new URL(webAppUrl).origin) return false;

  const currentUrl = new URL(window.location.href);
  const localOrigin = currentUrl.searchParams.get(localOAuthRedirectParam);
  if (!localOrigin) return false;
  if (!isAllowedLocalWebOrigin(localOrigin)) return false;

  currentUrl.searchParams.delete(localOAuthRedirectParam);
  const destination = new URL(localOrigin);
  destination.pathname = currentUrl.pathname;
  destination.search = currentUrl.search;
  destination.hash = currentUrl.hash;
  window.location.replace(destination.toString());
  return true;
}

export function getAuthCallbackParams(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const readParam = (name: string) => url.searchParams.get(name) ?? hashParams.get(name);
  const params = {
    code: readParam('code'),
    accessToken: readParam('access_token'),
    refreshToken: readParam('refresh_token'),
    errorDescription: readParam('error_description') ?? readParam('error'),
  };

  if (!params.code && !params.accessToken && !params.refreshToken && !params.errorDescription) {
    return null;
  }

  return params;
}

function getWebAuthCallbackParams() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return getAuthCallbackParams(window.location.href);
}

function clearWebAuthCallbackParams() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  [
    'access_token',
    'expires_at',
    'expires_in',
    'provider_refresh_token',
    'provider_token',
    'refresh_token',
    'token_type',
    'type',
    'code',
    'state',
    'error',
    'error_code',
    'error_description',
  ].forEach((name) => url.searchParams.delete(name));

  url.hash = '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
}

export async function sessionFromAuthCallbackParams(callbackParams: NonNullable<ReturnType<typeof getAuthCallbackParams>>) {
  if (callbackParams.errorDescription) {
    throw new Error(callbackParams.errorDescription);
  }

  if (callbackParams.accessToken && callbackParams.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: callbackParams.accessToken,
      refresh_token: callbackParams.refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  if (callbackParams.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(callbackParams.code);
    if (error) throw error;
    return data.session;
  }

  return null;
}

export async function resolveInitialAuthSession() {
  const callbackParams = getWebAuthCallbackParams();

  if (callbackParams) {
    if (forwardOAuthCallbackToLocalDev()) return null;
    const session = await sessionFromAuthCallbackParams(callbackParams);
    clearWebAuthCallbackParams();
    return session;
  }

  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  return currentSession;
}

export function projectInviteUrl(token: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${webAppUrl}/invite/${token}`;
  }
  return createURL(`invite/${token}`);
}
