import { Tabs } from 'expo-router';
import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../context/ThemeContext'; // Nammude theme import cheyyunnu

export default function TabLayout() {
  const { t } = useTranslation();
  const { isDarkMode } = useAppTheme(); // Dark mode check cheyyunnu

  // --- PREMIUM TAB BAR COLORS ---
  const activeColor = '#4154f1'; // Select cheytha tab-nte niram (Brand Blue)
  const inactiveColor = isDarkMode ? '#64748B' : '#9CA3AF'; // Select cheyyatha tab-nte niram
  const bgColor = isDarkMode ? '#1E293B' : '#FFFFFF'; // Tab bar-nte background
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0'; // Tab bar-nte mukalile border

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderColor,
          elevation: 0, // Android-le pazhaya shadow ozhivakkan
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color }) => <FontAwesome size={26} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
          tabBarIcon: ({ color }) => <FontAwesome size={26} name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}