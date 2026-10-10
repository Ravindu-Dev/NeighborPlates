import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAiChatStore, ChatMessage } from '../../store/aiChatStore';
import { AiCardRenderer } from './AiCardRenderer';

interface AiChatWidgetProps {
  onNavigateMeal?: (mealId: string) => void;
  onNavigateOrder?: (orderId: string) => void;
}

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({
  onNavigateMeal,
  onNavigateOrder,
}) => {
  const {
    isOpen,
    isLoading,
    unreadCount,
    messages,
    suggestedPrompts,
    toggleOpen,
    closeChat,
    sendMessage,
    clearChat,
  } = useAiChatStore();

  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for floating AI trigger button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    setInputText('');
    await sendMessage(text);
  };

  return (
    <>
      {/* FLOATING ACTION TRIGGER BUTTON */}
      {!isOpen && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 80,
            right: 18,
            zIndex: 9999,
            transform: [{ scale: pulseAnim }],
          }}
        >
          <TouchableOpacity
            onPress={toggleOpen}
            activeOpacity={0.9}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF6B35',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 30,
              shadowColor: '#FF6B35',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View style={{ position: 'relative' }}>
              <Feather name="message-square" size={20} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#FF6B35',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 8 }}>
              Ask Platie
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FULL CHAT MODAL SHEET */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeChat}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View
              style={{
                height: '85%',
                backgroundColor: '#F9FAFB',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: 'hidden',
              }}
            >
              {/* MODAL HEADER */}
              <View
                style={{
                  backgroundColor: '#1F2937',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FF6B35',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Feather name="cpu" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                        Platie AI Assistant
                      </Text>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#10B981',
                          marginLeft: 8,
                        }}
                      />
                    </View>
                    <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                      Live Database Assistant (LKR)
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={clearChat}
                    style={{ padding: 8, marginRight: 4 }}
                  >
                    <Feather name="rotate-ccw" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeChat} style={{ padding: 8 }}>
                    <Feather name="x" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* MESSAGES LIST */}
              <ScrollView
                ref={scrollViewRef}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
                contentContainerStyle={{ paddingBottom: 20 }}
              >

                {messages.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      marginBottom: 16,
                      alignItems: item.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <View
                      style={{
                        maxWidth: '85%',
                        backgroundColor: item.sender === 'user' ? '#FF6B35' : '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        borderTopRightRadius: item.sender === 'user' ? 4 : 18,
                        borderTopLeftRadius: item.sender === 'ai' ? 4 : 18,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                        borderWidth: item.sender === 'ai' ? 1 : 0,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          color: item.sender === 'user' ? '#FFFFFF' : '#1F2937',
                        }}
                      >
                        {item.text}
                      </Text>

                      <Text
                        style={{
                          fontSize: 10,
                          color: item.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                          alignSelf: 'flex-end',
                          marginTop: 4,
                        }}
                      >
                        {item.timestamp}
                      </Text>
                    </View>

                    {/* RICH CARDS SLIDER FOR AI MESSAGES */}
                    {item.sender === 'ai' && item.cards && item.cards.length > 0 && (
                      <AiCardRenderer
                        cards={item.cards}
                        onNavigateMeal={(mealId) => {
                          closeChat();
                          if (onNavigateMeal) onNavigateMeal(mealId);
                        }}
                        onNavigateOrder={(orderId) => {
                          closeChat();
                          if (onNavigateOrder) onNavigateOrder(orderId);
                        }}
                      />
                    )}
                  </View>
                ))}

                {/* TYPING INDICATOR */}
                {isLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 18,
                        borderTopLeftRadius: 4,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <ActivityIndicator size="small" color="#FF6B35" />
                      <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 8 }}>
                        Searching database & shops...
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* QUICK SUGGESTION CHIPS */}
              <View style={{ backgroundColor: '#FFFFFF', paddingTop: 8 }}>
                <ScrollView
                  horizontal
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >

                  {suggestedPrompts.map((prompt, index) => (
                    <TouchableOpacity
                      key={`prompt-${index}`}
                      onPress={() => handleSend(prompt)}
                      style={{
                        backgroundColor: '#FFF7ED',
                        borderColor: '#FFEDD5',
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#C2410C', fontWeight: '600' }}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* INPUT BAR */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F3F4F6',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask Platie about food, shops, rice..."
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937',
                    maxHeight: 100,
                  }}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                />

                <TouchableOpacity
                  onPress={() => handleSend()}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: inputText.trim() && !isLoading ? '#FF6B35' : '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 10,
                  }}
                >
                  <Feather
                    name="send"
                    size={18}
                    color={inputText.trim() && !isLoading ? '#FFFFFF' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};
