import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link, Stack } from 'expo-router';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { appName } from '../constants';
import { styles } from '../styles';
import type { WorkspaceScreen } from '../useWorkspaceScreen';

type AuthScreenProps = Pick<
  WorkspaceScreen,
  | 'authLoading'
  | 'authMode'
  | 'setAuthMode'
  | 'displayName'
  | 'setDisplayName'
  | 'email'
  | 'setEmail'
  | 'password'
  | 'setPassword'
  | 'showPassword'
  | 'setShowPassword'
  | 'error'
  | 'setError'
  | 'authErrorField'
  | 'setAuthErrorField'
  | 'message'
  | 'setMessage'
  | 'submitAuth'
  | 'sendPasswordReset'
  | 'signInWithOAuth'
>;

export function AuthScreen({
  authLoading,
  authMode,
  setAuthMode,
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  setError,
  authErrorField,
  setAuthErrorField,
  message,
  setMessage,
  submitAuth,
  sendPasswordReset,
  signInWithOAuth,
}: AuthScreenProps) {
  const isSignIn = authMode === 'signIn';
  const isAuthSubmitDisabled =
    authLoading ||
    !isSupabaseConfigured ||
    !email.trim() ||
    !password ||
    (!isSignIn && !displayName.trim());
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authPanel}>
          {/* Brand */}
          <View style={styles.authBrand}>
            <View style={styles.authLogo}>
              <Image source={require('../../../assets/icon.png')} style={styles.authLogoImage} />
            </View>
            <Text style={styles.authBrandName}>{appName}</Text>
          </View>

          {!isSignIn && (
            <>
              <Text style={styles.authLabel}>Name</Text>
              <TextInput
                style={[
                  styles.authInput,
                  styles.authEmailInput,
                  (authErrorField === 'displayName' || authErrorField === 'all') && styles.authInputError,
                ]}
                value={displayName}
                onChangeText={(v) => {
                  setDisplayName(v);
                  if (authErrorField === 'displayName' || authErrorField === 'all') {
                    setError('');
                    setAuthErrorField(null);
                  }
                }}
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
              />
            </>
          )}

          {/* Email */}
          <Text style={styles.authLabel}>Email</Text>
          <TextInput
            style={[
              styles.authInput,
              styles.authEmailInput,
              (authErrorField === 'email' || authErrorField === 'all') && styles.authInputError,
            ]}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (authErrorField === 'email' || authErrorField === 'all') {
                setError('');
                setAuthErrorField(null);
              }
            }}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          {/* Password */}
          <Text style={styles.authLabel}>Password</Text>
          <View
            style={[
              styles.authPasswordWrap,
              (authErrorField === 'password' || authErrorField === 'all') && styles.authInputError,
            ]}
          >
            <TextInput
              style={styles.authPasswordInput}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (authErrorField === 'password' || authErrorField === 'all') {
                  setError('');
                  setAuthErrorField(null);
                }
              }}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              textContentType={isSignIn ? 'password' : 'newPassword'}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              onSubmitEditing={submitAuth}
            />
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          {!!error && <Text style={styles.authFieldError}>{error}</Text>}
          {!!message && (
            <View style={styles.authSuccessBox}>
              <Text style={styles.authSuccessText}>{message}</Text>
            </View>
          )}

          <Pressable
            onPress={submitAuth}
            disabled={isAuthSubmitDisabled}
            style={({ pressed }) => [
              styles.authSubmitBtn,
              isAuthSubmitDisabled && styles.authSubmitBtnMuted,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.authSubmitBtnText}>
              {authLoading ? 'Please wait…' : (isSignIn ? 'Log in' : 'Create account')}
            </Text>
          </Pressable>

          <View style={styles.authLinksRow}>
            <Pressable onPress={sendPasswordReset} disabled={authLoading}>
              <Text style={styles.authLink}>Forgot password?</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAuthMode(isSignIn ? 'signUp' : 'signIn');
                setError('');
                setAuthErrorField(null);
                setMessage('');
              }}
            >
              <Text style={styles.authLink}>{isSignIn ? 'Sign up' : 'Sign in'}</Text>
            </Pressable>
          </View>

          <View style={styles.authDivider}>
            <View style={styles.authDividerLine} />
            <Text style={styles.authDividerText}>or continue with</Text>
            <View style={styles.authDividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.socialGridBtn, pressed && styles.btnPressed]}
            onPress={() => signInWithOAuth('google')}
            disabled={authLoading}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.socialGridBtnText}>Google</Text>
          </Pressable>
        </View>

        <View style={styles.authFooter}>
          <Text style={styles.authFooterText}>
            By continuing, you agree to our{' '}
            <Link href="/terms" style={{ textDecorationLine: 'underline' }}>Terms of Service</Link> and{' '}
            <Link href="/privacy" style={{ textDecorationLine: 'underline' }}>Privacy Policy</Link>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
