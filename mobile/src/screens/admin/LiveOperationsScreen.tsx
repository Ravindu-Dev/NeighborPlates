import React, { useEffect, useState, useCallback } from 'react';
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
import { AdminHeader } from '../../components/admin/AdminHeader';

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

const ORDER_STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'primary' | 'neutral'> = {
  DELIVERED: 'success',
  CANCELLED: 'error',
  PLACING: 'neutral',
  PLACED: 'warning',
  ACCEPTED: 'warning',
  PREPARING: 'warning',
  READY: 'primary',
  DELIVERING: 'primary',
};

const formatOrderAge = (createdAt: string): string => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m ago`;
};

const RESOLVE_ACTION_INFO: Record<string, { label: string; description: string; color: string; bg: string; border: string }> = {
  REFUND: {
    label: 'Full Refund',
    description: 'Cancel order and mark for customer refund. Cook & rider earnings will not be settled.',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-400',
  },
  FORCE_CANCEL: {
    label: 'Force Cancel',
    description: 'Cancel order without refund. Use when order is already completed but disputed.',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
  },
  DISMISS: {
    label: 'Dismiss',
    description: 'Dismiss dispute as invalid. Order continues/stays as-is with no changes.',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-400',
  },
};

export const LiveOperationsScreen: React.FC = () => {
  const [data, setData] = useState<LiveOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'DELAYED' | 'DISPUTES'>('LIVE');

  const [selectedItem, setSelectedItem] = useState<OrderOperationalDetail | null>(null);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [resolveAction, setResolveAction] = useState<'REFUND' | 'FORCE_CANCEL' | 'DISMISS'>('REFUND');
  const [adminNotes, setAdminNotes] = useState('');
  const [notesError, setNotesError] = useState('');

  const fetchLiveOps = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/operations/live');
      setData(res.data);
    } catch (error) {
      // Don't show alert on background polls — only on manual refresh
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/admin/operations/live');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Failed to refresh operations data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveOps();
    const interval = setInterval(fetchLiveOps, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveOps]);

  const handleReassignRider = async (riderId: string, riderName: string) => {
    if (!selectedItem) return;
    Alert.alert(
      'Confirm Reassignment',
      `Assign ${riderName} to order #${selectedItem.order.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reassign',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.put(`/api/admin/orders/${selectedItem.order.id}/reassign-rider/${riderId}`);
              setReassignModalVisible(false);
              setSelectedItem(null);
              fetchLiveOps();
              Alert.alert('Done', `Order #${selectedItem.order.orderNumber} reassigned to ${riderName}.`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reassign rider.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleResolveDispute = async () => {
    if (!adminNotes.trim()) {
      setNotesError('Admin notes are required before resolving a dispute.');
      return;
    }
    setNotesError('');
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await api.post(`/api/admin/orders/${selectedItem.order.id}/resolve-dispute`, {
        action: resolveAction,
        adminNotes: adminNotes.trim(),
      });
      setResolveModalVisible(false);
      setSelectedItem(null);
      setAdminNotes('');
      setResolveAction('REFUND');
      fetchLiveOps();
      Alert.alert('Dispute Resolved', `Order #${selectedItem.order.orderNumber}: ${RESOLVE_ACTION_INFO[resolveAction].label} applied.`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resolve dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceStatus = (orderId: string, orderNumber: string, status: string) => {
    Alert.alert(
      'Force Status Override',
      `Are you sure you want to force order #${orderNumber} to "${status}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Change',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/api/admin/orders/${orderId}/force-status?status=${status}&adminNotes=Force override by admin`);
              fetchLiveOps();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to force status override.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-elevated">
        <AdminHeader title="Live Command Center" badge={{ text: 'REAL-TIME', color: 'green' }} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-textMuted text-sm mt-3 font-medium">Loading operations...</Text>
        </View>
      </View>
    );
  }

  const liveOrders = data?.liveOrders || [];
  const delayedOrders = liveOrders.filter((o) => o.delayed);
  const disputedOrders = liveOrders.filter(
    (o) => o.order.disputed === true || o.order.disputeStatus === 'OPEN'
  );

  const displayedOrders =
    activeTab === 'LIVE' ? liveOrders : activeTab === 'DELAYED' ? delayedOrders : disputedOrders;

  const tabConfig = [
    { id: 'LIVE' as const, label: 'All Live', count: liveOrders.length, activeColor: 'text-textPrimary' },
    { id: 'DELAYED' as const, label: 'Delayed', count: delayedOrders.length, activeColor: 'text-amber-600' },
    { id: 'DISPUTES' as const, label: 'Disputes', count: disputedOrders.length, activeColor: 'text-red-600' },
  ];

  return (
    <View className="flex-1 bg-surface-elevated">
      <AdminHeader
        title="Live Command Center"
        badge={{ text: 'REAL-TIME', color: 'green' }}
      />

      {/* KPI Stats */}
      <View className="px-4 pt-3 pb-1">
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 items-center"
            onPress={() => setActiveTab('LIVE')}
            activeOpacity={0.8}
          >
            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mb-1">
              <Feather name="activity" size={14} color="#FF6B35" />
            </View>
            <Text className="text-primary text-xl font-black">{data?.activeOrdersCount ?? 0}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase mt-0.5">Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-3 border border-amber-100 items-center"
            onPress={() => setActiveTab('DELAYED')}
            activeOpacity={0.8}
          >
            <View className="w-8 h-8 rounded-full bg-amber-50 items-center justify-center mb-1">
              <Feather name="clock" size={14} color="#D97706" />
            </View>
            <Text className="text-amber-600 text-xl font-black">{data?.delayedOrdersCount ?? 0}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase mt-0.5">Delayed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white rounded-2xl p-3 border border-red-100 items-center"
            onPress={() => setActiveTab('DISPUTES')}
            activeOpacity={0.8}
          >
            <View className="w-8 h-8 rounded-full bg-red-50 items-center justify-center mb-1">
              <Feather name="alert-circle" size={14} color="#DC2626" />
            </View>
            <Text className="text-red-600 text-xl font-black">{data?.openDisputesCount ?? 0}</Text>
            <Text className="text-textMuted text-[9px] font-bold uppercase mt-0.5">Disputes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tabs */}
      <View className="px-4 pt-3 pb-1">
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          {tabConfig.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 items-center rounded-lg ${activeTab === tab.id ? 'bg-white shadow-sm' : ''}`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-bold ${activeTab === tab.id ? tab.activeColor : 'text-textMuted'}`}
              >
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
      >
        {displayedOrders.length === 0 ? (
          <View className="py-16 items-center">
            <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4">
              <Feather name="check-circle" size={28} color="#10B981" />
            </View>
            <Text className="text-textPrimary font-bold text-base">
              {activeTab === 'LIVE'
                ? 'No Active Orders'
                : activeTab === 'DELAYED'
                ? 'No Delayed Orders'
                : 'No Open Disputes'}
            </Text>
            <Text className="text-textMuted text-xs text-center mt-1 px-8">
              {activeTab === 'LIVE'
                ? 'All quiet on the operations front.'
                : activeTab === 'DELAYED'
                ? 'All orders are on schedule.'
                : 'No disputes require your attention.'}
            </Text>
          </View>
        ) : (
          displayedOrders.map((item) => {
            const { order } = item;
            const isDisputed = order.disputed || order.disputeStatus === 'OPEN';
            const statusVariant = ORDER_STATUS_COLORS[order.status] || 'neutral';

            return (
              <Card key={order.id} className="mb-3 overflow-hidden" bordered>
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="text-textPrimary font-black text-sm">{order.orderNumber}</Text>
                    <Text className="text-textMuted text-[11px] mt-0.5">
                      {formatOrderAge(order.createdAt)} · {order.deliveryMethod}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {item.delayed && (
                      <View className="bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        <Text className="text-amber-800 text-[9px] font-extrabold uppercase">Delayed</Text>
                      </View>
                    )}
                    <Badge label={order.status} variant={statusVariant} />
                  </View>
                </View>

                {/* Delay Reason */}
                {item.delayed && item.delayReason && (
                  <View className="bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 mb-3 flex-row items-center">
                    <Feather name="alert-triangle" size={13} color="#D97706" />
                    <Text className="text-amber-800 text-xs font-semibold ml-2 flex-1">
                      {item.delayReason}
                    </Text>
                  </View>
                )}

                {/* Dispute Alert */}
                {isDisputed && (
                  <View className="bg-red-50 px-3 py-2.5 rounded-xl border border-red-200 mb-3">
                    <View className="flex-row items-center mb-1">
                      <Feather name="alert-circle" size={13} color="#DC2626" />
                      <Text className="text-red-700 font-extrabold text-xs ml-1.5 uppercase tracking-wider">
                        Open Dispute
                      </Text>
                      {order.disputeStatus && (
                        <View className="ml-auto bg-red-100 px-2 py-0.5 rounded-full">
                          <Text className="text-red-800 text-[9px] font-bold">{order.disputeStatus}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-red-900 text-xs font-medium leading-relaxed">
                      {order.disputeReason || 'Customer reported an issue with this order.'}
                    </Text>
                    {order.adminNotes && (
                      <Text className="text-textMuted text-[10px] italic mt-1.5 border-t border-red-100 pt-1.5">
                        Admin Note: {order.adminNotes}
                      </Text>
                    )}
                  </View>
                )}

                {/* Stakeholders */}
                <View className="bg-gray-50 rounded-2xl px-3 py-2.5 mb-3">
                  <View className="flex-row items-center mb-1.5">
                    <Feather name="shopping-bag" size={12} color="#6B7280" />
                    <Text className="text-textSecondary text-xs ml-2">
                      <Text className="font-bold text-textPrimary">Customer: </Text>
                      {item.customerName}
                      {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1.5">
                    <Feather name="user" size={12} color="#6B7280" />
                    <Text className="text-textSecondary text-xs ml-2">
                      <Text className="font-bold text-textPrimary">Cook: </Text>
                      {item.cookName}
                      {item.cookPhone ? ` · ${item.cookPhone}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1.5">
                    <Feather name="truck" size={12} color="#6B7280" />
                    <Text className="text-textSecondary text-xs ml-2">
                      <Text className="font-bold text-textPrimary">Rider: </Text>
                      {item.riderName || 'Unassigned'}
                      {item.riderPhone ? ` · ${item.riderPhone}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center border-t border-gray-200 pt-1.5 mt-0.5">
                    <Feather name="dollar-sign" size={12} color="#6B7280" />
                    <Text className="text-textSecondary text-xs ml-2">
                      <Text className="font-bold text-textPrimary">Amount: </Text>
                      LKR {order.totalAmount?.toFixed(2)}
                      {order.platformFee ? ` (Fee: LKR ${order.platformFee?.toFixed(2)})` : ''}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedItem(item);
                      setReassignModalVisible(true);
                    }}
                    className="flex-1 bg-gray-50 py-2.5 rounded-xl flex-row items-center justify-center border border-gray-200"
                    activeOpacity={0.7}
                  >
                    <Feather name="user-check" size={13} color="#1A1A2E" />
                    <Text className="text-textPrimary text-xs font-bold ml-1.5">Reassign Rider</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleForceStatus(order.id, order.orderNumber, 'CANCELLED')}
                    className="flex-1 bg-red-50 py-2.5 rounded-xl flex-row items-center justify-center border border-red-200"
                    activeOpacity={0.7}
                  >
                    <Feather name="x-circle" size={13} color="#DC2626" />
                    <Text className="text-red-600 text-xs font-bold ml-1.5">Force Cancel</Text>
                  </TouchableOpacity>
                </View>

                {isDisputed && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedItem(item);
                      setAdminNotes('');
                      setNotesError('');
                      setResolveAction('REFUND');
                      setResolveModalVisible(true);
                    }}
                    className="mt-2 bg-red-600 py-2.5 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                  >
                    <Feather name="shield" size={13} color="white" />
                    <Text className="text-white text-xs font-bold ml-2">Resolve Dispute</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Reassign Rider Modal */}
      <Modal visible={reassignModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl pt-5 pb-8 border-t border-gray-100" style={{ maxHeight: '75%' }}>
            <View className="flex-row justify-between items-center px-5 mb-2">
              <View>
                <Text className="text-textPrimary font-black text-lg">Reassign Rider</Text>
                <Text className="text-textMuted text-xs mt-0.5">
                  Order #{selectedItem?.order?.orderNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReassignModalVisible(false)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedItem?.riderName && (
              <View className="mx-5 mb-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex-row items-center">
                <Feather name="info" size={12} color="#D97706" />
                <Text className="text-amber-800 text-xs ml-2">
                  Current rider: <Text className="font-bold">{selectedItem.riderName}</Text>
                </Text>
              </View>
            )}

            <Text className="text-textSecondary text-xs px-5 mb-3">
              Select an available rider to take over this delivery:
            </Text>

            <FlatList
              data={data?.availableRiders || []}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={
                <View className="py-8 items-center">
                  <Feather name="user-x" size={32} color="#9CA3AF" />
                  <Text className="text-textMuted text-sm mt-3 text-center">
                    No active riders available right now.
                  </Text>
                </View>
              }
              renderItem={({ item: rider }) => (
                <TouchableOpacity
                  onPress={() => handleReassignRider(rider.id, rider.profile?.name || rider.email)}
                  className="bg-gray-50 p-3.5 rounded-2xl mb-2 flex-row justify-between items-center border border-gray-200"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
                      <Text className="text-primary font-black text-sm">
                        {(rider.profile?.name || rider.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-textPrimary font-extrabold text-sm">
                        {rider.profile?.name || rider.email}
                      </Text>
                      <Text className="text-textMuted text-xs">
                        {rider.profile?.vehicleType || 'Vehicle N/A'}
                        {rider.profile?.phone ? ` · ${rider.profile.phone}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className={`px-2 py-0.5 rounded-full ${rider.profile?.isAvailable ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <Text className={`text-[9px] font-bold ${rider.profile?.isAvailable ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {rider.profile?.isAvailable ? 'ONLINE' : 'OFFLINE'}
                      </Text>
                    </View>
                    {rider.profile?.riderVerified && (
                      <Text className="text-[9px] text-emerald-600 font-bold mt-0.5">✓ VERIFIED</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />

            <View className="px-5 mt-2">
              <Button title="CLOSE" onPress={() => setReassignModalVisible(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Resolve Dispute Modal */}
      <Modal visible={resolveModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl pt-5 pb-8 border-t border-gray-100">
            <View className="flex-row justify-between items-center px-5 mb-4">
              <View>
                <Text className="text-textPrimary font-black text-lg">Resolve Dispute</Text>
                <Text className="text-textMuted text-xs mt-0.5">
                  Order #{selectedItem?.order?.orderNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setResolveModalVisible(false);
                  setAdminNotes('');
                  setNotesError('');
                }}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedItem?.order?.disputeReason && (
              <View className="mx-5 mb-4 bg-red-50 p-3 rounded-xl border border-red-200">
                <Text className="text-red-700 font-bold text-xs mb-0.5">Customer Dispute Reason:</Text>
                <Text className="text-red-900 text-xs leading-relaxed">
                  {selectedItem.order.disputeReason}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              <Text className="text-textPrimary font-bold text-xs uppercase mb-2 tracking-wider">
                Resolution Action
              </Text>

              <View className="gap-2 mb-4">
                {(['REFUND', 'FORCE_CANCEL', 'DISMISS'] as const).map((action) => {
                  const info = RESOLVE_ACTION_INFO[action];
                  const selected = resolveAction === action;
                  return (
                    <TouchableOpacity
                      key={action}
                      onPress={() => setResolveAction(action)}
                      className={`p-3 rounded-xl border-2 ${selected ? `${info.bg} ${info.border}` : 'bg-gray-50 border-gray-200'}`}
                      activeOpacity={0.8}
                    >
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className={`font-bold text-sm ${selected ? info.color : 'text-textSecondary'}`}>
                          {info.label}
                        </Text>
                        {selected && (
                          <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                            <Feather name="check" size={11} color="white" />
                          </View>
                        )}
                      </View>
                      <Text className={`text-xs leading-relaxed ${selected ? info.color : 'text-textMuted'}`}>
                        {info.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                label="ADMIN RESOLUTION NOTES (Required)"
                placeholder="Describe the reason for your resolution decision..."
                value={adminNotes}
                onChangeText={(t) => {
                  setAdminNotes(t);
                  if (t.trim()) setNotesError('');
                }}
                multiline
                numberOfLines={3}
                error={notesError}
              />

              <View className="flex-row gap-3 mt-2">
                <View style={{ flex: 1 }}>
                  <Button
                    title="CANCEL"
                    onPress={() => {
                      setResolveModalVisible(false);
                      setAdminNotes('');
                      setNotesError('');
                    }}
                    variant="outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="CONFIRM RESOLUTION"
                    onPress={handleResolveDispute}
                    loading={submitting}
                    variant="primary"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
