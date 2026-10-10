import { create } from 'zustand';
import { api } from '../services/api';

export interface RichCardData {
  cardType: 'MEAL_CARD' | 'COOK_CARD' | 'ORDER_CARD';
  mealId?: string;
  mealName?: string;
  cookId?: string;
  cookName?: string;
  photoUrl?: string;
  price?: number;
  currency?: string; // "Rs." or "LKR"
  rating?: number;
  category?: string;
  portionsRemaining?: number;
  kitchenName?: string;
  cuisineType?: string;
  address?: string;
  totalMealsCount?: number;
  orderId?: string;
  orderStatus?: string;
  totalAmount?: number;
  estimatedDelivery?: string;
  itemSummary?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  cards?: RichCardData[];
  timestamp: string;
}

interface AiChatState {
  isOpen: boolean;
  isLoading: boolean;
  unreadCount: number;
  messages: ChatMessage[];
  sessionId: string;
  suggestedPrompts: string[];
  
  toggleOpen: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  unreadCount: 0,
  sessionId: 'session-' + Date.now(),
  suggestedPrompts: [
    '🌾 Which shops sell rice?',
    '🔥 Top meals under Rs. 1,500',
    '📦 Track my active order',
    '🍲 Recommend popular home dishes',
  ],
  messages: [
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "👋 Hello! I'm **Platie**, your NeighborPlates Assistant in Sri Lanka.\nHow can I help you today? Ask me about home cooks, rice dishes, prices (in LKR), or order tracking!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],

  toggleOpen: () => {
    const nextState = !get().isOpen;
    set({ isOpen: nextState, unreadCount: nextState ? 0 : get().unreadCount });
  },

  openChat: () => set({ isOpen: true, unreadCount: 0 }),
  closeChat: () => set({ isOpen: false }),

  clearChat: () =>
    set({
      messages: [
        {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: "👋 Chat reset! Ask me anything about local home kitchens, rice options, or order tracking in Sri Lanka (LKR).",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      sessionId: 'session-' + Date.now(),
    }),

  sendMessage: async (text: string) => {
    if (!text.trim() || get().isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
    }));

    try {
      const historyPayload = get()
        .messages.slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await api.post('/api/ai/chat', {
        message: text.trim(),
        sessionId: get().sessionId,
        history: historyPayload,
      });

      const { replyText, cards, suggestedPrompts } = response.data;

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: replyText || 'Here are the matching results from our database:',
        cards: cards && cards.length > 0 ? cards : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      set((state) => ({
        messages: [...state.messages, aiMsg],
        isLoading: false,
        suggestedPrompts: suggestedPrompts && suggestedPrompts.length > 0 ? suggestedPrompts : state.suggestedPrompts,
        unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
      }));
    } catch (error) {
      console.warn('AI Chat Error:', error);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'ai',
        text: "I'm having trouble fetching live database results right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        isLoading: false,
      }));
    }
  },
}));
