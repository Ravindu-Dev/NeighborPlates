import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Platform, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Feather, Ionicons } from '@expo/vector-icons';

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
      <title>Select Delivery Location</title>
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
      <div class="info-box">Tap map to place delivery pin 📍</div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var marker = L.marker([${lat}, ${lon}], {
          icon: L.divIcon({
            html: '<div style="background-color: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>',
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

type CheckoutScreenProps = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { items: cartItems, getCartTotal } = useCartStore();

  const [deliveryMethod, setDeliveryMethod] = useState<'COOK_DELIVERY' | 'PICKUP'>('COOK_DELIVERY');
  const [streetAddress, setStreetAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeSlot, setTimeSlot] = useState<'ASAP' | 'SCHEDULED'>('ASAP');

  // Dynamic Geolocation states
  const [latitude, setLatitude] = useState('6.9271');
  const [longitude, setLongitude] = useState('79.8612');
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 });
  
  // Validation error states
  const [addressError, setAddressError] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const updateAddressFromCoords = async (latVal: number, lonVal: number) => {
    setStreetAddress("Fetching address details...");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latVal}&lon=${lonVal}`, {
        headers: {
          'User-Agent': 'NeighborPlates-Mobile/1.0'
        }
      });
      const data = await res.json();
      if (data && data.display_name) {
        setStreetAddress(data.display_name);
        return;
      }
    } catch (err) {
      console.warn("Geocoding failed", err);
    }
    setStreetAddress(`Pinned Location (Lat: ${latVal.toFixed(6)}, Lng: ${lonVal.toFixed(6)})`);
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        try {
          let data = e.data;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          if (data && data.type === 'SELECT_LOCATION') {
            const latVal = parseFloat(data.lat.toFixed(6));
            const lonVal = parseFloat(data.lng.toFixed(6));
            setLatitude(data.lat.toFixed(6));
            setLongitude(data.lng.toFixed(6));
            updateAddressFromCoords(latVal, lonVal);
            setAddressError(''); // Clear error if filled
          }
        } catch (err) {
          // Ignore
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  // Default to 1 hour from now
  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date(Date.now() + 3600 * 1000);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items to proceed.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [cartItems, navigation]);

  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-surface-elevated">
        {/* Sticky Header */}
        <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-150">
            <Feather name="chevron-left" size={18} color="#1A1A2E" />
          </TouchableOpacity>
          <Text className="font-black text-xl text-textPrimary">Checkout Info</Text>
        </View>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-5xl mb-4">🛒</Text>
          <Text className="text-textPrimary font-extrabold text-sm mb-1 text-center">Your basket is empty</Text>
          <Text className="text-textSecondary text-xs text-center leading-relaxed">
            Please add items from neighboring home kitchens to proceed with checkout.
          </Text>
        </View>
      </View>
    );
  }

  const subtotal = getCartTotal();
  // Apply LKR 150 discount if subtotal >= 300 (to prevent Stripe amount_too_small failures)
  const promoDiscount = (cartItems.length > 0 && subtotal >= 300) ? 150.0 : 0.0;
  // Free delivery for orders LKR 1000+
  const isFreeDelivery = subtotal >= 1000;
  const deliveryFee = deliveryMethod === 'COOK_DELIVERY' ? (isFreeDelivery ? 0.0 : 150.0) : 0.0;
  const total = subtotal - promoDiscount + deliveryFee;

  const handleContinueToPayment = () => {
    let isValid = true;

    if (deliveryMethod === 'COOK_DELIVERY' && !streetAddress.trim()) {
      setAddressError('Street address is required for delivery.');
      isValid = false;
    } else {
      setAddressError('');
    }

    if (timeSlot === 'SCHEDULED' && !scheduledFor.trim()) {
      setScheduleError('Please specify target delivery time.');
      isValid = false;
    } else {
      setScheduleError('');
    }

    if (!isValid) {
      Alert.alert('Incomplete Fields', 'Please fill in all required fields (marked with *).');
      return;
    }

    const scheduledDate = new Date(Date.now() + (timeSlot === 'ASAP' ? 1800 : 3600) * 1000).toISOString(); // ISO timestamp for backend

    navigation.navigate('Payment', {
      streetAddress: deliveryMethod === 'PICKUP' ? 'Self Pickup at Kitchen' : streetAddress,
      deliveryMethod,
      specialInstructions: instructions,
      scheduledFor: scheduledDate,
      subtotal,
      promoDiscount,
      deliveryFee,
      total,
      latitude: deliveryMethod === 'PICKUP' ? 6.9271 : parseFloat(latitude) || 6.9271,
      longitude: deliveryMethod === 'PICKUP' ? 79.8612 : parseFloat(longitude) || 79.8612,
    });
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Header with visual stepper progress */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3 border border-gray-150">
            <Feather name="chevron-left" size={18} color="#1A1A2E" />
          </TouchableOpacity>
          <Text className="font-black text-xl text-textPrimary">Checkout Info</Text>
        </View>
        <View className="flex-row items-center gap-0.5 bg-gray-50 border border-gray-150 rounded-full px-3 py-1">
          <Text className="text-[10px] font-black text-primary">STEP 2</Text>
          <Text className="text-[10px] font-black text-textMuted">/ 3</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Delivery Method Selection */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">DELIVERY PREFERENCE</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setDeliveryMethod('COOK_DELIVERY')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                deliveryMethod === 'COOK_DELIVERY'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="truck" size={14} color={deliveryMethod === 'COOK_DELIVERY' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${deliveryMethod === 'COOK_DELIVERY' ? 'text-primary' : 'text-textSecondary'}`}>
                Delivery
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setDeliveryMethod('PICKUP')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                deliveryMethod === 'PICKUP'
                  ? 'bg-primary/10 border-primary'
                  : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="shopping-bag" size={14} color={deliveryMethod === 'PICKUP' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${deliveryMethod === 'PICKUP' ? 'text-primary' : 'text-textSecondary'}`}>
                Self Pickup
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Map Picker Interface */}
        {deliveryMethod === 'COOK_DELIVERY' && (
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-3.5">DELIVERY LOCATION</Text>
            
            {/* Visual Pick Buttons */}
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={() => {
                  setMapCenter({
                    lat: parseFloat(latitude) || 6.9271,
                    lng: parseFloat(longitude) || 79.8612
                  });
                  setShowMapModal(true);
                }}
                className="flex-1 bg-primary/10 border border-primary/20 rounded-2xl py-3 items-center justify-center flex-row gap-1.5"
                activeOpacity={0.8}
              >
                <Feather name="map" size={14} color="#FF6B35" />
                <Text className="text-primary font-black text-[10px] uppercase tracking-wider">Select on Map 📍</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude: latVal, longitude: lonVal } = position.coords;
                        setLatitude(latVal.toFixed(6));
                        setLongitude(lonVal.toFixed(6));
                        updateAddressFromCoords(latVal, lonVal);
                        setAddressError('');
                        Alert.alert("GPS Success", `Location auto-filled: ${latVal.toFixed(4)}, ${lonVal.toFixed(4)}`);
                      },
                      (error) => {
                        console.warn("GPS failed", error);
                        Alert.alert("GPS Error", "Unable to detect location. Please select on the map manually.");
                      },
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  } else {
                    Alert.alert("Not Supported", "GPS Auto-Detection is not supported on this device.");
                  }
                }}
                className="flex-1 bg-secondary/10 border border-secondary/20 rounded-2xl py-3 items-center justify-center flex-row gap-1.5"
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={14} color="#2D6A4F" />
                <Text className="text-secondary font-black text-[10px] uppercase tracking-wider">Auto GPS 🛰️</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              label="STREET ADDRESS *"
              placeholder="Enter complete delivery address details..."
              value={streetAddress}
              onChangeText={(text) => {
                setStreetAddress(text);
                if (text.trim()) setAddressError('');
              }}
              error={addressError}
              helperText="Please select your location on the map or type your street address."
              multiline
            />
          </View>
        )}

        {deliveryMethod === 'PICKUP' && (
          <View className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl mb-5 flex-row items-start gap-2.5">
            <Ionicons name="information-circle" size={18} color="#10B981" />
            <Text className="text-emerald-800 text-xs font-semibold leading-relaxed flex-1">
              Pickup Mode Enabled: You will receive the cook's address details and instructions to pick up your order once the chef marks it ready.
            </Text>
          </View>
        )}

        {/* Scheduling Details */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">TIME PREFERENCE</Text>
          <View className="flex-row gap-4 mb-4">
            <TouchableOpacity
              onPress={() => setTimeSlot('ASAP')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                timeSlot === 'ASAP' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="clock" size={14} color={timeSlot === 'ASAP' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${timeSlot === 'ASAP' ? 'text-primary' : 'text-textSecondary'}`}>
                ASAP (25 mins)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTimeSlot('SCHEDULED')}
              className={`flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                timeSlot === 'SCHEDULED' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={14} color={timeSlot === 'SCHEDULED' ? '#FF6B35' : '#6B7280'} />
              <Text className={`font-extrabold text-xs ${timeSlot === 'SCHEDULED' ? 'text-primary' : 'text-textSecondary'}`}>
                Schedule Later
              </Text>
            </TouchableOpacity>
          </View>

          {timeSlot === 'SCHEDULED' && (
            <TextInput
              label="TARGET DELIVERY TIME *"
              placeholder="e.g. 12:30 PM, 7:00 PM"
              value={scheduledFor}
              onChangeText={(text) => {
                setScheduledFor(text);
                if (text.trim()) setScheduleError('');
              }}
              error={scheduleError}
            />
          )}

          <TextInput
            label="SPECIAL INSTRUCTIONS (Optional)"
            placeholder="e.g. Leave at gate, less spicy, allergy notes..."
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />
        </View>

        {/* Summary Card */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-3">ITEMS SUMMARY</Text>
          {cartItems.map((item) => (
            <View key={item.mealId} className="flex-row justify-between items-center mb-2">
              <Text className="text-textPrimary font-bold text-xs flex-1 mr-2" numberOfLines={1}>
                {item.name} <Text className="text-textSecondary font-semibold">x{item.quantity}</Text>
              </Text>
              <Text className="text-textPrimary font-black text-xs">LKR {item.price * item.quantity}</Text>
            </View>
          ))}
          
          <View className="border-t border-gray-100 pt-4 mt-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-textSecondary text-xs font-semibold">Subtotal</Text>
              <Text className="text-textSecondary text-xs font-extrabold">LKR {subtotal}</Text>
            </View>
            {promoDiscount > 0 && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-emerald-600 text-xs font-bold">Promo Discount</Text>
                <Text className="text-emerald-600 text-xs font-black">- LKR {promoDiscount}</Text>
              </View>
            )}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-textSecondary text-xs font-semibold">Delivery Fee</Text>
              <Text className="text-textSecondary text-xs font-extrabold">LKR {deliveryFee}</Text>
            </View>
            <View className="h-[1px] bg-gray-150/50 w-full my-2.5" />
            <View className="flex-row justify-between items-center">
              <Text className="text-textPrimary font-black text-sm">Total Amount</Text>
              <Text className="text-primary font-black text-base">LKR {total}</Text>
            </View>
          </View>
        </View>

        <Button
          title="CONTINUE TO PAYMENT"
          onPress={handleContinueToPayment}
          variant="primary"
          className="w-full mb-12"
        />
      </ScrollView>

      {/* Select Location Modal Map */}
      <Modal visible={showMapModal} transparent animationType="slide">
        <View className="flex-grow flex bg-black/60 justify-end h-full">
          <View className="bg-white rounded-t-[32px] w-full h-[80%] border-t border-gray-150 flex-col">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <View>
                <Text className="text-textPrimary font-black text-lg">Pick Delivery Location</Text>
                <Text className="text-textSecondary text-[10px] font-bold uppercase mt-0.5">TAP ON MAP TO SELECT DELIVERY PIN</Text>
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
                          const latVal = parseFloat(data.lat.toFixed(6));
                          const lonVal = parseFloat(data.lng.toFixed(6));
                          setLatitude(data.lat.toFixed(6));
                          setLongitude(data.lng.toFixed(6));
                          updateAddressFromCoords(latVal, lonVal);
                          setAddressError('');
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
                title="🎯 CONFIRM DELIVERY PIN"
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
