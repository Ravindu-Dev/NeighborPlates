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

export const DISTRICT_COORDINATES: Record<string, Coordinates> = {
  Colombo: { latitude: 6.9271, longitude: 79.8612 },
  Gampaha: { latitude: 7.0840, longitude: 79.9990 },
  Kalutara: { latitude: 6.5854, longitude: 79.9607 },
  Kandy: { latitude: 7.2906, longitude: 80.6337 },
  Galle: { latitude: 6.0535, longitude: 80.2210 },
  Matara: { latitude: 5.9549, longitude: 80.5550 },
  Jaffna: { latitude: 9.6615, longitude: 80.0255 },
  Kurunegala: { latitude: 7.4863, longitude: 80.3623 },
  Anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  Badulla: { latitude: 6.9934, longitude: 81.0550 },
  NuwaraEliya: { latitude: 6.9497, longitude: 80.7891 },
  Ratnapura: { latitude: 6.6828, longitude: 80.4000 },
};

export const TOWN_COORDINATES: Record<string, Coordinates> = {
  // Kandy
  peradeniya: { latitude: 7.2600, longitude: 80.5975 },
  'kandy city': { latitude: 7.2906, longitude: 80.6337 },
  kandy: { latitude: 7.2906, longitude: 80.6337 },
  katugastota: { latitude: 7.3245, longitude: 80.6186 },
  gampola: { latitude: 7.1643, longitude: 80.5694 },
  kundasale: { latitude: 7.2842, longitude: 80.6865 },
  digana: { latitude: 7.3000, longitude: 80.7300 },
  akurana: { latitude: 7.3620, longitude: 80.6178 },
  nawalapitiya: { latitude: 7.0544, longitude: 80.5342 },

  // Colombo
  colombo: { latitude: 6.9271, longitude: 79.8612 },
  'colombo 01 (fort)': { latitude: 6.9344, longitude: 79.8428 },
  'colombo 02 (slave island)': { latitude: 6.9239, longitude: 79.8536 },
  'colombo 03 (colpetty)': { latitude: 6.9064, longitude: 79.8517 },
  'colombo 04 (bambalapitiya)': { latitude: 6.8928, longitude: 79.8569 },
  'colombo 05 (havelock town)': { latitude: 6.8794, longitude: 79.8672 },
  'colombo 06 (wellawatte)': { latitude: 6.8728, longitude: 79.8617 },
  'colombo 07 (cinnamon gardens)': { latitude: 6.9114, longitude: 79.8647 },
  'colombo 08 (borella)': { latitude: 6.9147, longitude: 79.8778 },
  'colombo 09 (dematagoda)': { latitude: 6.9297, longitude: 79.8797 },
  'colombo 10 (maradana)': { latitude: 6.9272, longitude: 79.8686 },
  'colombo 11 (pettah)': { latitude: 6.9389, longitude: 79.8511 },
  'colombo 12 (kochchikade)': { latitude: 6.9461, longitude: 79.8583 },
  'colombo 13 (kotahena)': { latitude: 6.9511, longitude: 79.8631 },
  'colombo 14 (grandpass)': { latitude: 6.9531, longitude: 79.8753 },
  'colombo 15 (modara)': { latitude: 6.9681, longitude: 79.8678 },
  dehiwala: { latitude: 6.8517, longitude: 79.8656 },
  'mount lavinia': { latitude: 6.8378, longitude: 79.8644 },
  nugegoda: { latitude: 6.8724, longitude: 79.8837 },
  maharagama: { latitude: 6.8480, longitude: 79.9268 },
  battaramulla: { latitude: 6.8967, longitude: 79.9281 },
  rajagiriya: { latitude: 6.9080, longitude: 79.8970 },
  kotte: { latitude: 6.8906, longitude: 79.9042 },
  kaduwela: { latitude: 6.9333, longitude: 79.9833 },
  malabe: { latitude: 6.9042, longitude: 79.9547 },
  homagama: { latitude: 6.8444, longitude: 80.0028 },
  piliyandala: { latitude: 6.7986, longitude: 79.9228 },
  moratuwa: { latitude: 6.7730, longitude: 79.8816 },

  // Gampaha
  gampaha: { latitude: 7.0840, longitude: 79.9990 },
  negombo: { latitude: 7.2008, longitude: 79.8736 },
  wattala: { latitude: 6.9906, longitude: 79.8906 },
  'ja-ela': { latitude: 7.0750, longitude: 79.8917 },
  kiribathgoda: { latitude: 6.9792, longitude: 79.9292 },
  kelaniya: { latitude: 6.9553, longitude: 79.9189 },
  kadawatha: { latitude: 7.0017, longitude: 79.9525 },
  nittambuwa: { latitude: 7.1444, longitude: 80.1014 },
  minuwangoda: { latitude: 7.1694, longitude: 79.9517 },
  ragama: { latitude: 7.0278, longitude: 79.9208 },
  mirigama: { latitude: 7.2431, longitude: 80.1306 },

  // Kalutara
  kalutara: { latitude: 6.5854, longitude: 79.9607 },
  panadura: { latitude: 6.7131, longitude: 79.9074 },
  horana: { latitude: 6.7144, longitude: 80.0631 },
  beruwala: { latitude: 6.4789, longitude: 79.9828 },
  aluthgama: { latitude: 6.4333, longitude: 80.0000 },
  matugama: { latitude: 6.5222, longitude: 80.1147 },
  wadduwa: { latitude: 6.6667, longitude: 79.9333 },

  // Galle
  'galle fort': { latitude: 6.0269, longitude: 80.2170 },
  'galle city': { latitude: 6.0535, longitude: 80.2210 },
  galle: { latitude: 6.0535, longitude: 80.2210 },
  hikkaduwa: { latitude: 6.1395, longitude: 80.1063 },
  unawatuna: { latitude: 6.0108, longitude: 80.2486 },
  karapitiya: { latitude: 6.0667, longitude: 80.2333 },
  ambalangoda: { latitude: 6.2361, longitude: 80.0542 },
  elpitiya: { latitude: 6.2572, longitude: 80.1417 },
  bentota: { latitude: 6.4258, longitude: 79.9986 },

  // Matara
  'matara city': { latitude: 5.9549, longitude: 80.5550 },
  matara: { latitude: 5.9549, longitude: 80.5550 },
  mirissa: { latitude: 5.9483, longitude: 80.4578 },
  weligama: { latitude: 5.9750, longitude: 80.4286 },
  dikwella: { latitude: 5.9667, longitude: 80.6972 },
  akuressa: { latitude: 6.0989, longitude: 80.4764 },
  kamburupitiya: { latitude: 6.0833, longitude: 80.5667 },

  // Jaffna
  'jaffna city': { latitude: 9.6615, longitude: 80.0255 },
  jaffna: { latitude: 9.6615, longitude: 80.0255 },
  nallur: { latitude: 9.6744, longitude: 80.0294 },
  chavakachcheri: { latitude: 9.6542, longitude: 80.1583 },
  'point pedro': { latitude: 9.8250, longitude: 80.2333 },
  karainagar: { latitude: 9.7417, longitude: 79.8806 },
  chunnakam: { latitude: 9.7444, longitude: 80.0264 },

  // Kurunegala
  'kurunegala city': { latitude: 7.4863, longitude: 80.3623 },
  kurunegala: { latitude: 7.4863, longitude: 80.3623 },
  kuliyapitiya: { latitude: 7.4689, longitude: 80.0400 },
  pannala: { latitude: 7.3333, longitude: 79.9833 },
  narammala: { latitude: 7.4333, longitude: 80.2167 },
  maho: { latitude: 7.8167, longitude: 80.2667 },
  giriulla: { latitude: 7.3500, longitude: 80.1167 },

  // Anuradhapura
  'anuradhapura city': { latitude: 8.3114, longitude: 80.4037 },
  anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  kekirawa: { latitude: 8.0333, longitude: 80.6000 },
  eppawala: { latitude: 8.1500, longitude: 80.4167 },
  medawachchiya: { latitude: 8.5333, longitude: 80.4833 },
  habarana: { latitude: 8.0333, longitude: 80.7500 },

  // Badulla
  'badulla city': { latitude: 6.9934, longitude: 81.0550 },
  badulla: { latitude: 6.9934, longitude: 81.0550 },
  bandarawela: { latitude: 6.8333, longitude: 80.9833 },
  ella: { latitude: 6.8667, longitude: 81.0467 },
  diyatalawa: { latitude: 6.8167, longitude: 80.9667 },
  'hali-ela': { latitude: 6.9500, longitude: 81.0333 },
  welimada: { latitude: 6.9000, longitude: 80.9000 },

  // Nuwara Eliya
  'nuwara eliya': { latitude: 6.9497, longitude: 80.7891 },
  hatton: { latitude: 6.8917, longitude: 80.5972 },
  'nanu oya': { latitude: 6.9333, longitude: 80.7333 },
  talawakele: { latitude: 6.9372, longitude: 80.6583 },
  ragala: { latitude: 6.9833, longitude: 80.8500 },

  // Ratnapura
  'ratnapura city': { latitude: 6.6828, longitude: 80.4000 },
  ratnapura: { latitude: 6.6828, longitude: 80.4000 },
  balangoda: { latitude: 6.6500, longitude: 80.7000 },
  embilipitiya: { latitude: 6.3000, longitude: 80.8500 },
  eheliyagoda: { latitude: 6.8500, longitude: 80.2667 },
  kuruwita: { latitude: 6.7833, longitude: 80.3667 },
};

/**
 * Get geographic coordinates for a given Town and/or District in Sri Lanka.
 * Returns default Colombo coordinates only if town and district cannot be resolved.
 */
export function getCoordinatesForTownAndDistrict(town?: string, district?: string): Coordinates {
  if (town) {
    const cleanTown = town.trim().toLowerCase();
    if (TOWN_COORDINATES[cleanTown]) {
      return TOWN_COORDINATES[cleanTown];
    }
    // Partial search inside town keys
    for (const [key, coords] of Object.entries(TOWN_COORDINATES)) {
      if (cleanTown.includes(key) || key.includes(cleanTown)) {
        return coords;
      }
    }
  }

  if (district) {
    const cleanDist = district.trim();
    const matchedKey = Object.keys(DISTRICT_COORDINATES).find(
      (k) => k.toLowerCase() === cleanDist.toLowerCase()
    );
    if (matchedKey && DISTRICT_COORDINATES[matchedKey]) {
      return DISTRICT_COORDINATES[matchedKey];
    }
  }

  return DEFAULT_COORDINATES;
}

/**
 * Intelligently resolve coordinates from an address string label, town, and district.
 */
export async function resolveAddressCoordinates(
  addressLabel?: string,
  town?: string,
  district?: string
): Promise<Coordinates> {
  if (addressLabel) {
    const lower = addressLabel.toLowerCase();
    // Check if addressLabel mentions any known town
    for (const [key, coords] of Object.entries(TOWN_COORDINATES)) {
      if (lower.includes(key)) {
        return coords;
      }
    }
    // Check if addressLabel mentions any district
    for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
      if (lower.includes(key.toLowerCase())) {
        return coords;
      }
    }
    // Try online search
    try {
      const matches = await searchAddressCoords(addressLabel);
      if (matches && matches.length > 0 && matches[0].coords) {
        return matches[0].coords;
      }
    } catch (_) {}
  }

  return getCoordinatesForTownAndDistrict(town, district);
}

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
const STORAGE_KEY_IS_MANUAL_LOCATION = 'neighborplates_is_manual_location';

export async function isManualRiderLocation(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_IS_MANUAL_LOCATION);
    return raw === 'true';
  } catch (e) {
    return false;
  }
}

export async function clearManualRiderLocation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_IS_MANUAL_LOCATION);
  } catch (e) {}
}

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
export async function cacheRiderLocation(
  coords: Coordinates,
  label?: string,
  isManual: boolean = false
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_LOCATION, JSON.stringify(coords));
    if (label) {
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION_LABEL, label);
    }
    if (isManual) {
      await AsyncStorage.setItem(STORAGE_KEY_IS_MANUAL_LOCATION, 'true');
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
export async function getRealLocation(forceFreshGps: boolean = false): Promise<LocationResult> {
  // If user has chosen a manual area (e.g. Kandy), honor their choice unless explicitly forcing fresh GPS
  if (!forceFreshGps) {
    const isManual = await isManualRiderLocation();
    if (isManual) {
      const cached = await getCachedRiderLocation();
      const cachedLabel = await getCachedRiderLocationLabel();
      if (cached) {
        return {
          coords: cached,
          isRealGps: true,
          label: cachedLabel || `${cached.latitude.toFixed(4)}, ${cached.longitude.toFixed(4)}`,
        };
      }
    }
  }

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
      if (forceFreshGps || !(await isManualRiderLocation())) {
        await cacheRiderLocation(webPos, label, false);
      }
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
            if (forceFreshGps || !(await isManualRiderLocation())) {
              await cacheRiderLocation(coords, label, false);
            }
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
            if (forceFreshGps || !(await isManualRiderLocation())) {
              await cacheRiderLocation(coords, label, false);
            }
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
              if (forceFreshGps || !(await isManualRiderLocation())) {
                await cacheRiderLocation(coords, label, false);
              }
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
        if (forceFreshGps || !(await isManualRiderLocation())) {
          await cacheRiderLocation(coords, label, false);
        }
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
  // If rider manually selected a city, do not let GPS background watcher override it
  if (await isManualRiderLocation()) {
    return { remove: () => {} };
  }

  // Web watcher
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (await isManualRiderLocation()) return;
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        const label = await reverseGeocodeCoords(coords.latitude, coords.longitude);
        await cacheRiderLocation(coords, label, false);
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
        async (loc: any) => {
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
