import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput } from '../../components/common/TextInput';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { FilterChip } from '../../components/common/FilterChip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Toast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { requestGalleryPermission, pickImageFromGallery, uploadImageToImgBB, validateImageSize } from '../../services/imageService';
import { Ionicons, Feather } from '@expo/vector-icons';

const CATEGORIES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const CATEGORY_ICONS: Record<string, string> = {
  BREAKFAST: '🥞',
  LUNCH: '🍛',
  DINNER: '🍲',
  SNACK: '🍿',
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mealToEdit = route.params?.mealToEdit;
  const { user } = useAuthStore();

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
  const [showForm, setShowForm] = useState(false);
  const [cookMeals, setCookMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  // Portion quick modal and meal options modal state
  const [portionModalMeal, setPortionModalMeal] = useState<any | null>(null);
  const [newPortionsCount, setNewPortionsCount] = useState<string>('10');
  const [savingPortions, setSavingPortions] = useState<boolean>(false);
  const [optionsModalMeal, setOptionsModalMeal] = useState<any | null>(null);

  const handlePickFromGallery = async () => {
    try {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        setToast({ visible: true, message: 'Gallery permission is required to upload photos.', type: 'error' });
        return;
      }

      const asset = await pickImageFromGallery();
      if (!asset) return; // User cancelled

      // Validate file size (< 5 MB)
      await validateImageSize(asset);

      // Show local preview immediately while uploading
      setImageUrl(asset.uri);
      setUploading(true);

      const cdnUrl = await uploadImageToImgBB(asset.uri);
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

  const fetchCookMeals = async () => {
    try {
      setLoadingMeals(true);
      const profRes = await api.get('/api/users/profile');
      const cookId = profRes.data?.id || user?.id;
      if (cookId) {
        const mealsRes = await api.get(`/api/meals/cook/${cookId}`);
        // Filter non-combo individual meals
        const items = (mealsRes.data || []).filter((m: any) => !m.combo);
        setCookMeals(items);
      }
    } catch (err) {
      console.error('Error fetching cook meals:', err);
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    fetchCookMeals();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCookMeals();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (mealToEdit) {
      setShowForm(true);
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
      setShowForm(false);
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

  const handleAddNewMeal = () => {
    if (mealToEdit) {
      navigation.setParams({ mealToEdit: undefined });
    }
    clearFormAction();
    setShowForm(true);
    setToast({ visible: true, message: '✨ Ready to add a new meal!', type: 'success' });
  };

  const handleEditCookMeal = (meal: any) => {
    setName(meal.name || '');
    setDescription(meal.description || '');
    setPrice(meal.price ? meal.price.toString() : '');
    setCuisineType(meal.cuisineType || 'Sri Lankan');
    setCategory(meal.category || 'LUNCH');
    setImageUrl(meal.photos?.[0] || '');
    setIngredients(meal.ingredients?.join(', ') || '');
    setAllergens(meal.allergenTags?.join(', ') || '');
    setPortionLimit(meal.portionLimit ? meal.portionLimit.toString() : '10');
    if (meal.availability) {
      setCutoffTime(meal.availability.cutoffTime || '09:00');
      setServingTime(meal.availability.servingTime || '12:00');
      setSelectedDays(meal.availability.days || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    }
    navigation.setParams({ mealToEdit: meal });
    setShowForm(true);
    setToast({ visible: true, message: `✏️ Editing "${meal.name}"`, type: 'success' });
  };

  const handleToggleTakingOrders = async (meal: any) => {
    const isCurrentlyActive = Boolean(meal.active);
    const nextActiveState = !isCurrentlyActive;

    // Optimistically update UI
    setCookMeals((prev) =>
      prev.map((m) =>
        m.id === meal.id
          ? {
              ...m,
              active: nextActiveState,
              portionsRemaining: nextActiveState
                ? ((m.portionsRemaining && m.portionsRemaining > 0) ? m.portionsRemaining : (m.portionLimit || 10))
                : 0,
            }
          : m
      )
    );

    try {
      let res;
      try {
        res = await api.patch(`/api/meals/${meal.id}/toggle-status`);
      } catch (patchErr) {
        res = await api.put(`/api/meals/${meal.id}`, {
          name: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category || 'LUNCH',
          cuisineType: meal.cuisineType || 'Sri Lankan',
          photos: meal.photos || [],
          ingredients: meal.ingredients || [],
          allergenTags: meal.allergenTags || [],
          portionLimit: meal.portionLimit || 10,
          portionsRemaining: nextActiveState ? ((meal.portionsRemaining && meal.portionsRemaining > 0) ? meal.portionsRemaining : (meal.portionLimit || 10)) : 0,
          availability: meal.availability || { cutoffTime: '09:00', servingTime: '12:00', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
          active: nextActiveState,
        });
      }

      if (res && res.data) {
        setCookMeals((prev) =>
          prev.map((m) => (m.id === meal.id ? { ...m, ...res.data, active: nextActiveState } : m))
        );
      }
      setToast({
        visible: true,
        message: nextActiveState
          ? `🟢 "${meal.name}" is now Available & taking orders!`
          : `⏸️ "${meal.name}" is now Out of Stock`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error toggling meal status:', err);
      // Revert optimistic update
      setCookMeals((prev) =>
        prev.map((m) => (m.id === meal.id ? { ...m, active: isCurrentlyActive } : m))
      );
      setToast({
        visible: true,
        message: 'Failed to update meal status.',
        type: 'error',
      });
    }
  };

  const handleOpenPortionModal = (meal: any) => {
    setPortionModalMeal(meal);
    setNewPortionsCount(String(meal.portionsRemaining ?? meal.portionLimit ?? 10));
  };

  const handleSavePortions = async () => {
    if (!portionModalMeal) return;
    const count = parseInt(newPortionsCount, 10);
    if (isNaN(count) || count < 0) {
      setToast({ visible: true, message: 'Please enter a valid portion number', type: 'error' });
      return;
    }

    setSavingPortions(true);
    try {
      await api.patch(`/api/meals/${portionModalMeal.id}/portions?portions=${count}`);
      setCookMeals((prev) =>
        prev.map((m) =>
          m.id === portionModalMeal.id
            ? { ...m, portionsRemaining: count, portionLimit: Math.max(m.portionLimit || 0, count) }
            : m
        )
      );
      setToast({
        visible: true,
        message: `🍱 Portions updated to ${count} for "${portionModalMeal.name}"`,
        type: 'success',
      });
      setPortionModalMeal(null);
    } catch (err) {
      console.error(err);
      setToast({ visible: true, message: 'Failed to update portions', type: 'error' });
    } finally {
      setSavingPortions(false);
    }
  };

  const handleOpenMealOptions = (meal: any) => {
    setOptionsModalMeal(meal);
  };

  const handleDeleteCookMeal = async (mealId: string) => {
    const deleteAction = async () => {
      try {
        await api.delete(`/api/meals/${mealId}`);
        setCookMeals((prev) => prev.filter((m) => m.id !== mealId));
        setToast({ visible: true, message: 'Meal deleted successfully', type: 'success' });
        fetchCookMeals();
      } catch (error) {
        console.error(error);
        setToast({ visible: true, message: 'Failed to delete meal', type: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to permanently delete this meal?')) {
        deleteAction();
      }
    } else {
      Alert.alert('Delete Meal', 'Are you sure you want to permanently delete this meal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAction },
      ]);
    }
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

      fetchCookMeals();

      // Reset form and navigation params after short delay
      setTimeout(() => {
        clearFormAction();
        setShowForm(false);
        navigation.setParams({ mealToEdit: undefined });
        fetchCookMeals();
      }, 1200);
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
                {mealToEdit ? 'EDIT LISTING' : 'CREATE LISTING'}
              </Text>
              <Text className="text-textPrimary font-extrabold text-xl mt-0.5">
                {mealToEdit ? 'Edit Meal 📝' : 'List a New Meal 📝'}
              </Text>
            </View>
            {mealToEdit ? (
              <TouchableOpacity
                onPress={() => {
                  clearFormAction();
                  setShowForm(false);
                  navigation.setParams({ mealToEdit: undefined });
                  navigation.navigate('Dashboard');
                }}
                activeOpacity={0.7}
              >
                <Text className="text-red-400 font-semibold text-xs">CANCEL EDIT</Text>
              </TouchableOpacity>
            ) : showForm ? (
              <TouchableOpacity onPress={clearForm} activeOpacity={0.7}>
                <Text className="text-red-400 font-semibold text-xs">CLEAR ALL</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ─── Combo Deals & Add New Meals Options ─── */}
          <View className="mb-6">
            {!mealToEdit && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ComboDeals')}
                activeOpacity={0.85}
                className="bg-secondary rounded-3xl py-4 px-5 mb-3 flex-row items-center"
                style={{
                  shadowColor: '#2D6A4F',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🎁</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-extrabold text-sm tracking-wide">
                    CREATE COMBO DEAL
                  </Text>
                  <Text className="text-white/70 text-[10px] mt-0.5">
                    AI-powered bundled meal packages • Boost your sales
                  </Text>
                </View>
                <View className="bg-white/20 rounded-full w-8 h-8 items-center justify-center">
                  <Ionicons name="sparkles" size={16} color="#FBBF24" />
                </View>
              </TouchableOpacity>
            )}

            {/* Add New Meals Button (Positioned to the right and below) */}
            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => {
                  if (showForm && !mealToEdit) {
                    setShowForm(false);
                  } else {
                    handleAddNewMeal();
                  }
                }}
                activeOpacity={0.8}
                className={`flex-row items-center px-4 py-2.5 rounded-2xl shadow-xs border ${
                  showForm && !mealToEdit
                    ? 'bg-primary border-primary'
                    : 'bg-primary/10 border-primary/30'
                }`}
              >
                <Ionicons
                  name={showForm && !mealToEdit ? "close-circle" : "add-circle"}
                  size={16}
                  color={showForm && !mealToEdit ? "#FFFFFF" : "#FF6B35"}
                  style={{ marginRight: 5 }}
                />
                <Text
                  className={`font-bold text-xs tracking-wide ${
                    showForm && !mealToEdit ? 'text-white' : 'text-primary'
                  }`}
                >
                  {showForm && !mealToEdit ? 'Hide Form' : 'Add New Meals'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── All Added Meals Section (Beneath Add New Meals button) ─── */}
          <View className="mb-6">
            <SectionHeader
              title="All Added Meals"
              icon="🍛"
              actionLabel={cookMeals.length > 0 ? `${cookMeals.length} item${cookMeals.length !== 1 ? 's' : ''}` : undefined}
            />

            {loadingMeals ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text className="text-textMuted text-xs mt-2 font-medium">Loading your meals...</Text>
              </View>
            ) : cookMeals.length === 0 ? (
              <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm items-center text-center">
                <Text className="text-3xl mb-2">🍽️</Text>
                <Text className="text-textPrimary font-extrabold text-sm text-center mb-1">
                  No Meals Added Yet
                </Text>
                <Text className="text-textSecondary text-xs text-center leading-4 px-2">
                  Click 'Add New Meals' above to list your first delicious dish!
                </Text>
              </View>
            ) : (
              <View className="mt-1">
                {cookMeals.map((meal) => {
                  const isAvailable = Boolean(meal.active);
                  const portionsLeft = meal.portionsRemaining ?? meal.portionLimit ?? 10;
                  const prepTimeText = meal.availability?.servingTime
                    ? `${meal.availability.servingTime} prep`
                    : '25 min prep';

                  return (
                    <View
                      key={meal.id}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-5"
                    >
                      {/* ─── Top Food Image Container ─── */}
                      <View className="h-48 w-full relative bg-gray-100">
                        {meal.photos && meal.photos.length > 0 ? (
                          <Image
                            source={{ uri: meal.photos[0] }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-secondary/10 items-center justify-center">
                            <Text className="text-5xl">
                              {CATEGORY_ICONS[meal.category] || '🍛'}
                            </Text>
                          </View>
                        )}

                        {/* Top-Left Badge (AVAILABLE when Switch is ON, OUT OF STOCK when Switch is OFF) */}
                        <View
                          className="absolute top-3.5 left-3.5 px-3 py-1.5 rounded-full flex-row items-center shadow-xs"
                          style={{
                            backgroundColor: isAvailable ? '#D1FAE5' : '#FEF3C7',
                          }}
                        >
                          <View
                            className="w-2.5 h-2.5 rounded-full mr-1.5"
                            style={{
                              backgroundColor: isAvailable ? '#059669' : '#D97706',
                            }}
                          />
                          <Text
                            className="font-extrabold text-[11px] tracking-wider"
                            style={{
                              color: isAvailable ? '#065F46' : '#92400E',
                            }}
                          >
                            {isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
                          </Text>
                        </View>

                        {/* Bottom-Right Portions Remaining Badge */}
                        <View
                          className="absolute bottom-3.5 right-3.5 px-3.5 py-1.5 rounded-full flex-row items-center border border-gray-100/70 shadow-sm"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        >
                          <Feather
                            name="box"
                            size={13}
                            color={isAvailable ? '#065F46' : '#92400E'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className="font-bold text-xs"
                            style={{
                              color: isAvailable ? '#065F46' : '#92400E',
                            }}
                          >
                            {isAvailable
                              ? `${portionsLeft > 0 ? portionsLeft : 10} portions remaining`
                              : '0 portions (Out of Stock)'}
                          </Text>
                        </View>
                      </View>

                      {/* ─── Card Body Details ─── */}
                      <View className="p-4">
                        {/* Row 1: Name & Taking Orders Toggle Switch */}
                        <View className="flex-row justify-between items-center mb-1.5">
                          <Text
                            className="text-textPrimary font-extrabold text-lg flex-1 mr-2"
                            numberOfLines={1}
                          >
                            {meal.name}
                          </Text>

                          <View className="flex-row items-center">
                            <Text
                              className="font-bold text-xs mr-2"
                              style={{ color: isAvailable ? '#166534' : '#6B7280' }}
                            >
                              {isAvailable ? 'Taking Orders' : 'Out of Stock'}
                            </Text>
                            {/* Reliable Animated Toggle Switch */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handleToggleTakingOrders(meal)}
                              style={{
                                width: 48,
                                height: 26,
                                borderRadius: 13,
                                padding: 2,
                                justifyContent: 'center',
                                backgroundColor: isAvailable ? '#166534' : '#D1D5DB',
                              }}
                            >
                              <View
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 11,
                                  backgroundColor: '#FFFFFF',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 2,
                                  elevation: 2,
                                  transform: [{ translateX: isAvailable ? 22 : 0 }],
                                }}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Row 2: Price & Prep Time */}
                        <View className="flex-row items-center mb-2">
                          <Text className="text-[#166534] font-black text-sm">
                            Rs. {meal.price}
                          </Text>
                          <Text className="text-gray-400 mx-2 text-xs">•</Text>
                          <Feather name="clock" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                          <Text className="text-textMuted font-medium text-xs">
                            {prepTimeText}
                          </Text>
                        </View>

                        {/* Row 3: Description */}
                        <Text
                          className="text-textSecondary text-xs leading-4 mb-4"
                          numberOfLines={2}
                        >
                          {meal.description || 'Traditional freshly prepared homemade delicacy.'}
                        </Text>

                        {/* Row 4: Action Buttons (Edit Meal, Sliders, More Actions) */}
                        <View className="flex-row items-center">
                          <TouchableOpacity
                            onPress={() => handleEditCookMeal(meal)}
                            activeOpacity={0.8}
                            className="flex-1 bg-[#EAF2ED] py-3 rounded-2xl flex-row items-center justify-center mr-2.5"
                          >
                            <Feather
                              name="edit-3"
                              size={14}
                              color="#1E293B"
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-textPrimary font-bold text-xs">
                              Edit Meal
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleOpenPortionModal(meal)}
                            activeOpacity={0.8}
                            className="w-11 h-11 bg-[#EAF2ED] rounded-2xl items-center justify-center mr-2"
                          >
                            <Feather name="sliders" size={16} color="#1E293B" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleOpenMealOptions(meal)}
                            activeOpacity={0.8}
                            className="w-11 h-11 bg-[#EAF2ED] rounded-2xl items-center justify-center"
                          >
                            <Feather name="more-vertical" size={16} color="#1E293B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ─── Conditional Meal Form ─── */}
          {(showForm || mealToEdit) && (
            <>
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
                    Upload a photo from your gallery (Max 5 MB)
                  </Text>
                </View>
              )}
            </View>

            {/* Upload from Gallery Button */}
            <TouchableOpacity
              onPress={handlePickFromGallery}
              disabled={uploading}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center py-3.5 rounded-2xl border ${
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
            </>
          )}

          {/* Bottom spacer */}
          <View className="h-8" />
        </View>
      </ScrollView>

      {/* ─── Options / Action Sheet Modal ─── */}
      <Modal
        visible={!!optionsModalMeal}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalMeal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOptionsModalMeal(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-4" />
            <Text className="text-textPrimary font-extrabold text-base mb-1">
              {optionsModalMeal?.name}
            </Text>
            <Text className="text-textMuted text-xs mb-4">Manage this meal listing</Text>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleEditCookMeal(m);
              }}
              className="flex-row items-center py-3.5 border-b border-gray-100"
            >
              <Feather name="edit-3" size={18} color="#3B82F6" style={{ marginRight: 12 }} />
              <Text className="text-textPrimary font-bold text-sm">Edit Full Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleOpenPortionModal(m);
              }}
              className="flex-row items-center py-3.5 border-b border-gray-100"
            >
              <Feather name="sliders" size={18} color="#059669" style={{ marginRight: 12 }} />
              <Text className="text-textPrimary font-bold text-sm">Adjust Portions Remaining</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const m = optionsModalMeal;
                setOptionsModalMeal(null);
                handleToggleTakingOrders(m);
              }}
              className="flex-row items-center py-3.5 border-b border-gray-100"
            >
              <Feather name="power" size={18} color="#F59E0B" style={{ marginRight: 12 }} />
              <Text className="text-textPrimary font-bold text-sm">
                {optionsModalMeal?.active ? 'Pause Taking Orders' : 'Resume Taking Orders'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const id = optionsModalMeal?.id;
                setOptionsModalMeal(null);
                if (id) handleDeleteCookMeal(id);
              }}
              className="flex-row items-center py-3.5"
            >
              <Feather name="trash-2" size={18} color="#EF4444" style={{ marginRight: 12 }} />
              <Text className="text-red-500 font-bold text-sm">Delete Meal Listing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOptionsModalMeal(null)}
              className="mt-3 bg-gray-100 py-3.5 rounded-2xl items-center"
            >
              <Text className="text-textSecondary font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Quick Portions Adjuster Modal ─── */}
      <Modal
        visible={!!portionModalMeal}
        transparent
        animationType="fade"
        onRequestClose={() => setPortionModalMeal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPortionModalMeal(null)}
          className="flex-1 bg-black/50 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-textPrimary font-extrabold text-base">
                Update Portions
              </Text>
              <TouchableOpacity onPress={() => setPortionModalMeal(null)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-textMuted text-xs mb-4">
              Set available remaining portions for "{portionModalMeal?.name}"
            </Text>

            {/* Quick Increment buttons */}
            <View className="flex-row justify-between mb-4">
              {[5, 10, 15, 20].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setNewPortionsCount(String(preset))}
                  className={`flex-1 mx-1 py-2 rounded-xl items-center border ${
                    newPortionsCount === String(preset)
                      ? 'bg-secondary/10 border-secondary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      newPortionsCount === String(preset) ? 'text-secondary' : 'text-textSecondary'
                    }`}
                  >
                    {preset} pcs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Direct Input */}
            <View className="flex-row items-center justify-center bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-5">
              <TouchableOpacity
                onPress={() => {
                  const current = parseInt(newPortionsCount, 10) || 0;
                  setNewPortionsCount(String(Math.max(0, current - 1)));
                }}
                className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-200 shadow-xs"
              >
                <Feather name="minus" size={18} color="#1E293B" />
              </TouchableOpacity>

              <TextInput
                value={newPortionsCount}
                onChangeText={setNewPortionsCount}
                keyboardType="numeric"
                className="text-center font-black text-2xl text-textPrimary px-4 min-w-[70px]"
              />

              <TouchableOpacity
                onPress={() => {
                  const current = parseInt(newPortionsCount, 10) || 0;
                  setNewPortionsCount(String(current + 1));
                }}
                className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-200 shadow-xs"
              >
                <Feather name="plus" size={18} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <Button
              title={savingPortions ? 'Saving...' : 'Save Portions'}
              onPress={handleSavePortions}
              loading={savingPortions}
              variant="secondary"
              size="md"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
