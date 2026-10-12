import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { MealCard } from '../../components/customer/MealCard';
import { Feather, Ionicons } from '@expo/vector-icons';
import { KitchenDiscoveryMap } from '../../components/customer/KitchenDiscoveryMap';

type SearchScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

const POPULAR_CRAVES = [
  { label: 'Biryani', query: 'Biryani' },
  { label: 'Kottu', query: 'Kottu' },
  { label: 'Hoppers', query: 'Hoppers' },
  { label: 'Pastries', query: 'Pastry' },
  { label: 'Desserts', query: 'Dessert' },
  { label: 'Spicy', query: 'Spicy' },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [allMeals, setAllMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');

  const fetchMeals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/meals');
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []);
      setAllMeals(list);
    } catch (error) {
      console.warn('Search fetch error:', error);
      setAllMeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMeals();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCraveTagSelect = (tagQuery: string) => {
    if (query.toLowerCase() === tagQuery.toLowerCase()) {
      setQuery('');
    } else {
      setQuery(tagQuery);
    }
  };

  // Instant local filtering based on keywords
  const filteredMeals = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return allMeals;

    return allMeals.filter((meal: any) => {
      const name = (meal.name || '').toLowerCase();
      const desc = (meal.description || '').toLowerCase();
      const cuisine = (meal.cuisineType || '').toLowerCase();
      const cat = (meal.category || '').toLowerCase();
      const cook = (meal.cookName || '').toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        cuisine.includes(q) ||
        cat.includes(q) ||
        cook.includes(q)
      );
    });
  }, [allMeals, query]);

  const uniqueCooks = useMemo(() => {
    const cooksMap = new Map();
    filteredMeals.forEach((meal) => {
      if (meal.cookId && !cooksMap.has(meal.cookId)) {
        const hasCoords =
          meal.cookLatitude !== undefined &&
          meal.cookLatitude !== null &&
          meal.cookLatitude !== 0 &&
          meal.cookLongitude !== undefined &&
          meal.cookLongitude !== null &&
          meal.cookLongitude !== 0;

        cooksMap.set(meal.cookId, {
          id: meal.cookId,
          kitchenName: (meal.cookName || 'Local Chef') + "'s Kitchen",
          cuisine: meal.cuisineType || 'Home-style Chef',
          rating: meal.avgRating || 4.8,
          lat: hasCoords ? meal.cookLatitude : 6.9271 + (Math.random() - 0.5) * 0.03,
          lng: hasCoords ? meal.cookLongitude : 79.8612 + (Math.random() - 0.5) * 0.03,
        });
      }
    });
    return Array.from(cooksMap.values());
  }, [filteredMeals]);

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Sticky Header search panel */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100 shadow-sm z-10">
        <Text className="font-black text-xl text-textPrimary">Craving Search</Text>
        <Text className="text-textSecondary text-[10px] mt-0.5 font-bold uppercase tracking-wider">
          Find dishes, home chefs, kitchens
        </Text>

        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200 mt-3">
          <Feather name="search" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="What are you craving?"
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-xs text-textPrimary p-0"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* View Mode Switcher tabs */}
        <View className="flex-row mt-3 bg-gray-100 p-1 rounded-xl">
          <TouchableOpacity
            key="btn-tab-list"
            onPress={() => setViewMode('LIST')}
            style={{
              backgroundColor: viewMode === 'LIST' ? '#FFFFFF' : 'transparent',
            }}
            className="flex-1 py-1.5 rounded-lg items-center shadow-xs"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Feather name="list" size={13} color={viewMode === 'LIST' ? '#FF6B35' : '#6B7280'} />
              <Text
                style={{
                  color: viewMode === 'LIST' ? '#1A1A2E' : '#6B7280',
                  fontWeight: viewMode === 'LIST' ? '900' : '700',
                }}
                className="text-[10px]"
              >
                List View
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            key="btn-tab-map"
            onPress={() => setViewMode('MAP')}
            style={{
              backgroundColor: viewMode === 'MAP' ? '#FFFFFF' : 'transparent',
            }}
            className="flex-1 py-1.5 rounded-lg items-center shadow-xs"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Feather name="map" size={13} color={viewMode === 'MAP' ? '#FF6B35' : '#6B7280'} />
              <Text
                style={{
                  color: viewMode === 'MAP' ? '#1A1A2E' : '#6B7280',
                  fontWeight: viewMode === 'MAP' ? '900' : '700',
                }}
                className="text-[10px]"
              >
                Discovery Map
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'MAP' ? (
        <View key="view-map" className="flex-1 p-6">
          <View className="bg-white rounded-3xl overflow-hidden flex-1 border border-gray-200 shadow-sm">
            <KitchenDiscoveryMap
              cooks={uniqueCooks}
              onSelectCook={(_cookId, name) => {
                const cleanName = name.replace("'s Kitchen", '');
                setQuery(cleanName);
                setViewMode('LIST');
              }}
            />
          </View>
        </View>
      ) : (
        <ScrollView key="view-list" className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6">
            {/* Crave Suggestions Grid */}
            <View className="mb-6">
              <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3">
                Popular Cravings
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {POPULAR_CRAVES.map((crave) => {
                  const isActive = query.toLowerCase() === crave.query.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={`crave-tag-${crave.query}`}
                      onPress={() => handleCraveTagSelect(crave.query)}
                      style={{
                        backgroundColor: isActive ? '#FF6B35' : '#FFFFFF',
                        borderColor: isActive ? '#FF6B35' : '#E5E7EB',
                      }}
                      className="border rounded-2xl px-4 py-2.5 shadow-sm"
                      activeOpacity={0.75}
                    >
                      <Text
                        style={{ color: isActive ? '#FFFFFF' : '#1A1A2E' }}
                        className="font-extrabold text-xs"
                      >
                        {crave.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Search Listings Feed */}
            <Text className="text-textPrimary font-black text-sm uppercase tracking-wider mb-4">
              {filteredMeals.length === 0 ? 'Results' : `Neighboring Dishes (${filteredMeals.length})`}
            </Text>

            {loading ? (
              <View className="py-16 justify-center items-center">
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text className="text-textSecondary text-xs font-semibold mt-2">Searching nearby kitchens...</Text>
              </View>
            ) : filteredMeals.length === 0 ? (
              <View className="bg-white border border-gray-100 rounded-3xl p-8 items-center shadow-sm">
                <Feather name="inbox" size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
                <Text className="text-textPrimary font-bold text-sm mb-1 text-center">
                  No dishes found near you
                </Text>
                <Text className="text-textSecondary text-xs text-center leading-relaxed">
                  Try searching for different craving keywords.
                </Text>
              </View>
            ) : (
              filteredMeals.map((meal) => (
                <MealCard
                  key={`meal-card-${meal.id}`}
                  id={meal.id}
                  name={meal.name}
                  price={meal.price}
                  category={meal.category}
                  cookName={meal.cookName}
                  avgRating={meal.avgRating}
                  portionsRemaining={meal.portionsRemaining}
                  photos={meal.photos}
                  layout="full"
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
