import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// ─── ImgBB Configuration ───
// Free tier: unlimited uploads, 32MB max, CDN-served
// Get your key at https://api.imgbb.com/
const IMGBB_API_KEY = '5ed594bd967f6cbf446be42d4f29a003';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

/**
 * Request media-library permissions from the user.
 * Returns true if granted, false otherwise.
 */
export const requestGalleryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

/**
 * Open the device gallery and let the user pick a single image.
 * Returns the local file URI, or null if cancelled.
 */
export const pickImageFromGallery = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,          // 70% quality — keeps file size small
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
};

/**
 * Upload a local image URI to ImgBB and return the CDN URL.
 *
 * Flow:
 *   1. Read local file as base64
 *   2. POST base64 string to ImgBB API
 *   3. Return the hosted image URL
 *
 * @param localUri - file:// URI from expo-image-picker
 * @returns ImgBB CDN URL string
 * @throws Error on network failure, invalid key, or upload error
 */
export const uploadImageToImgBB = async (localUri: string): Promise<string> => {
  // Read the file as base64
  let base64Data: string;

  if (Platform.OS === 'web') {
    // On web, fetch the blob and convert to base64
    const response = await fetch(localUri);
    const blob = await response.blob();
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the data:image/...;base64, prefix
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // On native, use expo-file-system
    base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
    });
  }

  // Build form data for ImgBB
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Data);

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImgBB upload failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();

  if (!json.success) {
    throw new Error(json.error?.message || 'ImgBB upload returned an error');
  }

  // Return the direct image URL
  return json.data.display_url;
};
