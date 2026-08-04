import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  mealId: string;
  name: string;
  price: number;
  quantity: number;
  cookId: string;
  cookName: string;
  photos?: string[];
  portionsRemaining: number;
}

interface CartState {
  items: CartItem[];
  addItem: (meal: any, quantity: number) => { success: boolean; reason?: 'diff_cook' | 'no_portions' };
  removeItem: (mealId: string) => void;
  updateQuantity: (mealId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCookId: () => string | null;
  getCookName: () => string | null;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (meal, quantity) => {
    const { items } = get();
    
    // Check if adding from a different cook
    if (items.length > 0 && items[0].cookId !== meal.cookId) {
      return { success: false, reason: 'diff_cook' };
    }

    const existingItemIndex = items.findIndex(item => item.mealId === meal.id);
    
    if (existingItemIndex > -1) {
      const existingItem = items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > meal.portionsRemaining) {
        return { success: false, reason: 'no_portions' };
      }
      
      const newItems = [...items];
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };
      set({ items: newItems });
    } else {
      if (quantity > meal.portionsRemaining) {
        return { success: false, reason: 'no_portions' };
      }
      
      const newItem: CartItem = {
        mealId: meal.id,
        name: meal.name,
        price: meal.price,
        quantity: quantity,
        cookId: meal.cookId,
        cookName: meal.cookName,
        photos: meal.photos,
        portionsRemaining: meal.portionsRemaining,
      };
      set({ items: [...items, newItem] });
    }
    
    return { success: true };
  },

  removeItem: (mealId) => {
    set(state => ({
      items: state.items.filter(item => item.mealId !== mealId),
    }));
  },

  updateQuantity: (mealId, quantity) => {
    set(state => ({
      items: state.items.map(item => {
        if (item.mealId === mealId) {
          const cleanQty = Math.max(1, Math.min(item.portionsRemaining, quantity));
          return { ...item, quantity: cleanQty };
        }
        return item;
      }),
    }));
  },

  clearCart: () => set({ items: [] }),

  getCartTotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getCookId: () => {
    const { items } = get();
    return items.length > 0 ? items[0].cookId : null;
  },

  getCookName: () => {
    const { items } = get();
    return items.length > 0 ? items[0].cookName : null;
  },

  getItemCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
}));

// Load initial state asynchronously from AsyncStorage
AsyncStorage.getItem('neighborplates-cart-storage').then(data => {
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.items)) {
        useCartStore.setState({ items: parsed.items });
      }
    } catch (e) {
      console.error("Failed to load persisted cart state:", e);
    }
  }
});

// Subscribe to store updates and save changes in storage
useCartStore.subscribe((state) => {
  AsyncStorage.setItem('neighborplates-cart-storage', JSON.stringify({ items: state.items }))
    .catch(err => console.error("Failed to persist cart state:", err));
});
