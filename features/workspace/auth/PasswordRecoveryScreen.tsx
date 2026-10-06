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
import { Stack } from 'expo-router';
import { appName } from '../constants';
import { styles } from '../styles';
import type { WorkspaceScreen } from '../useWorkspaceScreen';

type PasswordRecoveryScreenProps = Pick<
  WorkspaceScreen,
  | 'authLoading'
  | 'recoveryPassword'
  | 'setRecoveryPassword'
  | 'showPassword'
  | 'setShowPassword'
  | 'error'
  | 'saveRecoveryPassword'
>;

export function PasswordRecoveryScreen({
  authLoading,
  recoveryPassword,
  setRecoveryPassword,
  showPassword,
  setShowPassword,
  error,
  saveRecoveryPassword,
}: PasswordRecoveryScreenProps) {
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
          <View style={styles.authBrand}>
            <View style={styles.authLogo}>
              <Image source={require('../../../assets/icon.png')} style={styles.authLogoImage} />
            </View>
            <Text style={styles.authBrandName}>{appName}</Text>
          </View>
          <Text style={styles.authTitle}>Set a new password</Text>
          <Text style={styles.authTitleSub}>
            Enter a new password for your account.
          </Text>

          {!!error && (
            <Text style={styles.authFieldError}>{error}</Text>
          )}

          <Text style={styles.authLabel}>New password</Text>
          <View style={styles.authPasswordWrap}>
            <TextInput
              style={styles.authPasswordInput}
              value={recoveryPassword}
              onChangeText={setRecoveryPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="new-password"
              onSubmitEditing={saveRecoveryPassword}
            />
            <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={saveRecoveryPassword}
            disabled={authLoading}
            style={({ pressed }) => [
              styles.authSubmitBtn,
              (!recoveryPassword.trim() || authLoading) && styles.authSubmitBtnMuted,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.authSubmitBtnText}>
              {authLoading ? 'Please wait…' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
