import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RichCardData } from '../../store/aiChatStore';

interface AiCardRendererProps {
  cards: RichCardData[];
  onNavigateMeal?: (mealId: string) => void;
  onNavigateOrder?: (orderId: string) => void;
}

export const AiCardRenderer: React.FC<AiCardRendererProps> = ({
  cards,
  onNavigateMeal,
  onNavigateOrder,
}) => {
  if (!cards || cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled={true}
      directionalLockEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 8, marginBottom: 4 }}
      contentContainerStyle={{ paddingRight: 16 }}
    >

      {cards.map((card, index) => {
        if (card.cardType === 'MEAL_CARD') {
          return (
            <View
              key={`meal-${card.mealId || 'id'}-${index}`}
              style={{
                width: 210,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 10,
                marginRight: 10,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Image
                source={{
                  uri: card.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
                }}
                style={{ width: '100%', height: 100, borderRadius: 10, backgroundColor: '#F3F4F6' }}
                resizeMode="cover"
              />
              <View style={{ marginTop: 8 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}
                >
                  {card.mealName || 'Home Meal'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}
                >
                  {card.cookName || 'Home Kitchen'}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FF6B35' }}>
                    Rs. {(card.price || 0).toLocaleString()}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Feather name="star" size={11} color="#D97706" />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: '#92400E',
                        marginLeft: 3,
                      }}
                    >
                      {card.rating ? card.rating.toFixed(1) : '4.8'}
                    </Text>
                  </View>
                </View>

                {card.mealId && onNavigateMeal && (
                  <TouchableOpacity
                    onPress={() => onNavigateMeal(card.mealId!)}
                    style={{
                      marginTop: 8,
                      backgroundColor: '#FF6B35',
                      borderRadius: 8,
                      paddingVertical: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                      View Dish
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }

        if (card.cardType === 'COOK_CARD') {
          return (
            <View
              key={`cook-${card.cookId || 'id'}-${index}`}
              style={{
                width: 200,
                backgroundColor: '#FFF7ED',
                borderRadius: 14,
                padding: 12,
                marginRight: 10,
                borderWidth: 1,
                borderColor: '#FFEDD5',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FF6B35',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="home" size={18} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 13, fontWeight: '700', color: '#9A3412' }}
                  >
                    {card.kitchenName || card.cookName || 'Home Kitchen'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 10, color: '#C2410C', marginTop: 1 }}
                  >
                    📍 {card.address || 'Colombo'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#C2410C' }}>
                  {card.cuisineType || 'Sri Lankan'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="star" size={11} color="#D97706" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E', marginLeft: 2 }}>
                    {card.rating ? card.rating.toFixed(1) : '4.8'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }

        if (card.cardType === 'ORDER_CARD') {
          return (
            <View
              key={`order-${card.orderId || 'id'}-${index}`}

              style={{
                width: 220,
                backgroundColor: '#F0FDF4',
                borderRadius: 14,
                padding: 12,
                marginRight: 10,
                borderWidth: 1,
                borderColor: '#BBF7D0',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                  Order #{card.orderId?.substring(0, 10)}
                </Text>
                <View
                  style={{
                    backgroundColor: '#DCFCE7',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803D' }}>
                    {card.orderStatus || 'IN PROGRESS'}
                  </Text>
                </View>
              </View>

              {card.itemSummary && card.itemSummary.length > 0 && (
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 11, color: '#15803D', marginTop: 6 }}
                >
                  Items: {card.itemSummary.join(', ')}
                </Text>
              )}

              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                  Rs. {(card.totalAmount || 0).toLocaleString()}
                </Text>

                {card.orderId && onNavigateOrder && (
                  <TouchableOpacity
                    onPress={() => onNavigateOrder(card.orderId!)}
                    style={{
                      backgroundColor: '#16A34A',
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                      Track
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }

        return null;
      })}
    </ScrollView>
  );
};
