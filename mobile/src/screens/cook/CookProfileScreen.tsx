import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Toast } from '../../components/common/Toast';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Feather } from '@expo/vector-icons';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn("react-native-webview not loaded", e);
  }
}

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
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 8px 16px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #374151;
          z-index: 1000;
          pointer-events: none;
          text-align: center;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="info-box">Tap map to place kitchen pin 📍</div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var marker = L.marker([${lat}, ${lon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #2D6A4F; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(45, 106, 79, 0.8);"></div>',
            className: 'm',
            iconSize: [14, 14]
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
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 });

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

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRadius, setEditRadius] = useState('');
  const [editLon, setEditLon] = useState('');
  const [editLat, setEditLat] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
      populateEditFields(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const populateEditFields = (data: any) => {
    setEditName(data?.profile?.name || '');
    setEditPhone(data?.profile?.phone || '');
    setEditBio(data?.profile?.bio || '');
    setEditRadius(data?.profile?.deliveryRadius?.toString() || '');
    setEditLon(data?.profile?.location?.coordinates?.[0]?.toString() || '');
    setEditLat(data?.profile?.location?.coordinates?.[1]?.toString() || '');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation', 'Name cannot be empty.');
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
        deliveryRadius: parseFloat(editRadius) || 0,
        // Preserve existing fields
        avatarUrl: profile?.profile?.avatarUrl,
        hygieneVerified: profile?.profile?.hygieneVerified,
        kitchenPhotos: profile?.profile?.kitchenPhotos || [],
        location: {
          type: 'Point',
          coordinates: [
            !isNaN(lonVal) ? lonVal : (profile?.profile?.location?.coordinates?.[0] || 79.8612),
            !isNaN(latVal) ? latVal : (profile?.profile?.location?.coordinates?.[1] || 6.9271)
          ]
        },
      };

      const response = await api.put('/api/users/profile', updatedProfile);
      setProfile(response.data);
      setIsEditing(false);
      setToast({ visible: true, message: '✅ Profile updated successfully!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      setToast({
        visible: true,
        message: error.response?.data?.message || 'Failed to update profile.',
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
      <View className="flex-1 bg-surface-elevated px-4 pt-14">
        <View className="items-center mb-6">
          <SkeletonLoader width={80} height={80} borderRadius={40} className="mb-3" />
          <SkeletonLoader width="50%" height={20} className="mb-2" />
          <SkeletonLoader width="40%" height={14} />
        </View>
        <View className="flex-row mb-6">
          <View className="flex-1 mr-2"><SkeletonLoader height={80} borderRadius={16} /></View>
          <View className="flex-1 mr-2"><SkeletonLoader height={80} borderRadius={16} /></View>
          <View className="flex-1"><SkeletonLoader height={80} borderRadius={16} /></View>
        </View>
        <SkeletonLoader height={200} borderRadius={24} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-elevated">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" colors={['#2D6A4F']} />
        }
      >
        <View className="px-5 pt-14 pb-8">
          {/* ─── Profile Header Card ─── */}
          <Card className="p-6 items-center mb-5" bordered>
            {/* Avatar */}
            <View className="w-24 h-24 bg-secondary/10 rounded-full items-center justify-center mb-3">
              <Text className="text-4xl">👨‍🍳</Text>
            </View>

            {/* Name & Email */}
            <Text className="text-textPrimary font-extrabold text-xl mb-0.5">
              {profile?.profile?.name}
            </Text>
            <Text className="text-textSecondary text-sm mb-2">{profile?.email}</Text>

            {/* Verification Badge */}
            <Badge
              label={profile?.profile?.hygieneVerified ? 'Verified Cook ✓' : 'Verification Pending'}
              variant={profile?.profile?.hygieneVerified ? 'success' : 'warning'}
            />

            {/* Bio */}
            {profile?.profile?.bio ? (
              <Text className="text-textMuted text-xs text-center px-4 mt-3 italic leading-4">
                "{profile.profile.bio}"
              </Text>
            ) : null}
          </Card>

          {/* ─── Stats Row ─── */}
          <View className="flex-row mb-5">
            <StatCard
              icon="📦"
              label="ORDERS"
              value={profile?.stats?.totalOrders ?? 0}
              className="mr-2"
            />
            <StatCard
              icon="⭐"
              label="RATING"
              value={profile?.stats?.avgRating?.toFixed(1) ?? '0.0'}
              valueColor="#FBBF24"
              className="mr-2"
            />
            <StatCard
              icon="💰"
              label="EARNINGS"
              value={`LKR ${(profile?.stats?.totalEarnings ?? 0).toLocaleString()}`}
            />
          </View>

          {/* ─── Profile Details / Edit Section ─── */}
          <Card className="p-5 mb-5" bordered>
            <View className="flex-row justify-between items-center mb-4">
              <SectionHeader title="Kitchen Details" icon="🏠" className="mb-0" />
              {!isEditing ? (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.7}
                  className="bg-secondary/10 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-secondary font-bold text-[10px] uppercase">✏️ Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleCancelEdit} activeOpacity={0.7}>
                  <Text className="text-red-400 font-semibold text-xs">Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              /* ── Edit Mode ── */
              <View>
                <TextInput
                  label="COOK NAME"
                  placeholder="Your kitchen name"
                  value={editName}
                  onChangeText={setEditName}
                />
                <TextInput
                  label="PHONE NUMBER"
                  placeholder="+94 XX XXX XXXX"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  label="KITCHEN BIO"
                  placeholder="Tell customers about your cooking style..."
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={3}
                />
                 <TextInput
                  label="DELIVERY RADIUS (km)"
                  placeholder="e.g. 5"
                  value={editRadius}
                  onChangeText={setEditRadius}
                  keyboardType="numeric"
                  helperText="Maximum distance you can deliver to"
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextInput
                      label="KITCHEN LONGITUDE"
                      placeholder="e.g. 79.8612"
                      value={editLon}
                      onChangeText={setEditLon}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      label="KITCHEN LATITUDE"
                      placeholder="e.g. 6.9271"
                      value={editLat}
                      onChangeText={setEditLat}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                 <TouchableOpacity
                  onPress={() => {
                    setMapCenter({
                      lat: parseFloat(editLat) || 6.9271,
                      lng: parseFloat(editLon) || 79.8612
                    });
                    setShowMapModal(true);
                  }}
                  className="bg-primary/10 border border-primary/20 rounded-2xl py-3 px-4 flex-row justify-center items-center gap-2 mb-4 mt-2"
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={14} color="#FF6B35" />
                  <Text className="text-primary font-black text-xs uppercase tracking-wider">
                    Pick Location on Map 📍
                  </Text>
                </TouchableOpacity>
                <Button
                  title="💾  SAVE CHANGES"
                  onPress={handleSaveProfile}
                  loading={saving}
                  variant="secondary"
                  className="w-full mt-2"
                />
              </View>
            ) : (
              /* ── View Mode ── */
              <View>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs">Cook Name</Text>
                  <Text className="text-textPrimary font-bold text-xs">{profile?.profile?.name}</Text>
                </View>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs">Phone Number</Text>
                  <Text className="text-textPrimary font-bold text-xs">
                    {profile?.profile?.phone || 'Not set'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs">Kitchen Bio</Text>
                  <Text className="text-textPrimary font-bold text-xs text-right flex-1 ml-4" numberOfLines={2}>
                    {profile?.profile?.bio || 'Not set'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs">Delivery Radius</Text>
                  <Text className="text-textPrimary font-bold text-xs">
                    {profile?.profile?.deliveryRadius ? `${profile.profile.deliveryRadius} km` : 'Not set'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                  <Text className="text-textSecondary text-xs">Kitchen Location</Text>
                  <Text className="text-textPrimary font-bold text-xs">
                    {profile?.profile?.location?.coordinates 
                      ? `${profile.profile.location.coordinates[1].toFixed(4)}, ${profile.profile.location.coordinates[0].toFixed(4)}`
                      : 'Not set'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-3">
                  <Text className="text-textSecondary text-xs">Hygiene Verification</Text>
                  <Badge
                    label={profile?.profile?.hygieneVerified ? 'Verified' : 'Pending'}
                    variant={profile?.profile?.hygieneVerified ? 'success' : 'warning'}
                  />
                </View>
              </View>
            )}
          </Card>

          {/* ─── Account Section ─── */}
          <Card className="p-5 mb-5" bordered>
            <SectionHeader title="Account" icon="⚙️" />

            <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
              <Text className="text-textSecondary text-xs">Email Address</Text>
              <Text className="text-textPrimary font-bold text-xs">{profile?.email}</Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
              <Text className="text-textSecondary text-xs">Account Role</Text>
              <Badge label="Cook" variant="secondary" />
            </View>
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-textSecondary text-xs">Member Since</Text>
              <Text className="text-textPrimary font-bold text-xs">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </Card>

          {/* ─── Logout Button ─── */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            className="bg-white border border-red-200 rounded-2xl py-4 items-center justify-center mb-4"
          >
            <Text className="text-red-500 font-bold text-sm tracking-wide">🚪 LOG OUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Select Location Modal Map */}
      <Modal visible={showMapModal} transparent animationType="slide">
        <View className="flex-grow flex bg-black/60 justify-end h-full">
          <View className="bg-white rounded-t-[32px] w-full h-[80%] border-t border-gray-150 flex-col">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <View>
                <Text className="text-textPrimary font-black text-lg">Pick Kitchen Location</Text>
                <Text className="text-textSecondary text-[10px] font-bold uppercase mt-0.5">TAP ON MAP TO SELECT KITCHEN LOCATION</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMapModal(false)}
                className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center border border-gray-150"
              >
                <Feather name="x" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Map Container */}
            <View className="flex-1">
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
            <View className="p-6 bg-gray-50 border-t border-gray-100">
              <Button
                title="🎯 CONFIRM KITCHEN PIN"
                onPress={() => setShowMapModal(false)}
                variant="secondary"
                className="w-full"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
