import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertOctagon, BellOff } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { getToken, getUserInfo } from '../services/authService';
import { SosAlert, getShiftActive, listSosAlerts, onWorkshopChange } from '../services/orders';

const POLL_MS = 3000;
const SIREN = require('../assets/sounds/sos-alarm.wav');

// Plays the siren and vibrates for as long as it is mounted. expo-audio is loaded lazily: if the
// native module is missing (an older Expo Go, a build without it) the vibration still alerts and the
// rest of the app keeps working instead of crashing at startup.
const AlarmPlayer: React.FC = () => {
  useEffect(() => {
    let cancelled = false;
    let stopSiren = () => {};
    import('expo-audio')
      .then(({ createAudioPlayer, setAudioModeAsync }) => {
        if (cancelled) return;
        setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
        // Created here (not with the hook) so the siren exists only while the alarm is sounding.
        const player = createAudioPlayer(SIREN);
        player.loop = true;
        player.play();
        stopSiren = () => {
          player.pause();
          player.remove();
        };
      })
      .catch(() => {});
    Vibration.vibrate([0, 700, 500], true);
    return () => {
      cancelled = true;
      stopSiren();
      Vibration.cancel();
    };
  }, []);

  return null;
};

const sameIds = (a: SosAlert[], b: SosAlert[]) => a.length === b.length && a.every((x, i) => x.id === b[i].id);

// Priority in-app alert for mechanics: while an SOS is waiting for an answer and the mechanic is on
// shift, a siren plays and a banner shows on every screen until they answer it or silence it.
// It polls the device storage (stand-in for the push/WebSocket channel the backend will provide).
export const SosAlarm: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [mechanicEmail, setMechanicEmail] = useState<string | null>(null);
  const [open, setOpen] = useState<SosAlert[]>([]);
  const [silenced, setSilenced] = useState<string[]>([]);

  // Who is signed in changes on login/logout, which always navigates: re-check on every route
  // change (cheap) and only poll while a mechanic is signed in, so clients and guests pay nothing.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getToken(), getUserInfo()])
      .then(([token, user]) => {
        if (!cancelled) setMechanicEmail(token && user?.role === 'mechanic' && user.email ? user.email : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!mechanicEmail) return;
    let cancelled = false;
    const tick = async () => {
      const [shift, alerts] = await Promise.all([getShiftActive(mechanicEmail), listSosAlerts()]);
      const next = shift ? alerts.filter(a => a.status === 'open' && !a.rejectedBy.includes(mechanicEmail)) : [];
      if (!cancelled) setOpen(prev => (sameIds(prev, next) ? prev : next));
    };
    tick().catch(() => {});
    const timer = setInterval(() => tick().catch(() => {}), POLL_MS);
    // Answering an alert (accept/reject/cancel) silences the siren right away, not on the next poll.
    const unsubscribe = onWorkshopChange(() => tick().catch(() => {}));
    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe();
    };
  }, [mechanicEmail]);

  const shown = mechanicEmail ? open : [];
  if (shown.length === 0) return null;

  const sounding = shown.some(a => !silenced.includes(a.id));
  const first = shown[0];

  return (
    <>
      {sounding ? <AlarmPlayer /> : null}
      <View style={[styles.banner, { top: insets.top + 6 }]} accessibilityLiveRegion="assertive">
        <Pressable
          style={styles.info}
          onPress={() => (pathname === '/workshop-sos' ? undefined : router.push('/workshop-sos'))}
          accessibilityLabel="Ver el auxilio SOS"
        >
          <AlertOctagon size={22} color="#FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {shown.length > 1 ? `${shown.length} auxilios SOS pendientes` : `Auxilio SOS · ${first.emergency.label}`}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {first.client.name} · {pathname === '/workshop-sos' ? 'responde abajo' : 'toca para atender'}
            </Text>
          </View>
        </Pressable>
        {sounding ? (
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={() => setSilenced(shown.map(a => a.id))}
            accessibilityLabel="Silenciar la alarma"
          >
            <BellOff size={16} color="#FFF" />
            <Text style={styles.muteText}>Silenciar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    zIndex: 2000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.tertiaryContainer,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 12,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  muteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  muteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
