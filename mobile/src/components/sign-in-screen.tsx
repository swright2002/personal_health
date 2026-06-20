import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Brand, Radius, Severity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

type Step = 'email' | 'code';

export function SignInScreen() {
  const theme = useTheme();
  const { requestCode, verifyCode } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { borderColor: Brand.hairline, color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await requestCode(trimmed);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setStep('code');
    setInfo(`We sent a code to ${trimmed}.`);
  };

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await requestCode(email.trim());
    setBusy(false);
    setInfo(error ? null : 'New code sent.');
    if (error) setError(error);
  };

  const verify = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email.trim(), code.trim());
    if (error) {
      setError(error);
      setBusy(false);
    }
    // On success the auth listener swaps this screen out.
  };

  const backToEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Harbor</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.tagline}>
            {step === 'email' ? 'Sign in to your household.' : 'Check your email.'}
          </ThemedText>

          {step === 'email' ? (
            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                onSubmitEditing={sendCode}
                returnKeyType="go"
              />
              {error ? <ThemedText type="small" style={styles.error}>{error}</ThemedText> : null}
              <PrimaryButton label="Email me a code" busy={busy} disabled={!email.trim()} onPress={sendCode} />
            </View>
          ) : (
            <View style={styles.form}>
              {info ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {info}
                </ThemedText>
              ) : null}
              <TextInput
                style={[...inputStyle, styles.codeInput]}
                placeholder="Code"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={8}
                autoFocus
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
                editable={!busy}
                onSubmitEditing={verify}
                returnKeyType="go"
              />
              {error ? <ThemedText type="small" style={styles.error}>{error}</ThemedText> : null}
              <PrimaryButton label="Sign in" busy={busy} disabled={code.length < 6} onPress={verify} />

              <View style={styles.linksRow}>
                <Pressable onPress={backToEmail} disabled={busy} hitSlop={8}>
                  <ThemedText type="small" style={{ color: Brand.deep }}>
                    Use a different email
                  </ThemedText>
                </Pressable>
                <Pressable onPress={resend} disabled={busy} hitSlop={8}>
                  <ThemedText type="small" style={{ color: Brand.deep }}>
                    Resend code
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[styles.button, { backgroundColor: Brand.accent, opacity: off ? 0.6 : 1 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  tagline: { fontSize: 16, lineHeight: 22, marginBottom: Spacing.three },
  form: { gap: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  codeInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    borderRadius: Radius.control,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: Severity.watch },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
});
