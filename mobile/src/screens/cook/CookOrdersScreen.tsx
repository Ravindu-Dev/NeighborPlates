import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const CookOrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/my');
      setOrders(response.data);
    } catch (error) {
      console.error(error);
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

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = '';
    switch (currentStatus) {
      case 'PLACED': nextStatus = 'ACCEPTED'; break;
      case 'ACCEPTED': nextStatus = 'PREPARING'; break;
      case 'PREPARING': nextStatus = 'READY'; break;
      case 'READY': nextStatus = 'DELIVERED'; break;
      default: return;
    }

    try {
      await api.put(`/api/orders/${orderId}/status?status=${nextStatus}`);
      Alert.alert('Status Updated', `Order is now: ${nextStatus}`);
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order status.');
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'PLACED': return 'ACCEPT ORDER';
      case 'ACCEPTED': return 'START PREPARING';
      case 'PREPARING': return 'MARK AS READY';
      case 'READY': return 'MARK DELIVERED';
      default: return null;
    }
  };

  return (
    <View className="flex-1 bg-surface-elevated px-4 pt-4">
      <Text className="text-textPrimary text-xl font-bold mb-4">Manage Orders</Text>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-textMuted text-base font-semibold text-center mb-1">No orders received yet</Text>
          <Text className="text-textMuted text-xs text-center">Meals published will be ordered by nearby customers.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const actionLabel = getActionLabel(item.status);
            return (
              <Card className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-textPrimary font-extrabold text-sm">{item.orderNumber}</Text>
                  <Badge label={item.status} variant={item.status === 'DELIVERED' ? 'success' : 'neutral'} />
                </View>
                <Text className="text-textSecondary text-xs">Customer: {item.customerName}</Text>
                <Text className="text-textSecondary text-xs mt-0.5">Address: {item.address.label}</Text>
                
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <Text className="text-textMuted text-xs">
                    {item.items.map((meal: any) => `${meal.name} (x${meal.quantity})`).join(', ')}
                  </Text>
                  <Text className="text-secondary font-black text-sm">LKR {item.totalAmount}</Text>
                </View>

                {actionLabel && (
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(item.id, item.status)}
                    className="bg-secondary rounded-xl py-2.5 items-center justify-center mt-4 active:opacity-85"
                  >
                    <Text className="text-white font-bold text-xs tracking-wider">{actionLabel}</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
};
