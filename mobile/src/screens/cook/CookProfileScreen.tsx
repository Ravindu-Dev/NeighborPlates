import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Modal,
  StyleSheet,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Toast } from '../../components/common/Toast';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { DISTRICT_TOWN_DATA } from '../../constants/filterConstants';
import {
  requestGalleryPermission,
  pickImageFromGallery,
  uploadImageToImgBB,
  validateImageSize,
} from '../../services/imageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn("react-native-webview not loaded", e);
  }
}

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:        '#0F1923',
  darkMid:     '#132235',
  darkCard:    '#162438',
  darkBorder:  '#1E324D',
  green:       '#2D6A4F',
  greenLight:  '#52B788',
  greenGlow:   '#40916C',
  orange:      '#FF6B35',
  amber:       '#F59E0B',
  blue:        '#3B82F6',
  blueLight:   '#60A5FA',
  purple:      '#8B5CF6',
  red:         '#EF4444',
  redLight:    '#F87171',
  white:       '#FFFFFF',
  surface:     '#F4F7FB',
  cardBg:      '#FFFFFF',
  text1:       '#0F1923',
  text2:       '#475569',
  text3:       '#94A3B8',
  borderLight: '#E2E8F0',
};

const getPickerMapHtml = (initLat: number, initLon: number) => {
  const lat = initLat && initLat !== 0 ? initLat : 6.9271;
  const lon = initLon && initLon !== 0 ? initLon : 79.8612;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Select Location</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #F3F4F6;
        }
        .info-box {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0F1923;
          padding: 10px 20px;
          border-radius: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: #52B788;
          z-index: 1000;
          pointer-events: none;
          text-align: center;
          white-space: nowrap;
          border: 1px solid rgba(82, 183, 136, 0.4);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="info-box">📍 Tap on map to pin your home kitchen</div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var marker = L.marker([${lat}, ${lon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #2D6A4F; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 14px rgba(45, 106, 79, 0.9);"></div>',
            className: 'm',
            iconSize: [16, 16]
          }),
          draggable: true
        }).addTo(map);

        function onMapClick(e) {
          marker.setLatLng(e.latlng);
          sendCoords(e.latlng.lat, e.latlng.lng);
        }

        marker.on('dragend', function(e) {
          var position = marker.getLatLng();
          sendCoords(position.lat, position.lng);
        });

        map.on('click', onMapClick);

        function sendCoords(lat, lng) {
          var data = { type: 'SELECT_LOCATION', lat: lat, lng: lng };
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          } else {
            window.parent.postMessage(JSON.stringify(data), '*');
          }
        }
      </script>
    </body>
    </html>
  `;
};

export const CookProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser, updateUserAvatar } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 });

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-15)).current;

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTown, setEditTown] = useState('');
  const [editRadius, setEditRadius] = useState('');
  const [editLon, setEditLon] = useState('');
  const [editLat, setEditLat] = useState('');

  // Chef Avatar Photo State
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        try {
          let data = e.data;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          if (data && data.type === 'SELECT_LOCATION') {
            setEditLat(data.lat.toFixed(6));
            setEditLon(data.lng.toFixed(6));
          }
        } catch (err) {
          // Ignore
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
      populateEditFields(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const populateEditFields = (data: any) => {
    setEditName(data?.profile?.name || '');
    setEditPhone(data?.profile?.phone || '');
    setEditBio(data?.profile?.bio || '');
    setEditDistrict(data?.profile?.district || '');
    setEditTown(data?.profile?.town || '');
    setEditRadius(data?.profile?.deliveryRadius?.toString() || '');
    setEditLon(data?.profile?.location?.coordinates?.[0]?.toString() || '');
    setEditLat(data?.profile?.location?.coordinates?.[1]?.toString() || '');
    setEditAvatarUrl(data?.profile?.avatarUrl || '');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  // ─── Image Picker & ImgBB Upload Handler ───
  const handlePickAvatar = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission required to upload a profile photo.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return; // User cancelled

      await validateImageSize(asset);

      setUploadingAvatar(true);
      setEditAvatarUrl(asset.uri); // Instant optimistic local preview

      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setEditAvatarUrl(cdnUrl);

      // Auto-save to profile
      const currentProfile = profile?.profile || {};
      const updated = {
        ...currentProfile,
        name: currentProfile.name || user?.name || editName || 'Chef',
        avatarUrl: cdnUrl,
      };

      await api.put('/api/users/profile', updated);
      updateUserAvatar(cdnUrl);
      setProfile((prev: any) => ({
        ...prev,
        profile: { ...prev?.profile, avatarUrl: cdnUrl },
      }));
      setToast({ visible: true, message: '📸 Chef profile photo updated!', type: 'success' });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setEditAvatarUrl(profile?.profile?.avatarUrl || '');
      setToast({
        visible: true,
        message: err.message || 'Failed to upload photo. Please try again.',
        type: 'error',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const currentProfile = profile?.profile || {};
      const updated = {
        ...currentProfile,
        name: currentProfile.name || user?.name || editName || 'Chef',
        avatarUrl: '',
      };

      await api.put('/api/users/profile', updated);
      updateUserAvatar('');
      setEditAvatarUrl('');
      setProfile((prev: any) => ({
        ...prev,
        profile: { ...prev?.profile, avatarUrl: '' },
      }));
      setToast({ visible: true, message: 'Chef avatar reset to default.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ visible: true, message: 'Failed to remove avatar.', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation', 'Cook or kitchen name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const lonVal = parseFloat(editLon);
      const latVal = parseFloat(editLat);
      const updatedProfile = {
        name: editName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        district: editDistrict,
        town: editTown,
        deliveryRadius: parseFloat(editRadius) || 0,
        avatarUrl: editAvatarUrl || profile?.profile?.avatarUrl || '',
        hygieneVerified: profile?.profile?.hygieneVerified,
        kitchenPhotos: profile?.profile?.kitchenPhotos || [],
        location: {
          type: 'Point',
          coordinates: [
            !isNaN(lonVal) ? lonVal : (profile?.profile?.location?.coordinates?.[0] || 79.8612),
            !isNaN(latVal) ? latVal : (profile?.profile?.location?.coordinates?.[1] || 6.9271),
          ],
        },
      };

      const response = await api.put('/api/users/profile', updatedProfile);
      setProfile(response.data);
      updateUser({ name: editName.trim(), avatarUrl: updatedProfile.avatarUrl });
      setIsEditing(false);
      setToast({ visible: true, message: '✅ Kitchen profile updated successfully!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      setToast({
        visible: true,
        message: error.response?.data?.message || 'Failed to update kitchen profile.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    populateEditFields(profile);
    setIsEditing(false);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out of your kitchen account?')) {
        logout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out of your kitchen account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: logout },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={S.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color={C.greenLight} />
          <Text style={S.loadingText}>Syncing kitchen profile...</Text>
        </View>
      </View>
    );
  }

  const isVerified = Boolean(profile?.profile?.hygieneVerified);
  const locationCoords = profile?.profile?.location?.coordinates;
  const deliveryRadiusVal = profile?.profile?.deliveryRadius || 5;
  const currentAvatar = editAvatarUrl || profile?.profile?.avatarUrl;

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* ─── Screen Header Hero ─── */}
      <LinearGradient
        colors={['#0F1923', '#0D2137', '#0F2B1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.hero}
      >
        <View style={S.blobTopRight} />
        <View style={S.blobBottomLeft} />

        <Animated.View
          style={[
            S.heroContent,
            {
              opacity: heroOpacity,
              transform: [{ translateY: heroSlide }],
            },
          ]}
        >
          {/* Top Bar with Edit Button */}
          <View style={S.topBarRow}>
            <View style={S.chefTagPill}>
              <Ionicons name="ribbon" size={12} color={C.greenLight} style={{ marginRight: 5 }} />
              <Text style={S.chefTagText}>CERTIFIED CHEF PROFILE</Text>
            </View>

            {!isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                activeOpacity={0.8}
                style={S.editToggleBtn}
              >
                <Feather name="edit-2" size={12} color={C.white} style={{ marginRight: 5 }} />
                <Text style={S.editToggleText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCancelEdit}
                activeOpacity={0.8}
                style={S.cancelToggleBtn}
              >
                <Text style={S.cancelToggleText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Avatar and Identity */}
          <View style={S.profileHeaderRow}>
            <View style={S.avatarRing}>
              {/* Avatar Image / Fallback Touchable */}
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.85}
                style={S.avatarTouchable}
              >
                {currentAvatar ? (
                  <Image
                    source={{ uri: currentAvatar }}
                    style={S.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[C.green, C.darkMid]}
                    style={S.avatarInner}
                  >
                    <Text style={{ fontSize: 36 }}>👨‍🍳</Text>
                  </LinearGradient>
                )}

                {/* Uploading Spinner Overlay */}
                {uploadingAvatar && (
                  <View style={S.avatarUploadingOverlay}>
                    <ActivityIndicator size="small" color={C.white} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Camera Badge Action Trigger */}
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                activeOpacity={0.8}
                style={S.cameraBadgeBtn}
                accessibilityLabel="Upload Chef Photo"
              >
                <Feather name="camera" size={12} color={C.white} />
              </TouchableOpacity>

              <View style={[S.avatarOnlineDot, { backgroundColor: isVerified ? '#10B981' : '#F59E0B' }]} />
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={S.chefName} numberOfLines={1}>
                {profile?.profile?.name || 'Home Chef'}
              </Text>
              <Text style={S.chefEmail} numberOfLines={1}>
                {profile?.email}
              </Text>

              {/* Verified Pill */}
              <View style={[S.hygieneBadge, isVerified ? S.hygieneBadgeVerified : S.hygieneBadgePending]}>
                <Feather
                  name={isVerified ? 'shield' : 'clock'}
                  size={11}
                  color={isVerified ? C.greenLight : C.amber}
                  style={{ marginRight: 5 }}
                />
                <Text style={[S.hygieneBadgeText, { color: isVerified ? C.greenLight : C.amber }]}>
                  {isVerified ? 'Hygiene Verified Kitchen ✓' : 'Verification In Review'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bio Quote */}
          {profile?.profile?.bio ? (
            <View style={S.bioCard}>
              <Text style={S.bioText}>"{profile.profile.bio}"</Text>
            </View>
          ) : null}

          {/* Telemetry Stat Cards */}
          <View style={S.telemetryBar}>
            <View style={S.telemetryItem}>
              <Text style={S.telemetryVal}>{profile?.stats?.totalOrders ?? 0}</Text>
              <Text style={S.telemetryLbl}>Fulfilled Orders</Text>
            </View>

            <View style={S.telemetrySep} />

            <TouchableOpacity
              onPress={() => navigation.navigate('CookReviews')}
              activeOpacity={0.75}
              style={S.telemetryItem}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={[S.telemetryVal, { color: '#FBBF24' }]}>
                  {profile?.stats?.avgRating?.toFixed(1) ?? '5.0'}
                </Text>
              </View>
              <Text style={S.telemetryLbl}>Rating & Reviews ›</Text>
            </TouchableOpacity>

            <View style={S.telemetrySep} />

            <TouchableOpacity
              onPress={() => navigation.navigate('EarningDashboard')}
              activeOpacity={0.75}
              style={S.telemetryItem}
            >
              <Text style={[S.telemetryVal, { color: C.greenLight }]}>
                LKR {((profile?.stats?.totalEarnings ?? 0) / 1000).toFixed(1)}k
              </Text>
              <Text style={S.telemetryLbl}>Earnings ›</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.greenLight}
            colors={[C.greenLight]}
            progressBackgroundColor={C.darkCard}
          />
        }
      >
        {/* ─── Kitchen Details Card ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="home" size={16} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Kitchen & Service Operations</Text>
              <Text style={S.cardSub}>Location, delivery radius, and neighborhood coverage</Text>
            </View>
          </View>

          {isEditing ? (
            /* ════ Edit Mode ════ */
            <View>
              {/* Profile Photo Uploader Section in Edit Mode */}
              <View style={S.photoEditSection}>
                <Text style={S.inputLabel}>CHEF PROFILE PORTRAIT</Text>
                <View style={S.photoEditRow}>
                  <View style={S.photoEditThumbWrap}>
                    {currentAvatar ? (
                      <Image source={{ uri: currentAvatar }} style={S.photoEditThumb} resizeMode="cover" />
                    ) : (
                      <View style={S.photoEditPlaceholder}>
                        <Text style={{ fontSize: 26 }}>👨‍🍳</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 8 }}>
                    <TouchableOpacity
                      onPress={handlePickAvatar}
                      disabled={uploadingAvatar}
                      activeOpacity={0.8}
                      style={S.photoPickBtn}
                    >
                      {uploadingAvatar ? (
                        <ActivityIndicator size="small" color={C.green} />
                      ) : (
                        <>
                          <Feather name="camera" size={14} color={C.green} style={{ marginRight: 6 }} />
                          <Text style={S.photoPickText}>
                            {currentAvatar ? 'Change Chef Photo' : 'Upload Chef Photo'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {currentAvatar ? (
                      <TouchableOpacity
                        onPress={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        activeOpacity={0.8}
                        style={S.photoRemoveBtn}
                      >
                        <Feather name="trash-2" size={12} color={C.red} style={{ marginRight: 4 }} />
                        <Text style={S.photoRemoveText}>Remove Photo</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <Text style={S.photoTipText}>
                  A warm, smiling photo creates immediate trust and connection with hungry neighbors.
                </Text>
              </View>

              {/* Cook / Kitchen Name */}
              <Text style={S.inputLabel}>CHEF / KITCHEN NAME *</Text>
              <View style={S.inputBox}>
                <TextInput
                  placeholder="e.g. Grandma's Spice Kitchen"
                  placeholderTextColor={C.text3}
                  value={editName}
                  onChangeText={setEditName}
                  style={S.textInput}
                />
              </View>

              {/* Phone */}
              <Text style={[S.inputLabel, { marginTop: 14 }]}>PHONE NUMBER</Text>
              <View style={S.inputBox}>
                <TextInput
                  placeholder="+94 XX XXX XXXX"
                  placeholderTextColor={C.text3}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  style={S.textInput}
                />
              </View>

              {/* Bio */}
              <Text style={[S.inputLabel, { marginTop: 14 }]}>KITCHEN BIO / FLAVOR PHILOSOPHY</Text>
              <View style={S.textAreaBox}>
                <TextInput
                  placeholder="Tell neighbors what makes your dishes authentic and special..."
                  placeholderTextColor={C.text3}
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={3}
                  style={S.textAreaInput}
                />
              </View>

              {/* District & Town Picker */}
              <View style={{ marginTop: 14 }}>
                <DropdownPicker
                  label="DISTRICT"
                  placeholder="Select District..."
                  selectedValue={editDistrict}
                  onValueChange={(val) => {
                    setEditDistrict(val);
                    setEditTown('');
                  }}
                  options={Object.keys(DISTRICT_TOWN_DATA)}
                  iconName="map-pin"
                />

                <DropdownPicker
                  label="TOWN / NEIGHBORHOOD"
                  placeholder={editDistrict ? "Select Town..." : "Select District first..."}
                  selectedValue={editTown}
                  onValueChange={setEditTown}
                  options={editDistrict ? DISTRICT_TOWN_DATA[editDistrict] || [] : []}
                  disabled={!editDistrict}
                  iconName="navigation"
                />
              </View>

              {/* Delivery Radius */}
              <Text style={[S.inputLabel, { marginTop: 4 }]}>DELIVERY RADIUS (KM)</Text>
              <View style={S.inputBox}>
                <TextInput
                  placeholder="e.g. 5"
                  placeholderTextColor={C.text3}
                  value={editRadius}
                  onChangeText={setEditRadius}
                  keyboardType="numeric"
                  style={S.textInput}
                />
                <Text style={S.inputSuffix}>km coverage</Text>
              </View>
              <Text style={S.helperText}>Maximum radius you or riders can deliver meals</Text>

              {/* Map Coordinates Button */}
              <Text style={[S.inputLabel, { marginTop: 14 }]}>GPS LOCATION PIN</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                <View style={[S.inputBox, { flex: 1 }]}>
                  <Text style={S.coordPrefix}>Lon:</Text>
                  <TextInput
                    value={editLon}
                    onChangeText={setEditLon}
                    placeholder="79.8612"
                    placeholderTextColor={C.text3}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                </View>
                <View style={[S.inputBox, { flex: 1 }]}>
                  <Text style={S.coordPrefix}>Lat:</Text>
                  <TextInput
                    value={editLat}
                    onChangeText={setEditLat}
                    placeholder="6.9271"
                    placeholderTextColor={C.text3}
                    keyboardType="numeric"
                    style={S.textInput}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setMapCenter({
                    lat: parseFloat(editLat) || 6.9271,
                    lng: parseFloat(editLon) || 79.8612,
                  });
                  setShowMapModal(true);
                }}
                activeOpacity={0.85}
                style={S.pickMapBtn}
              >
                <Feather name="map-pin" size={14} color={C.green} style={{ marginRight: 6 }} />
                <Text style={S.pickMapText}>Pick Kitchen Location on Map 📍</Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.88}
                style={S.saveBtn}
              >
                <LinearGradient
                  colors={[C.greenLight, C.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.saveGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <>
                      <Feather name="check" size={16} color={C.white} style={{ marginRight: 8 }} />
                      <Text style={S.saveBtnText}>SAVE KITCHEN CHANGES</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* ════ View Mode ════ */
            <View style={S.viewDetailsList}>
              <View style={S.detailRow}>
                <View style={S.detailLabelWrap}>
                  <Feather name="phone" size={13} color={C.text3} style={{ marginRight: 8 }} />
                  <Text style={S.detailLabel}>Contact Phone</Text>
                </View>
                <Text style={S.detailValue}>{profile?.profile?.phone || 'Not configured'}</Text>
              </View>

              <View style={S.detailRow}>
                <View style={S.detailLabelWrap}>
                  <Feather name="map-pin" size={13} color={C.text3} style={{ marginRight: 8 }} />
                  <Text style={S.detailLabel}>District & Town</Text>
                </View>
                <Text style={S.detailValue}>
                  {profile?.profile?.district
                    ? `${profile.profile.town || ''}, ${profile.profile.district}`
                    : 'Not configured'}
                </Text>
              </View>

              <View style={S.detailRow}>
                <View style={S.detailLabelWrap}>
                  <Feather name="compass" size={13} color={C.text3} style={{ marginRight: 8 }} />
                  <Text style={S.detailLabel}>Delivery Radius</Text>
                </View>
                <View style={S.radiusPill}>
                  <Text style={S.radiusPillText}>{deliveryRadiusVal} km service zone</Text>
                </View>
              </View>

              <View style={S.detailRow}>
                <View style={S.detailLabelWrap}>
                  <Feather name="navigation" size={13} color={C.text3} style={{ marginRight: 8 }} />
                  <Text style={S.detailLabel}>Kitchen GPS Pin</Text>
                </View>
                <Text style={S.detailValue}>
                  {locationCoords
                    ? `${locationCoords[1].toFixed(4)}, ${locationCoords[0].toFixed(4)}`
                    : '6.9271, 79.8612'}
                </Text>
              </View>

              <View style={[S.detailRow, { borderBottomWidth: 0 }]}>
                <View style={S.detailLabelWrap}>
                  <Feather name="shield" size={13} color={C.text3} style={{ marginRight: 8 }} />
                  <Text style={S.detailLabel}>Hygiene Audit</Text>
                </View>
                <View style={[S.statusPill, isVerified ? S.statusPillVerified : S.statusPillPending]}>
                  <Text style={[S.statusPillText, { color: isVerified ? '#065F46' : '#92400E' }]}>
                    {isVerified ? 'Grade A Verified' : 'Standard Audit In Progress'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ─── Kitchen Quick Portals ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="grid" size={16} color={C.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Kitchen Portals & Navigation</Text>
              <Text style={S.cardSub}>Quick access to performance and analytics</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('EarningDashboard')}
            activeOpacity={0.8}
            style={S.portalRow}
          >
            <View style={[S.portalIcon, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="dollar-sign" size={16} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.portalTitle}>Earning & Payouts Dashboard</Text>
              <Text style={S.portalSub}>Track revenue, 90% net take-home, and weekly bank settlements</Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CookReviews')}
            activeOpacity={0.8}
            style={S.portalRow}
          >
            <View style={[S.portalIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="star" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.portalTitle}>Customer Reviews & Ratings</Text>
              <Text style={S.portalSub}>Read what neighbors love about your dishes</Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ComboDeals')}
            activeOpacity={0.8}
            style={[S.portalRow, { borderBottomWidth: 0 }]}
          >
            <View style={[S.portalIcon, { backgroundColor: '#F3E8FF' }]}>
              <Text style={{ fontSize: 16 }}>🎁</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.portalTitle}>AI Combo Deals Studio</Text>
              <Text style={S.portalSub}>Bundle meals with automated discounts to boost order sizes</Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.text3} />
          </TouchableOpacity>
        </View>

        {/* ─── Account & Credentials Section ─── */}
        <View style={S.sectionCard}>
          <View style={S.cardHeaderRow}>
            <View style={[S.cardIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="settings" size={16} color={C.text2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>Account Credentials</Text>
              <Text style={S.cardSub}>Security, authentication, and membership info</Text>
            </View>
          </View>

          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Registered Email</Text>
            <Text style={S.detailValue}>{profile?.email}</Text>
          </View>

          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Account Role</Text>
            <View style={S.roleBadge}>
              <Text style={S.roleBadgeText}>CHEF & COOK</Text>
            </View>
          </View>

          <View style={[S.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={S.detailLabel}>Member Since</Text>
            <Text style={S.detailValue}>
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Active Member'}
            </Text>
          </View>
        </View>

        {/* ─── Logout CTA ─── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={S.logoutBtn}
        >
          <Feather name="log-out" size={16} color={C.red} style={{ marginRight: 8 }} />
          <Text style={S.logoutText}>LOG OUT OF KITCHEN ACCOUNT</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Deluxe Leaflet Map Location Picker Modal ─── */}
      <Modal visible={showMapModal} transparent animationType="slide">
        <View style={S.mapModalOverlay}>
          <View style={S.mapModalSheet}>
            {/* Modal Header */}
            <View style={S.mapModalHeader}>
              <View>
                <Text style={S.mapModalTitle}>Pick Kitchen Pin Location 📍</Text>
                <Text style={S.mapModalSub}>Tap or drag the emerald pin to your kitchen</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMapModal(false)}
                style={S.closeModalBtn}
              >
                <Feather name="x" size={16} color={C.text2} />
              </TouchableOpacity>
            </View>

            {/* Map Container */}
            <View style={S.mapContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getPickerMapHtml(mapCenter.lat, mapCenter.lng)}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Location Picker Map"
                />
              ) : (
                WebView && (
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: getPickerMapHtml(mapCenter.lat, mapCenter.lng) }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    domStorageEnabled
                    onMessage={(event: any) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'SELECT_LOCATION') {
                          setEditLat(data.lat.toFixed(6));
                          setEditLon(data.lng.toFixed(6));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  />
                )
              )}
            </View>

            {/* Confirm Actions bar */}
            <View style={S.mapConfirmBar}>
              <TouchableOpacity
                onPress={() => setShowMapModal(false)}
                activeOpacity={0.88}
                style={S.confirmPinBtn}
              >
                <LinearGradient
                  colors={[C.greenLight, C.green]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.confirmPinGradient}
                >
                  <Feather name="check-circle" size={16} color={C.white} style={{ marginRight: 8 }} />
                  <Text style={S.confirmPinText}>CONFIRM KITCHEN PIN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  loadingBox: {
    backgroundColor: C.white,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    color: C.text2,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },

  // Hero Section
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 20,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  blobTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(82, 183, 136, 0.12)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chefTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 183, 136, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(82, 183, 136, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chefTagText: {
    color: C.greenLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editToggleText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  cancelToggleBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cancelToggleText: {
    color: C.redLight,
    fontSize: 11,
    fontWeight: '800',
  },

  // Avatar & Identity
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarRing: {
    position: 'relative',
  },
  avatarTouchable: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    backgroundColor: C.darkMid,
  },
  avatarInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 25, 35, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.dark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  avatarOnlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.dark,
  },
  chefName: {
    fontSize: 20,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
  },
  chefEmail: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
    marginBottom: 6,
  },
  hygieneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  hygieneBadgeVerified: {
    backgroundColor: 'rgba(82, 183, 136, 0.15)',
    borderColor: 'rgba(82, 183, 136, 0.4)',
  },
  hygieneBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  hygieneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Bio Card
  bioCard: {
    backgroundColor: 'rgba(22, 36, 56, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bioText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // Telemetry Bar
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 36, 56, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryVal: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  telemetryLbl: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  telemetrySep: {
    width: 1,
    height: 22,
    backgroundColor: C.darkBorder,
  },

  // Scroll Body
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: C.text1,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '500',
    marginTop: 1,
  },

  // Photo Edit Section in Edit Mode
  photoEditSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  photoEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  photoEditThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  photoEditThumb: {
    width: '100%',
    height: '100%',
  },
  photoEditPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  photoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  photoPickText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
  },
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  photoRemoveText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.red,
  },
  photoTipText: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '500',
    lineHeight: 14,
  },

  // Form Inputs
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.text2,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    padding: 0,
  },
  inputSuffix: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text3,
    marginLeft: 6,
  },
  coordPrefix: {
    fontSize: 11,
    fontWeight: '800',
    color: C.text2,
    marginRight: 6,
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaInput: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text1,
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
  },
  helperText: {
    fontSize: 10,
    color: C.text3,
    marginTop: 4,
    marginLeft: 2,
  },
  pickMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(45, 106, 79, 0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  pickMapText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
  },
  saveBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // View Details List
  viewDetailsList: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: C.text2,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: C.text1,
    textAlign: 'right',
  },
  radiusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  radiusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.green,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillVerified: {
    backgroundColor: '#ECFDF5',
  },
  statusPillPending: {
    backgroundColor: '#FFFBEB',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Portal Rows
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  portalIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text1,
    marginBottom: 2,
  },
  portalSub: {
    fontSize: 10,
    color: C.text3,
    fontWeight: '500',
  },

  // Account Badges
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.blue,
  },

  // Logout CTA
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    color: C.red,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Map Modal
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 25, 35, 0.65)',
    justifyContent: 'flex-end',
  },
  mapModalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '82%',
    overflow: 'hidden',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.text1,
  },
  mapModalSub: {
    fontSize: 11,
    color: C.text3,
    fontWeight: '600',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  mapConfirmBar: {
    padding: 16,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmPinBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmPinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmPinText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
