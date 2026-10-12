import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Ocultamos la barra nativa de Expo para usar la personalizada de tu compañero
        tabBarStyle: { display: 'none' },
        sceneStyle: {
          backgroundColor: COLORS.background || '#0D0F12',
        },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="catalog" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="register-vehicle" />
    </Tabs>
  );
}