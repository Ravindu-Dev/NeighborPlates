import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../screens/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { CookNavigator } from './CookNavigator';
import { AdminNavigator } from './AdminNavigator';
import { RiderNavigator } from './RiderNavigator';

const SPLASH_DURATION_MS = 2200; // Display logo for ~2.2 seconds

export const AppNavigator = () => {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        await Promise.all([
          checkAuth(),
          new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION_MS)),
        ]);
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

  if (isSplashLoading || isLoading) {
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
