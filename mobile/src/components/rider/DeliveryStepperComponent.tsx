import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DeliveryStepperProps {
  status: 'ACCEPTED' | 'DELIVERING' | 'DELIVERED' | string;
}

export const DeliveryStepperComponent: React.FC<DeliveryStepperProps> = ({ status }) => {
  // 0 = ACCEPTED, 0.5 = DELIVERING, 1 = DELIVERED
  const progress = useRef(new Animated.Value(0)).current;

  // For the pulse animation on the active step
  const activePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Update progress based on status
    let toValue = 0;
    if (status === 'DELIVERING') toValue = 0.5;
    else if (status === 'DELIVERED') toValue = 1;

    Animated.timing(progress, {
      toValue,
      duration: 600,
      useNativeDriver: false, // width interpolation
    }).start();

    // Start pulsing animation
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(activePulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();

    return () => pulseAnim.stop();
  }, [status]);

  const lineWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getStepState = (stepIndex: number) => {
    let currentStep = 0;
    if (status === 'DELIVERING') currentStep = 1;
    if (status === 'DELIVERED') currentStep = 2;

    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return 'pending';
  };

  const StepCircle = ({ index, iconName, label }: { index: number, iconName: any, label: string }) => {
    const state = getStepState(index);
    const isCompleted = state === 'completed';
    const isActive = state === 'active';

    let bgColor = 'bg-gray-200';
    let borderColor = 'border-gray-200';
    let iconColor = '#9CA3AF';
    let textColor = 'text-textMuted font-medium';

    if (isCompleted) {
      bgColor = 'bg-green-500';
      borderColor = 'border-green-500';
      iconColor = '#FFFFFF';
      iconName = 'check';
      textColor = 'text-green-600 font-bold';
    } else if (isActive) {
      bgColor = 'bg-[#9A3412]';
      borderColor = 'border-[#9A3412]';
      iconColor = '#FFFFFF';
      iconName = iconName;
      textColor = 'text-[#9A3412] font-bold';
    }

    return (
      <View className="items-center flex-1">
        <Animated.View 
          className={`w-10 h-10 rounded-full border-2 items-center justify-center bg-white z-10 ${borderColor} ${bgColor}`}
          style={isActive ? { transform: [{ scale: activePulse }] } : undefined}
        >
          <Feather name={iconName} size={18} color={iconColor} />
        </Animated.View>
        <Text className={`text-xs mt-2 text-center ${textColor}`}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <View className="w-full py-4">
      <View className="flex-row items-center justify-between relative px-6">
        {/* Background Line */}
        <View className="absolute top-5 left-10 right-10 h-1 bg-gray-200 rounded-full" />
        
        {/* Animated Progress Line */}
        <View className="absolute top-5 left-10 right-10 h-1 bg-transparent rounded-full overflow-hidden">
           <Animated.View 
             className="h-full bg-[#9A3412]" 
             style={{ width: lineWidth }} 
           />
        </View>

        <StepCircle index={0} iconName="package" label="Accepted" />
        <StepCircle index={1} iconName="truck" label="Picked Up" />
        <StepCircle index={2} iconName="check-circle" label="Delivered" />
      </View>
    </View>
  );
};

