import { DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SignInScreen } from '@/components/sign-in-screen';
import { Brand, Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

const CoastalLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.accent,
    background: Colors.light.background,
    card: Colors.light.backgroundElement,
    text: Colors.light.text,
    border: Brand.hairline,
  },
};

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={CoastalLight}>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <RootGate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Show the tabs once signed in; otherwise the sign-in screen. */
function RootGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator color={Brand.accent} />
      </View>
    );
  }

  return session ? <AppTabs /> : <SignInScreen />;
}
