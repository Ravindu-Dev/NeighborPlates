import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { FilterChip } from '../../components/common/FilterChip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Toast } from '../../components/common/Toast';
import { api } from '../../services/api';
import {
  requestGalleryPermission,
  pickImageFromGallery,
  uploadImageToImgBB,
  validateImageSize,
} from '../../services/imageService';
import { DIETARY_OPTIONS } from '../../constants/filterConstants';
import { Ionicons, Feather } from '@expo/vector-icons';

const CATEGORIES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const AddMealFormScreen: React.FC = () => {
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
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [portionLimit, setPortionLimit] = useState('10');
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [servingTime, setServingTime] = useState('12:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (mealToEdit) {
      // Set initial values from route params
      const populateFields = (m: any) => {
        setName(m.name || '');
        setDescription(m.description || '');
        setPrice(m.price ? m.price.toString() : '');
        setCuisineType(m.cuisineType || 'Sri Lankan');
        setCategory(m.category || 'LUNCH');
        setImageUrl(m.photos?.[0] || '');
        setIngredients(m.ingredients?.join(', ') || '');
        setAllergens(m.allergenTags?.join(', ') || '');
        setDietaryPreferences(m.dietaryPreferences || []);
        setPortionLimit(m.portionLimit ? m.portionLimit.toString() : '10');
        if (m.availability) {
          setCutoffTime(m.availability.cutoffTime || '09:00');
          setServingTime(m.availability.servingTime || '12:00');
          setSelectedDays(m.availability.days || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
        }
      };

      populateFields(mealToEdit);

      // Also fetch fresh copy from backend API to guarantee DB sync
      if (mealToEdit.id) {
        api.get(`/api/meals/${mealToEdit.id}`)
          .then((res) => {
            if (res.data) {
              populateFields(res.data);
            }
          })
          .catch((err) => {
            console.log('Error fetching fresh meal details:', err);
          });
      }
    }
  }, [mealToEdit]);

  const handlePickFromGallery = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return;

      await validateImageSize(asset);

      setImageUrl(asset.uri);
      setUploading(true);

      const cdnUrl = await uploadImageToImgBB(asset.uri);
      setImageUrl(cdnUrl);
      setToast({ visible: true, message: '📸 Image uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Image upload error:', error);
      setImageUrl('');
      setToast({
        visible: true,
        message: error.message || 'Failed to upload image. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

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
    if (!portionLimit || parseInt(portionLimit, 10) <= 0) newErrors.portionLimit = 'Enter a valid portion limit';
    if (selectedDays.length === 0) newErrors.days = 'Select at least one available day';
    if (!cutoffTime.trim()) newErrors.cutoffTime = 'Cutoff time is required';
    if (!servingTime.trim()) newErrors.servingTime = 'Serving time is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) {
      setToast({ visible: true, message: 'Please fix the errors below.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name,
        description,
        price: parseFloat(price),
        category,
        cuisineType,
        photos: imageUrl.trim() ? [imageUrl.trim()] : [],
        ingredients: ingredients
          ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        allergenTags: allergens
          ? allergens.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        dietaryPreferences,
        portionLimit: parseInt(portionLimit, 10),
        availability: {
          days: selectedDays,
          cutoffTime,
          servingTime,
        },
        active: true,
      };

      if (mealToEdit) {
        await api.put(`/api/meals/${mealToEdit.id}`, payload);
      } else {
        await api.post('/api/meals', payload);
      }

      // Return to meals list
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to save meal listing. Please try again.';
      setToast({ visible: true, message: msg, type: 'error' });
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

      {/* ─── Screen Header with Back Button ─── */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
            {mealToEdit ? 'EDIT LISTING' : 'NEW LISTING'}
          </Text>
          <Text className="text-textPrimary font-extrabold text-lg">
            {mealToEdit ? 'Edit Meal 📝' : 'Add New Meal 🍽️'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setName('');
            setDescription('');
            setPrice('');
            setImageUrl('');
            setIngredients('');
            setAllergens('');
            setDietaryPreferences([]);
            setPortionLimit('10');
          }}
          activeOpacity={0.7}
        >
          <Text className="text-red-400 font-semibold text-xs">RESET</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {/* ─── Meal Image Section ─── */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <SectionHeader title="Meal Photo" icon="📸" />

          {/* Live Preview Box */}
          <View className="w-full h-44 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden items-center justify-center mb-4 relative">
            {imageUrl.trim() ? (
              <>
                <Image source={{ uri: imageUrl.trim() }} className="w-full h-full" resizeMode="cover" />
                {uploading && (
                  <View className="absolute inset-0 bg-black/40 items-center justify-center rounded-2xl">
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text className="text-white font-bold text-xs mt-2">Uploading...</Text>
                  </View>
                )}
                {!uploading && (
                  <TouchableOpacity
                    onPress={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full"
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View className="items-center justify-center">
                {uploading ? (
                  <>
                    <ActivityIndicator size="large" color="#2D6A4F" />
                    <Text className="text-textSecondary text-xs mt-2 font-semibold">Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-4xl mb-1">🍲</Text>
                    <Text className="text-textMuted text-xs font-semibold">No Image Selected</Text>
                  </>
                )}
              </View>
            )}
          </View>

          <Button
            title={uploading ? "Uploading..." : "📁  Pick from Gallery"}
            onPress={handlePickFromGallery}
            loading={uploading}
            variant="secondary"
            size="md"
            className="w-full"
          />
        </View>

        {/* ─── Basic Details Section ─── */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <SectionHeader title="Basic Details" icon="📝" />

          <TextInput
            label="MEAL NAME *"
            placeholder="e.g. Grandma's Chicken Curry"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
          />

          <View className="mb-4">
            <TextInput
              label="DESCRIPTION *"
              placeholder="Describe flavors, cooking method, freshness..."
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
            <View className="flex-row justify-end mt-1">
              <Text className={`text-[10px] font-bold ${
                description.length >= MAX_DESC_LENGTH ? 'text-red-500' : 'text-textMuted'
              }`}>
                {description.length}/{MAX_DESC_LENGTH} characters
              </Text>
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1">
              <TextInput
                label="PRICE (LKR) *"
                placeholder="e.g. 750"
                value={price}
                onChangeText={(text) => {
                  setPrice(text);
                  if (errors.price) setErrors({ ...errors, price: '' });
                }}
                keyboardType="numeric"
                error={errors.price}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="CUISINE TYPE"
                placeholder="e.g. Sri Lankan"
                value={cuisineType}
                onChangeText={setCuisineType}
              />
            </View>
          </View>

          {/* Category Selector */}
          <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-2 mt-2">
            CATEGORY *
          </Text>
          <View className="flex-row flex-wrap mb-2">
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                className="mr-2 mb-2"
              />
            ))}
          </View>
        </View>

        {/* ─── Ingredients & Allergens ─── */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <SectionHeader title="Ingredients & Allergens" icon="🧪" />

          <TextInput
            label="INGREDIENTS (COMMA SEPARATED)"
            placeholder="e.g. Coconut Milk, Chicken, Cardamom"
            value={ingredients}
            onChangeText={setIngredients}
            helperText="Separate each ingredient with a comma"
          />

          <TextInput
            label="ALLERGEN TAGS"
            placeholder="e.g. Dairy, Nuts, Gluten"
            value={allergens}
            onChangeText={setAllergens}
            helperText="Let customers know about potential allergens"
          />

          {/* Dietary Preferences Chip Group */}
          <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-2 mt-4">
            DIETARY PREFERENCES
          </Text>
          <Text className="text-textMuted text-[10px] mb-2 font-medium">
            Select all that apply to help customers filter your meal
          </Text>
          <View className="flex-row flex-wrap">
            {DIETARY_OPTIONS.map((pref) => {
              const selected = dietaryPreferences.includes(pref);
              return (
                <FilterChip
                  key={pref}
                  label={pref}
                  selected={selected}
                  onPress={() => {
                    setDietaryPreferences((prev) =>
                      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
                    );
                  }}
                  className="mr-2 mb-2"
                />
              );
            })}
          </View>
        </View>

        {/* ─── Portions & Capacity ─── */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <SectionHeader title="Portions & Capacity" icon="📦" />

          <TextInput
            label="PORTION LIMIT (MAX ORDERS PER DAY) *"
            placeholder="e.g. 10"
            value={portionLimit}
            onChangeText={(text) => {
              setPortionLimit(text);
              if (errors.portionLimit) setErrors({ ...errors, portionLimit: '' });
            }}
            keyboardType="numeric"
            error={errors.portionLimit}
            helperText="How many portions can you prepare per batch?"
          />
        </View>

        {/* ─── Schedule & Availability ─── */}
        <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6">
          <SectionHeader title="Schedule & Availability" icon="⏰" />

          <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-2">
            AVAILABLE DAYS *
          </Text>
          <View className="flex-row flex-wrap mb-4">
            {DAYS.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.8}
                  className={`
                    w-11 h-11 rounded-2xl items-center justify-center mr-2 mb-2 border
                    ${isSelected ? 'bg-secondary border-secondary' : 'bg-surface-elevated border-gray-200'}
                  `}
                >
                  <Text
                    className={`
                      text-xs font-bold
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
            label="PRE-ORDER CUTOFF TIME *"
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
            label="SERVING TIME *"
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

        {/* ─── Submit Action Button ─── */}
        <Button
          title={mealToEdit ? "🍽️  UPDATE MEAL" : "🍽️  PUBLISH MEAL"}
          onPress={handleCreate}
          loading={submitting}
          variant="secondary"
          size="lg"
          className="w-full mb-8"
        />

        <View className="h-8" />
      </ScrollView>
    </View>
  );
};
