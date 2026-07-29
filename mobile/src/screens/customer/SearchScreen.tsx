import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

type SearchScreenNavigationProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState('10');
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Pass coordinates for Colombo as default
      const response = await api.get(
        `/api/meals?longitude=79.8612&latitude=6.9271&maxDistance=${parseFloat(maxDistance)}`
      );
      // Filter list locally based on query keywords
      const filtered = response.data.filter((meal: any) =>
        meal.name.toLowerCase().includes(query.toLowerCase()) ||
        meal.description.toLowerCase().includes(query.toLowerCase()) ||
        meal.cuisineType.toLowerCase().includes(query.toLowerCase())
      );
      setMeals(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      <Text className="text-textPrimary text-xl font-bold mb-4">Search Meals Near You</Text>
      
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <TextInput
          placeholder="What are you craving?"
          value={query}
          onChangeText={setQuery}
        />
        <TextInput
          label="MAX DISTANCE (KM)"
          placeholder="e.g. 5"
          value={maxDistance}
          onChangeText={setMaxDistance}
          keyboardType="numeric"
        />
        <Button
          title="FIND MEALS"
          onPress={handleSearch}
          variant="primary"
          className="w-full mt-2"
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : meals.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center mb-1">No matches found</Text>
          <Text className="text-textMuted text-xs text-center">Try widening your search distance or modifying queries.</Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
              className="mb-4"
            >
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-4 overflow-hidden">
                  {item.photos && item.photos.length > 0 ? (
                    <Image source={{ uri: item.photos[0] }} className="w-full h-full" />
                  ) : (
                    <Text className="text-primary text-lg">🍛</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-textPrimary font-bold text-sm leading-5 flex-1 mr-2" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-primary font-black text-sm">LKR {item.price}</Text>
                  </View>
                  <Text className="text-textMuted text-xs mb-2">By Cook: {item.cookName}</Text>
                  <View className="flex-row justify-between items-center">
                    <Badge label={item.category} variant="primary" />
                    <View className="flex-row items-center">
                      <Text className="text-accent text-xs mr-1">⭐</Text>
                      <Text className="text-textPrimary text-xs font-bold">
                        {item.avgRating > 0 ? item.avgRating.toFixed(1) : 'New'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
};
