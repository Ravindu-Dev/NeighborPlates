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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Toast } from '../../components/common/Toast';
import { TextInput } from '../../components/common/TextInput';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, Feather } from '@expo/vector-icons';

const CATEGORY_ICONS: Record<string, string> = {
  BREAKFAST: '🥞',
  LUNCH: '🍛',
  DINNER: '🍲',
  SNACK: '🍿',
  COMBO: '🎁',
};

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [cookMeals, setCookMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Portion quick modal and options modal state
  const [portionModalMeal, setPortionModalMeal] = useState<any | null>(null);
  const [newPortionsCount, setNewPortionsCount] = useState<string>('10');
  const [savingPortions, setSavingPortions] = useState<boolean>(false);
  const [optionsModalMeal, setOptionsModalMeal] = useState<any | null>(null);

  const fetchCookMeals = async () => {
    try {
      setLoadingMeals(true);
      const profRes = await api.get('/api/users/profile');
      const cookId = profRes.data?.id || user?.id;
      if (cookId) {
        const mealsRes = await api.get(`/api/meals/cook/${cookId}`);
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

  const handleAddNewMeal = () => {
    navigation.navigate('AddMealForm');
  };

  const handleEditCookMeal = (meal: any) => {
    navigation.navigate('AddMealForm', { mealToEdit: meal });
  };

  const handleToggleTakingOrders = async (meal: any) => {
    const isCurrentlyActive = Boolean(meal.active);
    const nextActiveState = !isCurrentlyActive;
    const defaultPortions = (meal.portionsRemaining && meal.portionsRemaining > 0)
      ? meal.portionsRemaining
      : (meal.portionLimit && meal.portionLimit > 0 ? meal.portionLimit : 10);
    const nextPortions = nextActiveState ? defaultPortions : 0;

    // Optimistically update UI
    setCookMeals((prev) =>
      prev.map((m) =>
        m.id === meal.id
          ? {
              ...m,
              active: nextActiveState,
              portionsRemaining: nextPortions,
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
          portionsRemaining: nextPortions,
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
                COOK FOOD MANAGEMENT
              </Text>
              <Text className="text-textPrimary font-extrabold text-2xl mt-0.5">
                My Meals 🍛
              </Text>
            </View>
          </View>

          {/* ─── Combo Deals & Add New Meals Options ─── */}
          <View className="mb-6">
            {/* Create Combo Deal Banner */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ComboDeals')}
              activeOpacity={0.85}
              className="bg-secondary rounded-3xl py-4 px-5 mb-3.5 flex-row items-center"
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

            {/* Add New Meals Button (Positioned to the right and below) */}
            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={handleAddNewMeal}
                activeOpacity={0.85}
                className="flex-row items-center px-4 py-2.5 rounded-2xl shadow-sm bg-primary"
                style={{
                  shadowColor: '#FF6B35',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons
                  name="add-circle"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text className="font-extrabold text-xs tracking-wide text-white">
                  Add New Meals
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── All Added Meals Section ─── */}
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
              <View className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm items-center text-center">
                <Text className="text-4xl mb-3">🍽️</Text>
                <Text className="text-textPrimary font-extrabold text-base text-center mb-1">
                  No Meals Added Yet
                </Text>
                <Text className="text-textSecondary text-xs text-center leading-4 px-4 mb-4">
                  Click 'Add New Meals' above to list your first delicious home-cooked dish!
                </Text>
                <TouchableOpacity
                  onPress={handleAddNewMeal}
                  className="bg-primary px-5 py-2.5 rounded-2xl"
                >
                  <Text className="text-white font-bold text-xs">Add First Meal</Text>
                </TouchableOpacity>
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
