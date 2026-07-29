import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api';

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cuisineType, setCuisineType] = useState('Sri Lankan');
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState('');
  const [portionLimit, setPortionLimit] = useState('10');
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [servingTime, setServingTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name || !description || !price || !portionLimit) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        photos: [], // Fallback image used in rendering
        price: parseFloat(price),
        category: 'LUNCH', // default Category as Lunch
        cuisineType,
        ingredients: ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        allergenTags: allergens.split(',').map((s) => s.trim()).filter(Boolean),
        portionLimit: parseInt(portionLimit),
        availability: {
          days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          cutoffTime,
          servingTime,
        },
      };

      await api.post('/api/meals', payload);
      Alert.alert('Meal Published!', 'Your listing has been successfully published to nearby customers.', [
        {
          text: 'OK',
          onPress: () => {
            setName('');
            setDescription('');
            setPrice('');
            setIngredients('');
            setAllergens('');
            setPortionLimit('10');
            navigation.navigate('Dashboard');
          },
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create listing. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface-elevated p-6">
      <Text className="text-textPrimary font-bold text-xl mb-6">List a New Meal</Text>

      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <TextInput
          label="MEAL NAME (Required)"
          placeholder="e.g. Traditional Rice & Curry"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          label="DESCRIPTION (Required)"
          placeholder="Describe taste, components, side dishes..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
        <TextInput
          label="PRICE (LKR) (Required)"
          placeholder="e.g. 450"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <TextInput
          label="CUISINE TYPE"
          placeholder="e.g. Indian, Chinese, Sri Lankan"
          value={cuisineType}
          onChangeText={setCuisineType}
        />
      </View>

      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <TextInput
          label="INGREDIENTS (comma separated)"
          placeholder="e.g. Basmati Rice, Chicken, Coconut milk"
          value={ingredients}
          onChangeText={setIngredients}
        />
        <TextInput
          label="ALLERGENS (comma separated)"
          placeholder="e.g. nuts, dairy, gluten"
          value={allergens}
          onChangeText={setAllergens}
        />
        <TextInput
          label="PORTION BATCH LIMIT"
          placeholder="e.g. 10"
          value={portionLimit}
          onChangeText={setPortionLimit}
          keyboardType="numeric"
        />
      </View>

      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-4">AVAILABILITY & CUTOFF TIMES</Text>
        <TextInput
          label="PRE-ORDER CUTOFF TIME"
          placeholder="09:00"
          value={cutoffTime}
          onChangeText={setCutoffTime}
        />
        <TextInput
          label="SERVING TIME"
          placeholder="12:00"
          value={servingTime}
          onChangeText={setServingTime}
        />
      </View>

      <Button
        title="PUBLISH MEAL"
        onPress={handleCreate}
        loading={submitting}
        variant="secondary"
        className="w-full mb-12"
      />
    </ScrollView>
  );
};
