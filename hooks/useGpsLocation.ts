import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type GpsStatus = 'loading' | 'ready' | 'denied' | 'unavailable' | 'error';

export interface GpsFix {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in meters, when the device reports it. */
  accuracy: number | null;
  /** Human readable street address, only when reverse geocoding is available. */
  address: string | null;
  timestamp: number;
}

const GPS_TIMEOUT_MS = 15000;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), ms)),
  ]);

export const buildMapsUrl = (fix: Pick<GpsFix, 'latitude' | 'longitude'>) =>
  `https://maps.google.com/?q=${fix.latitude},${fix.longitude}`;

// Real device GPS (browser geolocation on web). Requests foreground permission,
// reads a high-accuracy fix and, when the platform supports it, the street address.
export function useGpsLocation() {
  const [status, setStatus] = useState<GpsStatus>('loading');
  const [fix, setFix] = useState<GpsFix | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setStatus('unavailable');
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        return;
      }

      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        GPS_TIMEOUT_MS
      );

      let address: string | null = null;
      try {
        const [place] = await Location.reverseGeocodeAsync(position.coords);
        if (place) {
          const street = [place.street, place.streetNumber].filter(Boolean).join(' ');
          const city = [place.postalCode, place.city].filter(Boolean).join(' ');
          address = [street, city].filter(Boolean).join(', ') || null;
        }
      } catch {
        // reverse geocoding is optional (limited on web) — coordinates are enough
      }

      setFix({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        address,
        timestamp: position.timestamp,
      });
      setStatus('ready');
    } catch {
      setFix(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, fix, refresh };
}
