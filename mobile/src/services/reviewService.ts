import { api } from './api';

export interface CustomerReview {
  id: string;
  orderId: string;
  mealId: string;
  cookId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment?: string;
  photoUrl?: string;
  mealName?: string;
  mealPhoto?: string;
  flagged?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitReviewPayload {
  orderId: string;
  mealId: string;
  rating: number;
  comment?: string;
  photoUrl?: string;
}

export interface UpdateReviewPayload {
  rating: number;
  comment?: string;
  photoUrl?: string;
}

export const reviewService = {
  submitReview: async (payload: SubmitReviewPayload) => {
    const response = await api.post('/api/reviews', payload);
    return response.data;
  },

  getMyReviews: async (): Promise<CustomerReview[]> => {
    const response = await api.get('/api/reviews/my');
    return response.data || [];
  },

  updateReview: async (reviewId: string, payload: UpdateReviewPayload) => {
    const response = await api.put(`/api/reviews/${reviewId}`, payload);
    return response.data;
  },

  deleteReview: async (reviewId: string) => {
    const response = await api.delete(`/api/reviews/${reviewId}`);
    return response.data;
  },

  getReviewsByMeal: async (mealId: string): Promise<CustomerReview[]> => {
    const response = await api.get(`/api/reviews/meal/${mealId}`);
    return response.data || [];
  },

  getReviewsByOrder: async (orderId: string): Promise<CustomerReview[]> => {
    const response = await api.get(`/api/reviews/order/${orderId}`);
    return response.data || [];
  },
};
