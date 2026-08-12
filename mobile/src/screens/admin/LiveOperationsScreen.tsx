import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, RefreshControl, Modal, FlatList
} from 'react-native';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TextInput } from '../../components/common/TextInput';
import { Feather } from '@expo/vector-icons';

interface OrderOperationalDetail {
  order: any;
  customerName: string;
  customerPhone?: string;
  cookName: string;
  cookPhone?: string;
  riderName?: string;
  riderPhone?: string;
  delayed: boolean;
  delayReason?: string;
}

interface LiveOpsData {
  activeOrdersCount: number;
  delayedOrdersCount: number;
  openDisputesCount: number;
  liveOrders: OrderOperationalDetail[];
  availableRiders: any[];
}

export const LiveOperationsScreen: React.FC = () => {
  const [data, setData] = useState<LiveOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'DELAYED' | 'DISPUTES'>('LIVE');

  // Modal states
  const [selectedItem, setSelectedItem] = useState<OrderOperationalDetail | null>(null);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolution form states
  const [resolveAction, setResolveAction] = useState<'REFUND' | 'FORCE_CANCEL' | 'DISMISS'>('REFUND');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchLiveOps = async () => {
    try {
      const res = await api.get('/api/admin/operations/live');
      setData(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch live operations command center data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLiveOps();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLiveOps();
    const interval = setInterval(fetchLiveOps, 15000); // Polling every 15 sec
    return () => clearInterval(interval);
  }, []);

  const handleReassignRider = async (riderId: string, riderName: string) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await api.put(`/api/admin/orders/${selectedItem.order.id}/reassign-rider/${riderId}`);
      Alert.alert('Success', `Order #${selectedItem.order.orderNumber} re-assigned to ${riderName}`);
      setReassignModalVisible(false);
      setSelectedItem(null);
      fetchLiveOps();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to reassign rider');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await api.post(`/api/admin/orders/${selectedItem.order.id}/resolve-dispute`, {
        action: resolveAction,
        adminNotes: adminNotes.trim() || 'Resolved by admin',
      });
      Alert.alert('Success', `Dispute for #${selectedItem.order.orderNumber} marked as ${resolveAction}`);
      setResolveModalVisible(false);
      setSelectedItem(null);
      setAdminNotes('');
      fetchLiveOps();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceStatus = (orderId: string, status: string) => {
    Alert.alert(
      'Force Update Status',
      `Are you sure you want to force order state to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Change',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/admin/orders/${orderId}/force-status?status=${status}&adminNotes=Force override by admin`);
              Alert.alert('Updated', `Order status changed to ${status}`);
              fetchLiveOps();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed status override');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-elevated">
        <ActivityIndicator size="large" color="#1A1A2E" />
      </View>
    );
  }

  const liveOrders = data?.liveOrders || [];
  // The backend now includes disputed non-active orders in liveOrders list
  const delayedOrders = liveOrders.filter((o) => o.delayed);
  const disputedOrders = liveOrders.filter(
    (o) => o.order.disputed === true || o.order.disputeStatus === 'OPEN'
  );

  const displayedOrders =
    activeTab === 'LIVE' ? liveOrders : activeTab === 'DELAYED' ? delayedOrders : disputedOrders;

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* Top Banner Stats */}
      <View className="p-5 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-textPrimary text-xl font-black">Live Command Center</Text>
          <View className="flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-emerald-700 text-[10px] font-bold">REAL-TIME</Text>
          </View>
        </View>

        {/* Metric Cards Grid */}
        <View className="flex-row justify-between mb-4">
          <Card className="flex-1 mr-1.5 p-3 items-center" bordered>
            <Text className="text-textMuted text-[9px] font-bold uppercase">ACTIVE</Text>
            <Text className="text-primary text-xl font-black">{data?.activeOrdersCount || 0}</Text>
          </Card>
          <Card className="flex-1 mx-1.5 p-3 items-center" bordered>
            <Text className="text-textMuted text-[9px] font-bold uppercase">DELAYED</Text>
            <Text className="text-amber-500 text-xl font-black">{data?.delayedOrdersCount || 0}</Text>
          </Card>
          <Card className="flex-1 ml-1.5 p-3 items-center" bordered>
            <Text className="text-textMuted text-[9px] font-bold uppercase">DISPUTES</Text>
            <Text className="text-red-500 text-xl font-black">{data?.openDisputesCount || 0}</Text>
          </Card>
        </View>

        {/* Segmented Tab Switcher */}
        <View className="flex-row bg-gray-200/60 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => setActiveTab('LIVE')}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'LIVE' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'LIVE' ? 'text-textPrimary' : 'text-textMuted'}`}>
              All Live ({liveOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('DELAYED')}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'DELAYED' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'DELAYED' ? 'text-amber-600' : 'text-textMuted'}`}>
              Delayed ({delayedOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('DISPUTES')}
            className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'DISPUTES' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-bold ${activeTab === 'DISPUTES' ? 'text-red-600' : 'text-textMuted'}`}>
              Disputes ({disputedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />}
      >
        {displayedOrders.length === 0 ? (
          <View className="py-12 items-center">
            <Feather name="check-circle" size={40} color="#10B981" />
            <Text className="text-textPrimary font-bold text-base mt-3">No Orders in this View</Text>
            <Text className="text-textMuted text-xs text-center mt-1">
              All platform operations are currently running smoothly.
            </Text>
          </View>
        ) : (
          displayedOrders.map((item) => {
            const { order } = item;
            const isDisputed = order.disputed || order.disputeStatus === 'OPEN';
            return (
              <Card key={order.id} className="p-4 mb-4" bordered>
                {/* Header Info */}
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-textPrimary font-black text-sm">{order.orderNumber}</Text>
                    <Text className="text-textMuted text-[10px]">
                      Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    {item.delayed && (
                      <View className="bg-amber-100 px-2 py-0.5 rounded-md mr-1.5 border border-amber-300">
                        <Text className="text-amber-800 text-[9px] font-extrabold">DELAYED</Text>
                      </View>
                    )}
                    <Badge
                      label={order.status}
                      variant={
                        order.status === 'DELIVERED'
                          ? 'success'
                          : order.status === 'CANCELLED'
                          ? 'error'
                          : 'warning'
                      }
                    />
                  </View>
                </View>

                {/* Delay Reason Alert */}
                {item.delayed && item.delayReason && (
                  <View className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 mb-3 flex-row items-center">
                    <Feather name="alert-triangle" size={14} color="#D97706" />
                    <Text className="text-amber-800 text-xs font-semibold ml-2 flex-1">
                      {item.delayReason}
                    </Text>
                  </View>
                )}

                {/* Dispute Alert Box */}
                {isDisputed && (
                  <View className="bg-red-50 p-3 rounded-xl border border-red-200 mb-3">
                    <View className="flex-row items-center mb-1">
                      <Feather name="alert-circle" size={14} color="#DC2626" />
                      <Text className="text-red-700 font-extrabold text-xs ml-1.5">OPEN DISPUTE REPORTED</Text>
                    </View>
                    <Text className="text-red-900 text-xs font-medium">Reason: {order.disputeReason || 'Customer reported issue'}</Text>
                    {order.adminNotes && (
                      <Text className="text-textMuted text-[10px] italic mt-1">Notes: {order.adminNotes}</Text>
                    )}
                  </View>
                )}

                {/* Stakeholder Details */}
                <View className="bg-gray-50 p-3 rounded-2xl mb-3">
                  <Text className="text-textSecondary text-xs mb-1">
                    <Text className="font-bold text-textPrimary">🛒 Customer:</Text> {item.customerName}{item.customerPhone ? ` (${item.customerPhone})` : ''}
                  </Text>
                  <Text className="text-textSecondary text-xs mb-1">
                    <Text className="font-bold text-textPrimary">👨‍🍳 Cook:</Text> {item.cookName}{item.cookPhone ? ` (${item.cookPhone})` : ''}
                  </Text>
                  <Text className="text-textSecondary text-xs mb-1">
                    <Text className="font-bold text-textPrimary">🛵 Rider:</Text> {item.riderName || 'Not Assigned'}{item.riderPhone ? ` (${item.riderPhone})` : ''}
                  </Text>
                  <Text className="text-textSecondary text-xs">
                    <Text className="font-bold text-textPrimary">💰 Amount:</Text> LKR {order.totalAmount?.toFixed(2)} ({order.deliveryMethod})
                  </Text>
                </View>

                {/* Quick Action Buttons */}
                <View className="pt-2 border-t border-gray-100">
                  <View className="flex-row mb-2">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedItem(item);
                        setReassignModalVisible(true);
                      }}
                      className="bg-gray-100 px-3 py-2 rounded-xl flex-row items-center border border-gray-200 mr-2"
                    >
                      <Feather name="user-check" size={12} color="#1A1A2E" />
                      <Text className="text-textPrimary text-xs font-bold ml-1.5">Reassign Rider</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleForceStatus(order.id, 'CANCELLED')}
                      className="bg-red-50 px-3 py-2 rounded-xl flex-row items-center border border-red-200"
                    >
                      <Feather name="x-circle" size={12} color="#DC2626" />
                      <Text className="text-red-600 text-xs font-bold ml-1.5">Force Cancel</Text>
                    </TouchableOpacity>
                  </View>

                  {isDisputed && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedItem(item);
                        setResolveModalVisible(true);
                      }}
                      className="bg-red-600 px-3 py-2 rounded-xl flex-row items-center justify-center w-full"
                    >
                      <Feather name="shield" size={12} color="white" />
                      <Text className="text-white text-xs font-bold ml-1.5">⚠️ Resolve Customer Dispute</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Modal 1: Reassign Rider */}
      <Modal visible={reassignModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-100">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-textPrimary font-black text-lg">Reassign Rider</Text>
              <TouchableOpacity onPress={() => setReassignModalVisible(false)}>
                <Feather name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textMuted text-xs mb-4">
              Select an available verified rider to manually take over delivery for Order #{selectedItem?.order?.orderNumber}
            </Text>

            <ScrollView className="max-h-60 mb-4">
              {(data?.availableRiders || []).length === 0 ? (
                <Text className="text-textMuted text-center py-4">No active verified riders available right now.</Text>
              ) : (
                data?.availableRiders.map((rider) => (
                  <TouchableOpacity
                    key={rider.id}
                    onPress={() => handleReassignRider(rider.id, rider.profile?.name || rider.email)}
                    className="bg-surface-elevated p-3.5 rounded-2xl mb-2 flex-row justify-between items-center border border-gray-200"
                  >
                    <View>
                      <Text className="text-textPrimary font-extrabold text-sm">{rider.profile?.name || rider.email}</Text>
                      <Text className="text-textMuted text-xs">{rider.profile?.phone || 'No phone'} • {rider.profile?.vehicleType || 'Bike'}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Button title="CLOSE" onPress={() => setReassignModalVisible(false)} variant="outline" className="w-full" />
          </View>
        </View>
      </Modal>

      {/* Modal 2: Resolve Dispute */}
      <Modal visible={resolveModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 border-t border-gray-100">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-textPrimary font-black text-lg">Resolve Dispute</Text>
              <TouchableOpacity onPress={() => setResolveModalVisible(false)}>
                <Feather name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-textMuted text-xs mb-4">
              Order #{selectedItem?.order?.orderNumber} — Customer Dispute: "{selectedItem?.order?.disputeReason}"
            </Text>

            {/* Action Choice Radio Options */}
            <Text className="text-textPrimary font-bold text-xs uppercase mb-2">Resolution Strategy</Text>
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setResolveAction('REFUND')}
                style={{ flex: 1, marginRight: 6 }}
                className={`p-3 rounded-xl border ${resolveAction === 'REFUND' ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`text-center font-bold text-xs ${resolveAction === 'REFUND' ? 'text-red-700' : 'text-textMuted'}`}>
                  Full Refund
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setResolveAction('FORCE_CANCEL')}
                style={{ flex: 1, marginRight: 6 }}
                className={`p-3 rounded-xl border ${resolveAction === 'FORCE_CANCEL' ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`text-center font-bold text-xs ${resolveAction === 'FORCE_CANCEL' ? 'text-amber-700' : 'text-textMuted'}`}>
                  Cancel Order
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setResolveAction('DISMISS')}
                style={{ flex: 1 }}
                className={`p-3 rounded-xl border ${resolveAction === 'DISMISS' ? 'bg-gray-200 border-gray-400' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`text-center font-bold text-xs ${resolveAction === 'DISMISS' ? 'text-textPrimary' : 'text-textMuted'}`}>
                  Dismiss Issue
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              label="ADMIN RESOLUTION NOTES"
              placeholder="Provide reason for resolution..."
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={2}
            />

            <View className="flex-row mt-4">
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button title="CANCEL" onPress={() => setResolveModalVisible(false)} variant="outline" className="w-full" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="CONFIRM" onPress={handleResolveDispute} loading={submitting} variant="primary" className="w-full" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
