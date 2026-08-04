import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { MealCard } from '../../components/customer/MealCard';
import { Feather, Ionicons } from '@expo/vector-icons';

type SearchScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState('10');
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const distanceOptions = [
    { label: '3 KM', value: '3' },
    { label: '5 KM', value: '5' },
    { label: '10 KM', value: '10' },
    { label: '20 KM', value: '20' },
  ];

  const popularCraves = [
    { label: 'Biryani 🍛', query: 'Biryani' },
    { label: 'Kottu 🍜', query: 'Kottu' },
    { label: 'Hoppers 🥞', query: 'Hoppers' },
    { label: 'Pastries 🥐', query: 'Pastry' },
    { label: 'Desserts 🍨', query: 'Dessert' },
    { label: 'Spicy 🔥', query: 'Spicy' },
  ];

  const fetchSearchResults = async (searchVal: string, distVal: string) => {
    setLoading(true);
    try {
      // Pass coordinates for Colombo as default
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
      </View>

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
    </View>
  );
};
