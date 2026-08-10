import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
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

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ route, navigation }) => {
  const { role } = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState('5'); // default 5km for cooks
  const [longitude, setLongitude] = useState('79.8612');
  const [latitude, setLatitude] = useState('6.9271');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 });
  const { register, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        try {
          let data = e.data;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          if (data && data.type === 'SELECT_LOCATION') {
            setLatitude(data.lat.toFixed(6));
            setLongitude(data.lng.toFixed(6));
          }
        } catch (err) {
          // Ignore
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }
    try {
      const regData = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        phone: phone.trim(),
        bio: role === 'COOK' ? bio : undefined,
        deliveryRadius: role === 'COOK' ? parseFloat(radius) : undefined,
        coordinates: role === 'COOK' 
          ? [parseFloat(longitude) || 79.8612, parseFloat(latitude) || 6.9271] 
          : undefined,
      };
      await register(regData);
    } catch (err) {
      // Error handled by store and displayed on UI
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-surface-elevated">
      <View className="flex-1 justify-center p-6 my-6">
        <View className="mb-6 items-center">
          <Text className="text-primary text-3xl font-extrabold tracking-tight">NeighborPlates</Text>
          <Text className="text-textSecondary text-xs mt-1 text-center">
            Register as a {role === 'COOK' ? 'Home Cook' : 'Customer'}
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-textPrimary text-xl font-bold mb-6 text-center">Create Account</Text>

          <TextInput
            label="FULL NAME"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            label="EMAIL ADDRESS"
            placeholder="john.doe@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="PHONE NUMBER"
            placeholder="+94 77 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            label="PASSWORD"
            placeholder="Choose a strong password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {role === 'COOK' ? (
            <>
              <TextInput
                label="ABOUT YOUR KITCHEN / BIO"
                placeholder="Share your culinary background, specialties, etc."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />
              <TextInput
                label="DELIVERY RADIUS (KM)"
                placeholder="e.g. 5"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextInput
                    label="KITCHEN LONGITUDE"
                    placeholder="e.g. 79.8612"
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    label="KITCHEN LATITUDE"
                    placeholder="e.g. 6.9271"
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setMapCenter({
                    lat: parseFloat(latitude) || 6.9271,
                    lng: parseFloat(longitude) || 79.8612
                  });
                  setShowMapModal(true);
                }}
                className="bg-secondary/10 border border-secondary/20 rounded-2xl py-3 px-4 flex-row justify-center items-center gap-2 mb-4 mt-2"
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={14} color="#2D6A4F" />
                <Text className="text-secondary font-black text-xs uppercase tracking-wider">
                  Pick Location on Map 📍
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {error ? (
            <Text className="text-red-500 text-xs mb-4 text-center font-medium">{error}</Text>
          ) : null}

          <Button
            title="SIGN UP"
            onPress={handleRegister}
            loading={isLoading}
            variant={role === 'COOK' ? 'secondary' : 'primary'}
            className="w-full mt-2"
          />
        </View>

        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-textMuted text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-primary font-bold text-sm">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                          setLatitude(data.lat.toFixed(6));
                          setLongitude(data.lng.toFixed(6));
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
    </ScrollView>
  );
};
