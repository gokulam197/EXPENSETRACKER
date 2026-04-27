import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from './context/ThemeContext';
import { initDB } from '../database/db'; 
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../database/firebaseConfig';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isDarkMode } = useAppTheme();
  const router = useRouter();
  const segments = useSegments(); 
  
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    initDB(); 
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inLoginScreen = segments[0] === 'login';

    if (user && inLoginScreen) {
      router.replace('/(tabs)');
    } else if (!user && !inLoginScreen) {
      router.replace('/login');
    }
  }, [user, initializing, segments]);

  // Auth check cheyyunna vare oru loading screen kanikkunnu
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#121212' : '#f4f6f8' }}>
        <ActivityIndicator size="large" color="#4154f1" />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="book/addTx" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}