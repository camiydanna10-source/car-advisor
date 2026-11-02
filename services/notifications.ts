import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceRecord } from './maintenancePlan';
import { buildNotificationPlan } from './notificationPlan';
import type { VehicleData } from './vehicleLookup';

// Local (on-device) maintenance reminders. They are scheduled from the maintenance plan, so they
// work offline and without a backend. Remote push (workshop messages, reminders while the app
// is uninstalled/idle for weeks) needs the backend — see the commit notes.

// Expo Go on Android removed expo-notifications (SDK 53+): merely importing it throws. So the module
// is loaded lazily and only where it can work (development/production builds, iOS, ...).
const IS_EXPO_GO_ANDROID =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web' && !IS_EXPO_GO_ANDROID;

type NotificationsModule = typeof import('expo-notifications');
const loadNotifications = (): Promise<NotificationsModule> => import('expo-notifications');
const CHANNEL_ID = 'maintenance';
const SOURCE = 'maintenance';

const prefKey = (email: string) => `car_advisor_notifications:${email.trim().toLowerCase()}`;

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

// Call once at startup: show reminders as banners even while the app is open.
export async function configureNotifications() {
  if (!NOTIFICATIONS_SUPPORTED) return;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = await loadNotifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Avisos de mantenimiento',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!NOTIFICATIONS_SUPPORTED) return 'unsupported';
  const Notifications = await loadNotifications();
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestPermission(): Promise<boolean> {
  if (!NOTIFICATIONS_SUPPORTED) return false;
  await ensureAndroidChannel();
  const Notifications = await loadNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

export async function getNotificationsEnabled(email: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(prefKey(email))) === '1';
  } catch {
    return false;
  }
}

export const setNotificationsEnabled = (email: string, enabled: boolean) =>
  AsyncStorage.setItem(prefKey(email), enabled ? '1' : '0');

async function cancelMaintenanceNotifications() {
  const Notifications = await loadNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.content.data?.source === SOURCE)
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// Rebuilds the scheduled reminders from scratch. Safe to call every time the data changes.
export async function syncMaintenanceNotifications(
  email: string,
  vehicles: VehicleData[],
  recordsByPlate: Record<string, ServiceRecord[]>
): Promise<number> {
  if (!NOTIFICATIONS_SUPPORTED) return 0;
  await cancelMaintenanceNotifications();
  if (!(await getNotificationsEnabled(email))) return 0;
  if ((await getPermissionState()) !== 'granted') return 0;

  await ensureAndroidChannel();
  const Notifications = await loadNotifications();
  const planned = buildNotificationPlan(vehicles, recordsByPlate);
  await Promise.all(
    planned.map(n =>
      Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: { source: SOURCE, plate: n.plate, kind: n.kind, url: '/timeline' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: CHANNEL_ID },
      })
    )
  );
  return planned.length;
}

// Removes every reminder (used on logout so the next account does not see them).
export async function clearMaintenanceNotifications() {
  if (!NOTIFICATIONS_SUPPORTED) return;
  await cancelMaintenanceNotifications();
}

// Calls `onTap` when the client taps a maintenance reminder. Returns the unsubscribe function.
export function listenForReminderTaps(onTap: () => void): () => void {
  if (!NOTIFICATIONS_SUPPORTED) return () => {};
  let remove: (() => void) | undefined;
  let cancelled = false;
  loadNotifications().then(Notifications => {
    if (cancelled) return;
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.data?.source === SOURCE) onTap();
    });
    remove = () => subscription.remove();
  });
  return () => {
    cancelled = true;
    remove?.();
  };
}
