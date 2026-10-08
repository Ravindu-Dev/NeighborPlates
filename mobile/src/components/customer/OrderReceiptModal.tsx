import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../common/Button';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not loaded', e);
  }
}

interface OrderReceiptModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
}

export const generateReceiptHtml = (order: any) => {
  if (!order) return '';

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const itemsList = (order.items || [])
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; font-weight: 600; color: #1A1A2E;">
        ${item.name || 'Meal Item'}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; text-align: center; color: #6B7280;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; text-align: right; color: #6B7280;">
        LKR ${(item.price || 0).toLocaleString()}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; font-weight: 700; text-align: right; color: #1A1A2E;">
        LKR ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join('');

  const subtotal = (order.items || []).reduce(
    (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const platformFee = order.platformFee || 0;
  const deliveryFee = subtotal > 0 ? (order.totalAmount - subtotal - platformFee) : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt #${order.orderNumber || order.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 24px;
          background-color: #FFFFFF;
          color: #1A1A2E;
        }
        .receipt-container {
          max-width: 600px;
          margin: 0 auto;
          background: #FFFFFF;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #F3F4F6;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 800;
          color: #FF6B35;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #6B7280;
          font-weight: 600;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .receipt-tag {
          background-color: #FFF0EB;
          color: #FF6B35;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background-color: #F8F9FA;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .info-item {
          font-size: 12px;
        }
        .info-label {
          color: #9CA3AF;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          color: #1A1A2E;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th {
          font-size: 10px;
          font-weight: 800;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 10px;
          border-bottom: 1px solid #E5E7EB;
          text-align: left;
        }
        th.text-center { text-align: center; }
        th.text-right { text-align: right; }
        .summary-section {
          border-top: 2px dashed #E5E7EB;
          padding-top: 16px;
          margin-bottom: 24px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          color: #6B7280;
        }
        .summary-row.total {
          font-size: 16px;
          font-weight: 800;
          color: #1A1A2E;
          border-top: 1px solid #F3F4F6;
          padding-top: 12px;
          margin-top: 8px;
        }
        .total-amount {
          color: #FF6B35;
          font-weight: 900;
        }
        .footer {
          text-align: center;
          border-top: 1px solid #F3F4F6;
          padding-top: 20px;
          margin-top: 24px;
        }
        .footer-text {
          font-size: 12px;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .footer-sub {
          font-size: 10px;
          color: #9CA3AF;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div>
            <h1 class="brand-title">NeighborPlates</h1>
            <div class="brand-subtitle">Official Order Receipt</div>
          </div>
          <div class="receipt-tag">PAID RECEIPT</div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Order Number</div>
            <div class="info-value">#${order.orderNumber || order.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date & Time</div>
            <div class="info-value">${orderDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Cook Kitchen</div>
            <div class="info-value">${order.cookName || 'Home Kitchen'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Status</div>
            <div class="info-value" style="color: #2D6A4F;">COMPLETED</div>
          </div>
          ${
            order.paymentTransactionId
              ? `
          <div class="info-item" style="grid-column: span 2;">
            <div class="info-label">Transaction ID</div>
            <div class="info-value" style="font-family: monospace; font-size: 11px;">${order.paymentTransactionId}</div>
          </div>
          `
              : ''
          }
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>LKR ${subtotal.toLocaleString()}</span>
          </div>
          ${
            deliveryFee > 0
              ? `
          <div class="summary-row">
            <span>Delivery Fee</span>
            <span>LKR ${deliveryFee.toLocaleString()}</span>
          </div>
          `
              : ''
          }
          ${
            platformFee > 0
              ? `
          <div class="summary-row">
            <span>Platform Service Fee</span>
            <span>LKR ${platformFee.toLocaleString()}</span>
          </div>
          `
              : ''
          }
          <div class="summary-row total">
            <span>Total Amount Paid</span>
            <span class="total-amount">LKR ${(order.totalAmount || subtotal).toLocaleString()}</span>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text">Thank you for ordering with NeighborPlates! 🍲</div>
          <div class="footer-sub">Supporting local home cooks & authentic homemade food in your neighborhood.</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({ visible, order, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!order) return null;

  const htmlContent = generateReceiptHtml(order);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
        } else {
          Alert.alert('Download Receipt', 'Pop-up blocked. Please allow pop-ups to print or download receipt.');
        }
      } else {
        const expoPrint = require('expo-print');
        const expoSharing = require('expo-sharing');

        const { uri } = await expoPrint.printToFileAsync({
          html: htmlContent,
        });

        if (await expoSharing.isAvailableAsync()) {
          await expoSharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `Receipt_${order.orderNumber || 'order'}`,
          });
        } else {
          Alert.alert('PDF Saved', `Receipt saved to: ${uri}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate or share PDF receipt:', err);
      Alert.alert('Error', err.message || 'Could not generate PDF receipt.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-6 border-t border-gray-100 max-h-[90%]">
          {/* Pull indicator */}
          <View className="items-center pt-1 pb-3">
            <View className="w-12 h-1.5 rounded-full bg-gray-200" />
          </View>

          {/* Header */}
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
            <View>
              <Text className="text-textPrimary font-black text-lg">Order Receipt</Text>
              <Text className="text-textMuted text-xs font-bold mt-0.5">
                #{order.orderNumber || order.id.slice(-6).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center border border-gray-150"
            >
              <Feather name="x" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Receipt Preview */}
          <View className="h-[380px] bg-surface-elevated rounded-2xl overflow-hidden border border-gray-150 mb-5">
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={htmlContent}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Order Receipt Preview"
              />
            ) : WebView ? (
              <WebView originWhitelist={['*']} source={{ html: htmlContent }} style={{ flex: 1 }} />
            ) : (
              <View className="flex-1 justify-center items-center p-4">
                <Text className="text-textMuted text-xs text-center">Receipt preview available for download below</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 pt-1">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gray-100 border border-gray-200 flex-row items-center justify-center gap-2 active:bg-gray-200"
              activeOpacity={0.7}
            >
              <Feather name="x" size={15} color="#6B7280" />
              <Text className="text-textSecondary font-black text-xs uppercase tracking-wider">Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownloadPdf}
              disabled={downloading}
              className="flex-[2] py-3.5 px-4 rounded-2xl bg-primary border border-primary flex-row items-center justify-center gap-2 shadow-sm active:opacity-85"
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" className="mr-1" />
              ) : (
                <Feather name="download" size={15} color="#FFFFFF" />
              )}
              <Text className="text-white font-black text-xs uppercase tracking-wider">
                {downloading ? 'Preparing PDF...' : 'Download PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
