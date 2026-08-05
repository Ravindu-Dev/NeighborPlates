import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn("react-native-webview not loaded", e);
  }
}

interface Kitchen {
  id: string;
  kitchenName: string;
  cuisine: string;
  rating: number;
  lat: number;
  lng: number;
}

interface KitchenDiscoveryMapProps {
  cooks: Kitchen[];
  onSelectCook: (cookId: string, kitchenName: string) => void;
  customerLat?: number;
  customerLon?: number;
}

export const KitchenDiscoveryMap: React.FC<KitchenDiscoveryMapProps> = ({ 
  cooks, 
  onSelectCook,
  customerLat = 7.8731,
  customerLon = 80.7718
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NeighborPlates Discovery Map</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #F3F4F6;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .popup-container {
          padding: 6px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          min-width: 140px;
        }
        .popup-title {
          font-weight: 800;
          font-size: 13px;
          color: #1A1A2E;
          margin-bottom: 2px;
        }
        .popup-sub {
          font-size: 10px;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .popup-btn {
          display: block;
          background-color: #FF6B35;
          color: white;
          text-align: center;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 10px;
          text-decoration: none;
          box-shadow: 0 4px 6px -1px rgba(255, 107, 53, 0.2);
          transition: background-color 0.2s ease;
        }
        .popup-btn:hover {
          background-color: #E05621;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Set map centered on customer coordinates
        var map = L.map('map', { zoomControl: false }).setView([${customerLat}, ${customerLon}], 8);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Inject active kitchen locations
        var cooksList = ${JSON.stringify(cooks)};
        cooksList.forEach(function(cook) {
          if (cook.lat && cook.lng) {
            var marker = L.marker([cook.lat, cook.lng], {
              icon: L.divIcon({
                html: '<div style="background-color: #FF6B35; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(255, 107, 53, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">🍳</div>',
                className: 'cook-marker',
                iconSize: [22, 22]
              })
            }).addTo(map);

            var popupHtml = '<div class="popup-container">' +
                            '  <div class="popup-title">' + cook.kitchenName + '</div>' +
                            '  <div class="popup-sub">⭐ ' + cook.rating + ' • ' + cook.cuisine + '</div>' +
                            '  <a href="javascript:void(0);" onclick="triggerSelection(\\'' + cook.id + '\\', \\'' + cook.kitchenName.replace(/'/g, "\\'") + '\\')" class="popup-btn">VIEW MENU</a>' +
                            '</div>';
            
            marker.bindPopup(popupHtml);
          }
        });

        function triggerSelection(id, name) {
          var payload = JSON.stringify({ type: 'selectCook', id: id, name: name });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(payload);
          } else {
            window.parent.postMessage(payload, '*');
          }
        }
      </script>
    </body>
    </html>
  `;

  // Listen to message sent from Leaflet inside Web preview
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        let data;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch (e) {
          return;
        }
        if (data && data.type === 'selectCook') {
          onSelectCook(data.id, data.name);
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [onSelectCook]);

  const handleNativeMessage = (event: any) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (data && data.type === 'selectCook') {
      onSelectCook(data.id, data.name);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={htmlContent}
        style={{ width: '100%', height: '100%', border: 'none', minHeight: 350 }}
        title="NeighborPlates Discovery Map"
      />
    );
  }

  if (WebView) {
    return (
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1 }}
        onMessage={handleNativeMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    );
  }

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text className="text-textSecondary font-bold text-center">WebView not available</Text>
    </View>
  );
};
