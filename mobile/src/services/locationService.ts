import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: Coordinates;
  isRealGps: boolean;
  label?: string;
  error?: string;
}

// Fallback coordinates if location permissions are denied (Colombo center)
export const DEFAULT_COORDINATES: Coordinates = {
  latitude: 6.9271,
  longitude: 79.8612,
};

export const SRI_LANKA_PRESETS = [
  { name: 'Colombo (City Center)', coords: { latitude: 6.9271, longitude: 79.8612 } },
  { name: 'Maharagama / Kottawa', coords: { latitude: 6.8480, longitude: 79.9268 } },
  { name: 'Nugegoda / Kohuwala', coords: { latitude: 6.8724, longitude: 79.8837 } },
  { name: 'Dehiwala / Mount Lavinia', coords: { latitude: 6.8420, longitude: 79.8654 } },
  { name: 'Battaramulla / Rajagiriya', coords: { latitude: 6.8967, longitude: 79.9281 } },
  { name: 'Kaduwela / Malabe', coords: { latitude: 6.9147, longitude: 79.9729 } },
  { name: 'Moratuwa / Panadura', coords: { latitude: 6.7730, longitude: 79.8816 } },
  { name: 'Gampaha / Kelaniya', coords: { latitude: 7.0840, longitude: 79.9990 } },
  { name: 'Negombo Beach / Katunayake', coords: { latitude: 7.2008, longitude: 79.8736 } },
  { name: 'Kalutara South', coords: { latitude: 6.5854, longitude: 79.9607 } },
  { name: 'Kandy (Central Province)', coords: { latitude: 7.2906, longitude: 80.6337 } },
  { name: 'Galle Fort / Unawatuna', coords: { latitude: 6.0535, longitude: 80.2210 } },
  { name: 'Matara / Mirissa', coords: { latitude: 5.9549, longitude: 80.5550 } },
  { name: 'Kurunegala Town', coords: { latitude: 7.4863, longitude: 80.3623 } },
  { name: 'Jaffna Town', coords: { latitude: 9.6615, longitude: 80.0255 } },
];

const STORAGE_KEY_LAST_LOCATION = 'neighborplates_last_rider_location';
const STORAGE_KEY_LOCATION_LABEL = 'neighborplates_last_rider_location_label';

/**
 * Calculates straight-line distance in kilometers between two coordinates using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance nicely (e.g. "850 m" or "2.3 km")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm <= 0) return 'Nearby';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Get cached last known coordinates from storage
 */
export async function getCachedRiderLocation(): Promise<Coordinates | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_LOCATION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Get cached location label from storage
 */
export async function getCachedRiderLocationLabel(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_LOCATION_LABEL);
  } catch (e) {
    return null;
  }
}

/**
 * Save coordinates and optional human label to local storage cache
 */
export async function cacheRiderLocation(coords: Coordinates, label?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_LOCATION, JSON.stringify(coords));
    if (label) {
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION_LABEL, label);
    }
  } catch (e) {}
}

/**
 * Reverse geocode coordinates to a human-readable neighborhood/city name
 */
export async function reverseGeocodeCoords(lat: number, lon: number): Promise<string> {
  try {
    // Check known presets for instant match within ~3 km
    for (const preset of SRI_LANKA_PRESETS) {
      const dist = calculateDistanceKm(lat, lon, preset.coords.latitude, preset.coords.longitude);
      if (dist <= 3.5) {
        return preset.name.split(' (')[0];
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const place = data.locality || data.city || data.principalSubdivision;
      if (place) return place;
    }
  } catch (e) {}

  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * Search locations by query string (Sri Lanka OpenStreetMap geocoding)
 */
export async function searchAddressCoords(query: string): Promise<{ label: string; coords: Coordinates }[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // Filter presets first
  const matchedPresets = SRI_LANKA_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(trimmed)
  ).map((p) => ({ label: p.name, coords: p.coords }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=lk&limit=5`,
      {
        headers: { 'User-Agent': 'NeighborPlatesApp/1.0' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const externalMatches = data.map((item: any) => ({
        label: item.display_name.split(',').slice(0, 3).join(', '),
        coords: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
      }));

      // Merge results avoiding duplicates
      const all = [...matchedPresets];
      for (const ext of externalMatches) {
        if (!all.some((a) => calculateDistanceKm(a.coords.latitude, a.coords.longitude, ext.coords.latitude, ext.coords.longitude) < 1)) {
          all.push(ext);
        }
      }
      return all;
    }
  } catch (e) {}

  return matchedPresets;
}

/**
 * Request location permission and obtain rider's real GPS position.
 * Robust across iOS, Android, and Web with multi-stage fallbacks including IP Geolocation.
 */
export async function getRealLocation(): Promise<LocationResult> {
  // ── 1. On Web: Use Native Browser Geolocation directly (fastest & most reliable) ──
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const webPos = await new Promise<Coordinates>((resolve, reject) => {
        // Try high accuracy with short timeout
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            // Fallback to low-accuracy/network WiFi
            navigator.geolocation.getCurrentPosition(
              (pos2) => {
                resolve({
                  latitude: pos2.coords.latitude,
                  longitude: pos2.coords.longitude,
                });
              },
              (err2) => reject(err2),
              { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 10000 }
        );
      });

      const label = await reverseGeocodeCoords(webPos.latitude, webPos.longitude);
      await cacheRiderLocation(webPos, label);
      return {
        coords: webPos,
        isRealGps: true,
        label,
      };
    } catch (webErr: any) {
      console.warn('[LocationService] Browser geolocation failed, trying IP fallback:', webErr);
    }
  }

  // ── 2. On Native Mobile (iOS / Android): Try Expo Location Native API ──
  if (Platform.OS !== 'web') {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status === 'granted') {
        // Step 2a: Fast retrieval from hardware cache
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown && lastKnown.coords) {
            const coords = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
            const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
            await cacheRiderLocation(coords, label);
            return { coords, isRealGps: true, label };
          }
        } catch (lastErr) {}

        // Step 2b: Active GPS poll with timeout protection
        try {
          const position = (await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('GPS timeout')), 8000)
            ),
          ])) as any;

          if (position && position.coords) {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
            await cacheRiderLocation(coords, label);
            return { coords, isRealGps: true, label };
          }
        } catch (currErr) {
          try {
            const coarsePos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Lowest,
            });
            if (coarsePos && coarsePos.coords) {
              const coords = {
                latitude: coarsePos.coords.latitude,
                longitude: coarsePos.coords.longitude,
              };
              const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
              await cacheRiderLocation(coords, label);
              return { coords, isRealGps: true, label };
            }
          } catch (coarseErr) {}
        }
      }
    } catch (expoErr) {
      console.warn('[LocationService] Expo Location error:', expoErr);
    }
  }

  // ── 3. Fallback: IP-Based Geolocation (works when hardware GPS is off or denied) ──
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const coords = { latitude: data.latitude, longitude: data.longitude };
        const label = data.city || data.region || 'Network Location';
        await cacheRiderLocation(coords, label);
        return {
          coords,
          isRealGps: true,
          label: `${label} (Network)`,
        };
      }
    }
  } catch (ipErr) {
    console.warn('[LocationService] IP Geolocation fallback failed:', ipErr);
  }

  // ── 4. Fallback: Previously Cached Location ──
  const cached = await getCachedRiderLocation();
  const cachedLabel = await getCachedRiderLocationLabel();
  if (cached) {
    return {
      coords: cached,
      isRealGps: true,
      label: cachedLabel || `${cached.latitude.toFixed(4)}, ${cached.longitude.toFixed(4)}`,
    };
  }

  // ── 5. Default Fallback ──
  return {
    coords: DEFAULT_COORDINATES,
    isRealGps: false,
    label: 'Colombo (Default)',
    error: 'Location permission not granted or GPS unavailable. Using default area.',
  };
}

/**
 * Watch rider's location in real-time as they move.
 * Returns a subscription object with a remove() method.
 */
export async function watchRealLocation(
  onUpdate: (coords: Coordinates, label?: string) => void,
  onError?: (err: any) => void
): Promise<{ remove: () => void }> {
  // Web watcher
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
        await cacheRiderLocation(coords, label);
        onUpdate(coords, label);
      },
      (err) => {
        if (onError) onError(err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
    return {
      remove: () => navigator.geolocation.clearWatch(watchId),
    };
  }

  // Mobile native watcher
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }

    if (status === 'granted') {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 4000,
          distanceInterval: 10,
        },
        async (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
          await cacheRiderLocation(coords, label);
          onUpdate(coords, label);
        }
      );
      return {
        remove: () => sub.remove(),
      };
    }
  } catch (err) {
    console.warn('[LocationService] Watch position error:', err);
    if (onError) onError(err);
  }

  return { remove: () => {} };
}

/**
 * Sync rider's current coordinates to backend profile
 */
export async function syncRiderLocationToServer(coords: Coordinates): Promise<void> {
  try {
    await api.put('/api/users/profile', {
      location: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude], // GeoJSON order: [lon, lat]
      },
    });
  } catch (e) {
    console.warn('[LocationService] Failed to sync rider coordinates to server:', e);
  }
}
