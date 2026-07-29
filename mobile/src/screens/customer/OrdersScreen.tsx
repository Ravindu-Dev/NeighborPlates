import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

type OrdersScreenProp = NativeStackNavigationProp<CustomerStackParamList, 'HomeTabs'>;

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<OrdersScreenProp>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const getVariant = (status: string) => {
    switch (status) {
      case 'PLACED': return 'primary';
      case 'ACCEPTED':
      case 'PREPARING': return 'secondary';
      case 'READY': return 'warning';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      <Text className="text-textPrimary text-xl font-bold mb-4">My Orders</Text>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center mb-1">No orders placed yet</Text>
          <Text className="text-textMuted text-xs text-center">Place your first order from the home feed!</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
              className="mb-4"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-textPrimary font-extrabold text-sm">{item.orderNumber}</Text>
                <Badge label={item.status} variant={getVariant(item.status)} />
              </View>
              
              <Text className="text-textSecondary text-xs mb-1">By Cook: {item.cookName}</Text>
              
              <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <Text className="text-textMuted text-xs">
                  {item.items.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(', ')}
                </Text>
                <Text className="text-primary font-black text-sm">LKR {item.totalAmount}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
};
