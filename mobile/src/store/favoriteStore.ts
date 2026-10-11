import { create } from 'zustand';
import { favoriteService } from '../services/favoriteService';

interface FavoriteState {
  favoriteMealIds: string[];
  favoriteMeals: any[];
  isLoading: boolean;
  isLoaded: boolean;
  setFavoriteMealIds: (ids: string[]) => void;
  fetchFavoriteMeals: () => Promise<void>;
  isFavorite: (mealId: string) => boolean;
  toggleFavorite: (mealId: string) => Promise<boolean>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favoriteMealIds: [],
  favoriteMeals: [],
  isLoading: false,
  isLoaded: false,

  setFavoriteMealIds: (ids: string[]) => {
    set({ favoriteMealIds: ids || [] });
  },

  fetchFavoriteMeals: async () => {
    set({ isLoading: true });
    try {
      const meals = await favoriteService.getFavoriteMeals();
      const ids = meals.map((m: any) => m.id);
      set({
        favoriteMeals: meals,
        favoriteMealIds: ids,
        isLoaded: true,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching favorite meals:', err);
      set({ isLoading: false });
    }
  },

  isFavorite: (mealId: string) => {
    return get().favoriteMealIds.includes(mealId);
  },

  toggleFavorite: async (mealId: string) => {
    const currentIds = get().favoriteMealIds;
    const isCurrentlyFavorited = currentIds.includes(mealId);
    
    // Optimistic update
    const optimisticIds = isCurrentlyFavorited
      ? currentIds.filter((id) => id !== mealId)
      : [...currentIds, mealId];
    
    set({
      favoriteMealIds: optimisticIds,
      favoriteMeals: isCurrentlyFavorited
        ? get().favoriteMeals.filter((m: any) => m.id !== mealId)
        : get().favoriteMeals,
    });

    try {
      const result = await favoriteService.toggleFavorite(mealId);
      set({ favoriteMealIds: result.favorites });
      
      // If newly favorited and list was previously loaded, refresh meals list
      if (result.favorited && get().isLoaded) {
        favoriteService.getFavoriteMeals().then((meals) => {
          set({ favoriteMeals: meals });
        }).catch(() => {});
      }

      return result.favorited;
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Rollback on failure
      set({ favoriteMealIds: currentIds });
      throw err;
    }
  },
}));
