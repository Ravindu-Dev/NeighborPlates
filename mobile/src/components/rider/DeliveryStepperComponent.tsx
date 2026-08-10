import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

interface DeliveryStepperProps {
  status: 'ACCEPTED' | 'DELIVERING' | 'DELIVERED' | string;
}

export const DeliveryStepperComponent: React.FC<DeliveryStepperProps> = ({ status }) => {
  // 0 = ACCEPTED, 0.5 = DELIVERING, 1 = DELIVERED
  const progress = useSharedValue(0);

  // For the pulse animation on the active step
  const activePulse = useSharedValue(1);

  useEffect(() => {
    // Update progress based on status
    if (status === 'ACCEPTED') progress.value = withTiming(0, { duration: 500 });
    else if (status === 'DELIVERING') progress.value = withTiming(0.5, { duration: 500 });
    else if (status === 'DELIVERED') progress.value = withTiming(1, { duration: 700 });

    // Start pulsing animation
    activePulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1, // infinite
      true // reverse
    );
  }, [status]);

  const lineStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
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

    const pulseStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: isActive ? activePulse.value : 1 }]
      };
    });

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
      bgColor = 'bg-indigo-500';
      borderColor = 'border-indigo-500';
      iconColor = '#FFFFFF';
      textColor = 'text-indigo-600 font-bold';
    }

    return (
      <View className="items-center flex-1">
        <Animated.View 
          className={`w-10 h-10 rounded-full border-2 items-center justify-center bg-white z-10 ${borderColor} ${bgColor}`}
          style={pulseStyle}
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
             className="h-full bg-indigo-500" 
             style={lineStyle} 
           />
        </View>

        <StepCircle index={0} iconName="package" label="Accepted" />
        <StepCircle index={1} iconName="truck" label="Picked Up" />
        <StepCircle index={2} iconName="check-circle" label="Delivered" />
      </View>
    </View>
  );
};
