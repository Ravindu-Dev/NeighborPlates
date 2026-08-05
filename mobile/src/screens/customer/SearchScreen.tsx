import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView, TextInput, Platform, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { MealCard } from '../../components/customer/MealCard';
import { Feather, Ionicons } from '@expo/vector-icons';
import { KitchenDiscoveryMap } from '../../components/customer/KitchenDiscoveryMap';

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

type SearchScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState('5000');
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');



  const distanceOptions = [
    { label: '5 KM', value: '5' },
    { label: '15 KM', value: '15' },
    { label: '50 KM', value: '50' },
    { label: 'Anywhere', value: '5000' },
  ];

  const popularCraves = [
    { label: 'Biryani 🍛', query: 'Biryani' },
    { label: 'Kottu 🍜', query: 'Kottu' },
    { label: 'Hoppers 🥞', query: 'Hoppers' },
    { label: 'Pastries 🥐', query: 'Pastry' },
    { label: 'Desserts 🍨', query: 'Dessert' },
    { label: 'Spicy 🔥', query: 'Spicy' },
  ];

  const getUniqueCooksLocations = (mealsList: any[]) => {
    const cooksMap = new Map();
    mealsList.forEach(meal => {
      if (meal.cookId && !cooksMap.has(meal.cookId)) {
        // Scatter fallback coordinates for demo if coordinates are empty/zero
        const hasCoords = meal.cookLatitude !== undefined && meal.cookLatitude !== null && meal.cookLatitude !== 0 && 
                          meal.cookLongitude !== undefined && meal.cookLongitude !== null && meal.cookLongitude !== 0;
        cooksMap.set(meal.cookId, {
          id: meal.cookId,
          kitchenName: meal.cookName + "'s Kitchen",
          cuisine: meal.cuisineType || 'Home-style Chef',
          rating: meal.avgRating || 4.8,
          lat: hasCoords ? meal.cookLatitude : (6.9271 + (Math.random() - 0.5) * 0.03),
          lng: hasCoords ? meal.cookLongitude : (79.8612 + (Math.random() - 0.5) * 0.03)
        });
      }
    });
    return Array.from(cooksMap.values());
  };

  const fetchSearchResults = async (searchVal: string, distVal: string) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/api/meals?longitude=79.8612&latitude=6.9271&maxDistance=${parseFloat(distVal)}`
      );
      // Filter list locally based on query keywords
      const filtered = response.data.filter((meal: any) =>
        (meal.name || '').toLowerCase().includes(searchVal.toLowerCase()) ||
        (meal.description || '').toLowerCase().includes(searchVal.toLowerCase()) ||
        (meal.cuisineType || '').toLowerCase().includes(searchVal.toLowerCase()) ||
        (meal.category || '').toLowerCase().includes(searchVal.toLowerCase())
      );
      setMeals(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchSearchResults(query, maxDistance);
  };

  const handleDistanceSelect = (value: string) => {
    setMaxDistance(value);
    fetchSearchResults(query, value);
  };

  const handleCraveTagSelect = (tagQuery: string) => {
    setQuery(tagQuery);
    fetchSearchResults(tagQuery, maxDistance);
  };

  useEffect(() => {
    fetchSearchResults(query, maxDistance);
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSearchResults(query, maxDistance);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Sticky Header search panel */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10">
        <Text className="font-black text-xl text-textPrimary">Craving Search</Text>
        <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider">
          Find dishes, home chefs, kitchens
        </Text>

        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200 shadow-inner mt-3">
          <Feather name="search" size={16} color="#6B7280" className="mr-2" />
          <TextInput
            placeholder="What are you craving?"
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-xs text-textPrimary p-0"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); fetchSearchResults('', maxDistance); }}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* View Mode Switcher tabs */}
        <View className="flex-row mt-3 bg-gray-100 p-1 rounded-xl">
          <TouchableOpacity 
            onPress={() => setViewMode('LIST')} 
            className={`flex-1 py-1.5 rounded-lg items-center ${viewMode === 'LIST' ? 'bg-white shadow-sm' : ''}`}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center gap-1.5">
              <Feather name="list" size={13} color={viewMode === 'LIST' ? '#FF6B35' : '#6B7280'} />
              <Text className={`text-[10px] font-bold ${viewMode === 'LIST' ? 'text-textPrimary font-black' : 'text-textSecondary font-bold'}`}>List View</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('MAP')} 
            className={`flex-1 py-1.5 rounded-lg items-center ${viewMode === 'MAP' ? 'bg-white shadow-sm' : ''}`}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center gap-1.5">
              <Feather name="map" size={13} color={viewMode === 'MAP' ? '#FF6B35' : '#6B7280'} />
              <Text className={`text-[10px] font-bold ${viewMode === 'MAP' ? 'text-textPrimary font-black' : 'text-textSecondary font-bold'}`}>Discovery Map</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'MAP' ? (
        <View className="flex-1 p-6">
          <View className="bg-white rounded-3xl overflow-hidden flex-1 border border-gray-150 shadow-sm">
            <KitchenDiscoveryMap 
              cooks={getUniqueCooksLocations(meals)} 
              onSelectCook={(cookId, name) => {
                const cleanName = name.replace("'s Kitchen", "");
                setQuery(cleanName);
                setViewMode('LIST');
                fetchSearchResults(cleanName, maxDistance);
              }}
            />
          </View>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6">
          {/* Visual Distance Filters */}
          <View className="mb-6">
            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3">
              Delivery Radius limit
            </Text>
            <View className="flex-row gap-2">
              {distanceOptions.map((opt) => {
                const isSelected = maxDistance === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleDistanceSelect(opt.value)}
                    className={`px-4 py-2.5 rounded-full border shadow-sm items-center justify-center flex-1 ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-200'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className={`text-[10px] font-extrabold ${isSelected ? 'text-white' : 'text-textSecondary'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Crave Suggestions Grid - only show when queries are empty or list is small */}
          {query.length === 0 && (
            <View className="mb-6">
              <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3.5">
                Popular Cravings
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {popularCraves.map((crave) => (
                  <TouchableOpacity
                    key={crave.query}
                    onPress={() => handleCraveTagSelect(crave.query)}
                    className="bg-white border border-gray-150 rounded-2xl px-4 py-2.5 shadow-sm"
                    activeOpacity={0.75}
                  >
                    <Text className="text-textPrimary font-extrabold text-xs">{crave.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search Listings Feed */}
          <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">
            {meals.length === 0 ? "Results" : `Neighboring Dishes (${meals.length})`}
          </Text>

          {loading ? (
            <View className="py-16 justify-center items-center">
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : meals.length === 0 ? (
            <View className="bg-white border border-gray-100 rounded-3xl p-8 items-center shadow-sm">
              <Text className="text-5xl mb-4">🍲</Text>
              <Text className="text-textPrimary font-bold text-sm mb-1 text-center">No dishes found near you</Text>
              <Text className="text-textSecondary text-xs text-center leading-relaxed">
                Try widening your delivery radius or search for different craving keywords.
              </Text>
            </View>
          ) : (
            meals.map((meal) => (
              <MealCard
                key={meal.id}
                id={meal.id}
                name={meal.name}
                price={meal.price}
                category={meal.category}
                cookName={meal.cookName}
                avgRating={meal.avgRating}
                portionsRemaining={meal.portionsRemaining}
                photos={meal.photos}
                onPress={() => navigation.navigate('MealDetail', { mealId: meal.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
      )}
    </View>
  );
};
