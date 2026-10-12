import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../screens/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { CookNavigator } from './CookNavigator';
import { AdminNavigator } from './AdminNavigator';
import { RiderNavigator } from './RiderNavigator';

const SPLASH_DURATION_MS = 1000; // Snappy 1-second splash display

export const AppNavigator = () => {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        const minSplashTime = new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION_MS));
        await Promise.race([
          Promise.all([checkAuth(), minSplashTime]),
          new Promise((resolve) => setTimeout(resolve, 3000)), // 3s hard safety fallback
        ]);
      } catch (err) {
        console.error('App initialization error:', err);
      } finally {
        if (isMounted) {
          setIsSplashLoading(false);
        }
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isSplashLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated || !user ? (
        <AuthNavigator />
      ) : user.role === 'CUSTOMER' ? (
        <CustomerNavigator />
      ) : user.role === 'COOK' ? (
        <CookNavigator />
      ) : user.role === 'RIDER' ? (
        <RiderNavigator />
      ) : (
        <AdminNavigator />
      )}
    </NavigationContainer>
  );
};
