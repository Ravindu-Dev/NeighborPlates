import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { FilterChip } from '../../components/common/FilterChip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Toast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { requestGalleryPermission, pickImageFromGallery, uploadImageToImgBB } from '../../services/imageService';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const CATEGORY_ICONS: Record<string, string> = {
  BREAKFAST: '🥞',
  LUNCH: '🍛',
  DINNER: '🍲',
  SNACK: '🍿',
};

const SAMPLE_PHOTOS = [
  { name: 'Rice & Curry', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600' },
  { name: 'Kottu Roti', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600' },
  { name: 'Biryani / Rice', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600' },
  { name: 'Pasta & Noodles', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281293?w=600' },
  { name: 'Burger & Snacks', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' },
  { name: 'Pancakes', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600' },
  { name: 'Fresh Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mealToEdit = route.params?.mealToEdit;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cuisineType, setCuisineType] = useState('Sri Lankan');
  const [category, setCategory] = useState('LUNCH');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [allergens, setAllergens] = useState('');
  const [portionLimit, setPortionLimit] = useState('10');
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [servingTime, setServingTime] = useState('12:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [uploading, setUploading] = useState(false);

  const handlePickFromGallery = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const localUri = await pickImageFromGallery();
      if (!localUri) return; // User cancelled

      // Show local preview immediately while uploading
      setImageUrl(localUri);
      setUploading(true);

      const cdnUrl = await uploadImageToImgBB(localUri);
      setImageUrl(cdnUrl);
      setToast({ visible: true, message: '📸 Image uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Image upload error:', error);
      setImageUrl(''); // Clear the local preview on failure
      setToast({
        visible: true,
        message: error.message || 'Failed to upload image. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (mealToEdit) {
      setName(mealToEdit.name || '');
      setDescription(mealToEdit.description || '');
      setPrice(mealToEdit.price ? mealToEdit.price.toString() : '');
      setCuisineType(mealToEdit.cuisineType || 'Sri Lankan');
      setCategory(mealToEdit.category || 'LUNCH');
      setImageUrl(mealToEdit.photos?.[0] || '');
      setIngredients(mealToEdit.ingredients?.join(', ') || '');
      setAllergens(mealToEdit.allergenTags?.join(', ') || '');
      setPortionLimit(mealToEdit.portionLimit ? mealToEdit.portionLimit.toString() : '10');
      if (mealToEdit.availability) {
        setCutoffTime(mealToEdit.availability.cutoffTime || '09:00');
        setServingTime(mealToEdit.availability.servingTime || '12:00');
        setSelectedDays(mealToEdit.availability.days || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
      }
    } else {
      // Clear form if coming back to add new meal
      clearFormAction();
    }
  }, [mealToEdit]);

  const MAX_DESC_LENGTH = 250;

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Meal name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Enter a valid price';
    if (!portionLimit || parseInt(portionLimit) <= 0) newErrors.portionLimit = 'Enter a valid portion limit';
    if (selectedDays.length === 0) newErrors.days = 'Select at least one available day';
    if (!cutoffTime.trim()) newErrors.cutoffTime = 'Cutoff time is required';
    if (!servingTime.trim()) newErrors.servingTime = 'Serving time is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFormAction = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCuisineType('Sri Lankan');
    setCategory('LUNCH');
    setImageUrl('');
    setIngredients('');
    setAllergens('');
    setPortionLimit('10');
    setCutoffTime('09:00');
    setServingTime('12:00');
    setSelectedDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setErrors({});
  };

  const clearForm = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to reset all fields?')) {
        clearFormAction();
      }
    } else {
      Alert.alert('Clear Form', 'Are you sure you want to reset all fields?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearFormAction,
        },
      ]);
    }
  };

  const handleCreate = async () => {
    if (!validate()) {
      setToast({ visible: true, message: 'Please fix the errors below.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        photos: imageUrl.trim() ? [imageUrl.trim()] : [],
        price: parseFloat(price),
        category,
        cuisineType,
        ingredients: ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        allergenTags: allergens.split(',').map((s) => s.trim()).filter(Boolean),
        portionLimit: parseInt(portionLimit),
        availability: {
          days: selectedDays,
          cutoffTime,
          servingTime,
        },
      };

      if (mealToEdit) {
        await api.put(`/api/meals/${mealToEdit.id}`, payload);
        setToast({ visible: true, message: '🎉 Meal updated successfully!', type: 'success' });
      } else {
        await api.post('/api/meals', payload);
        setToast({ visible: true, message: '🎉 Meal published successfully!', type: 'success' });
      }

      // Reset form after short delay
      setTimeout(() => {
        clearFormAction();
        navigation.navigate('Dashboard');
      }, 1500);
    } catch (error: any) {
      console.error(error);
      setToast({
        visible: true,
        message: error.response?.data?.message || 'Failed to publish meal. Try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-14 pb-6">
          {/* ─── Screen Header ─── */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
                CREATE LISTING
              </Text>
              <Text className="text-textPrimary font-extrabold text-xl mt-0.5">
                {mealToEdit ? 'Edit Meal 📝' : 'List a New Meal 📝'}
              </Text>
            </View>
            {!mealToEdit && (
              <TouchableOpacity onPress={clearForm} activeOpacity={0.7}>
                <Text className="text-red-400 font-semibold text-xs">CLEAR ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── Meal Image Section ─── */}
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
            <SectionHeader title="Meal Image" icon="📸" />

            {/* Live Preview Box */}
            <View className="w-full h-44 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden items-center justify-center mb-4 relative">
              {imageUrl.trim() ? (
                <>
                  <Image source={{ uri: imageUrl.trim() }} className="w-full h-full" resizeMode="cover" />
                  {/* Uploading overlay */}
                  {uploading && (
                    <View className="absolute inset-0 bg-black/40 items-center justify-center rounded-2xl">
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text className="text-white font-bold text-xs mt-2">Uploading...</Text>
                    </View>
                  )}
                  {/* Clear image button */}
                  {!uploading && (
                    <TouchableOpacity
                      onPress={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-black/50 rounded-full w-7 h-7 items-center justify-center"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View className="items-center p-4">
                  <Text className="text-4xl mb-1">🖼️</Text>
                  <Text className="text-textSecondary font-semibold text-xs text-center">
                    No image selected
                  </Text>
                  <Text className="text-textMuted text-[10px] text-center mt-0.5">
                    Upload from gallery, paste a URL, or pick a template
                  </Text>
                </View>
              )}
            </View>

            {/* Upload from Gallery Button */}
            <TouchableOpacity
              onPress={handlePickFromGallery}
              disabled={uploading}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center py-3.5 rounded-2xl border mb-4 ${
                uploading
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-primary/10 border-primary/30'
              }`}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FF6B35" className="mr-2" />
              ) : (
                <Ionicons name="images-outline" size={18} color="#FF6B35" style={{ marginRight: 8 }} />
              )}
              <Text className={`font-bold text-sm ${
                uploading ? 'text-textMuted' : 'text-primary'
              }`}>
                {uploading ? 'Uploading...' : '📷  Upload from Gallery'}
              </Text>
            </TouchableOpacity>

            {/* Custom URL Input */}
            <TextInput
              label="OR PASTE IMAGE URL"
              placeholder="https://example.com/photo.jpg"
              value={imageUrl}
              onChangeText={setImageUrl}
              helperText="Direct image link or paste photo URL"
            />

            {/* Sample Photo Preset Gallery */}
            <Text className="text-textPrimary font-semibold text-xs mb-2 ml-1">OR CHOOSE QUICK TEMPLATE PHOTO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {SAMPLE_PHOTOS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setImageUrl(sample.url)}
                  activeOpacity={0.8}
                  className={`mx-1 p-1.5 rounded-2xl border items-center w-24 ${
                    imageUrl === sample.url ? 'border-secondary bg-secondary/10' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Image source={{ uri: sample.url }} className="w-20 h-14 rounded-xl mb-1" />
                  <Text className="text-[10px] font-bold text-textPrimary text-center" numberOfLines={1}>
                    {sample.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ─── Section 1: Meal Details ─── */}
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
            <SectionHeader title="Meal Details" icon="📋" />

            <TextInput
              label="MEAL NAME"
              placeholder="e.g. Traditional Rice & Curry"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
            />
            <View>
              <TextInput
                label="DESCRIPTION"
                placeholder="Describe taste, components, side dishes..."
                value={description}
                onChangeText={(text) => {
                  if (text.length <= MAX_DESC_LENGTH) {
                    setDescription(text);
                    if (errors.description) setErrors({ ...errors, description: '' });
                  }
                }}
                multiline
                numberOfLines={3}
                error={errors.description}
              />
              <Text className="text-textMuted text-[10px] text-right -mt-2 mb-2">
                {description.length}/{MAX_DESC_LENGTH}
              </Text>
            </View>
            <TextInput
              label="PRICE (LKR)"
              placeholder="e.g. 450"
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (errors.price) setErrors({ ...errors, price: '' });
              }}
              keyboardType="numeric"
              error={errors.price}
            />
            <TextInput
              label="CUISINE TYPE"
              placeholder="e.g. Indian, Chinese, Sri Lankan"
              value={cuisineType}
              onChangeText={setCuisineType}
            />

            {/* Category Picker */}
            <Text className="text-textPrimary font-semibold text-xs mb-2 ml-1">CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                  className={`flex-row items-center px-4 py-2.5 rounded-full mr-2 border
                    ${category === cat
                      ? 'bg-secondary border-secondary'
                      : 'bg-white border-gray-200'
                    }
                  `}
                >
                  <Text className="mr-1.5">{CATEGORY_ICONS[cat]}</Text>
                  <Text
                    className={`text-xs font-bold
                      ${category === cat ? 'text-white' : 'text-textSecondary'}
                    `}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ─── Section 2: Ingredients & Allergens ─── */}
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
            <SectionHeader title="Ingredients & Allergens" icon="🥗" />

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
              helperText="Help customers with dietary restrictions"
            />
            <TextInput
              label="PORTION BATCH LIMIT"
              placeholder="e.g. 10"
              value={portionLimit}
              onChangeText={(text) => {
                setPortionLimit(text);
                if (errors.portionLimit) setErrors({ ...errors, portionLimit: '' });
              }}
              keyboardType="numeric"
              error={errors.portionLimit}
              helperText="Maximum portions you can prepare per day"
            />
          </View>

          {/* ─── Section 3: Availability & Schedule ─── */}
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
            <SectionHeader title="Availability & Schedule" icon="⏰" />

            {/* Day Selector */}
            <Text className="text-textPrimary font-semibold text-xs mb-2 ml-1">AVAILABLE DAYS</Text>
            <View className="flex-row flex-wrap mb-3">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.8}
                    className={`w-11 h-11 rounded-full items-center justify-center mr-1.5 mb-1.5 border
                      ${isSelected
                        ? 'bg-secondary border-secondary'
                        : 'bg-white border-gray-200'
                      }
                    `}
                  >
                    <Text
                      className={`text-[10px] font-bold
                        ${isSelected ? 'text-white' : 'text-textSecondary'}
                      `}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.days ? (
              <Text className="text-red-500 text-xs mb-2 ml-1 font-medium">{errors.days}</Text>
            ) : null}

            <TextInput
              label="PRE-ORDER CUTOFF TIME"
              placeholder="e.g. 09:00"
              value={cutoffTime}
              onChangeText={(text) => {
                setCutoffTime(text);
                if (errors.cutoffTime) setErrors({ ...errors, cutoffTime: '' });
              }}
              error={errors.cutoffTime}
              helperText="Customers must order before this time"
            />
            <TextInput
              label="SERVING TIME"
              placeholder="e.g. 12:00"
              value={servingTime}
              onChangeText={(text) => {
                setServingTime(text);
                if (errors.servingTime) setErrors({ ...errors, servingTime: '' });
              }}
              error={errors.servingTime}
              helperText="When the meal will be ready for pickup/delivery"
            />
          </View>

          {/* ─── Action Buttons ─── */}
          <Button
            title={mealToEdit ? "🍽️  UPDATE MEAL" : "🍽️  PUBLISH MEAL"}
            onPress={handleCreate}
            loading={submitting}
            variant="secondary"
            size="lg"
            className="w-full mb-4"
          />

          {/* Bottom spacer */}
          <View className="h-8" />
        </View>
      </ScrollView>
    </View>
  );
};
