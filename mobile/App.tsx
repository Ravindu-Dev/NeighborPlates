import "./global.css";
import React from 'react';
import { Dimensions, Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

const fallbackMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: {
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
};

const defaultMetrics = initialWindowMetrics ?? fallbackMetrics;

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={defaultMetrics} style={{ flex: 1 }}>
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
