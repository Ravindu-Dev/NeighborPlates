import { api } from './api';

export interface FavoriteToggleResult {
  favorited: boolean;
  mealId: string;
  favorites: string[];
}

export const favoriteService = {
  toggleFavorite: async (mealId: string): Promise<FavoriteToggleResult> => {
    const response = await api.post(`/api/users/favorites/${mealId}`);
    return response.data;
  },

  getFavoriteMeals: async (): Promise<any[]> => {
    const response = await api.get('/api/users/favorites');
    return response.data || [];
  },
};
