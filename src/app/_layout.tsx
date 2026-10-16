import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from 'expo-router/js-top-tabs';
import type { ParamListBase, TabNavigationState } from 'expo-router/react-navigation';
import { StatusBar, View } from 'react-native';
import { ReminderSync } from '../reminder-sync';
import { StoreProvider } from '../store';
import { FloatingTabBar } from '../tabbar';
import { TaskSheetProvider } from '../task-sheet';
import { MAX_W, useTheme } from '../theme';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function Layout() {
  const c = useTheme();
  return (
    <StoreProvider>
      <TaskSheetProvider>
        <ReminderSync />
        <StatusBar barStyle={c.dark ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: MAX_W }}>
            <MaterialTopTabs
              tabBarPosition="bottom"
              screenOptions={{ tabBarPosition: 'bottom' }}
              tabBar={(props) => <FloatingTabBar {...props} />}
            >
              <MaterialTopTabs.Screen name="index" options={{ title: 'Bandeja' }} />
              <MaterialTopTabs.Screen name="plan" options={{ title: 'Plan' }} />
              <MaterialTopTabs.Screen name="pomodoro" options={{ title: 'Pomodoro' }} />
            </MaterialTopTabs>
          </View>
        </View>
      </TaskSheetProvider>
    </StoreProvider>
  );
}