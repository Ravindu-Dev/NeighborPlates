package com.neighborplates.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class FirebaseNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseNotificationService.class);

    public void updateOrderTrackingStatus(String orderId, String status) {
        logger.info("Real-Time status update trigger: OrderId={}, Status={}", orderId, status);

        if (FirebaseApp.getApps().isEmpty()) {
            logger.info("Firebase is not initialized. Skipping real-time database write.");
            return;
        }

        try {
            DatabaseReference ref = FirebaseDatabase.getInstance().getReference("orders").child(orderId);
            Map<String, Object> updates = new HashMap<>();
            updates.put("status", status);
            updates.put("lastUpdated", Instant.now().toEpochMilli());
            
            ref.setValueAsync(updates);
            logger.info("Firebase database updated for Order: {}", orderId);
        } catch (Exception e) {
            logger.error("Error writing to Firebase Realtime Database: {}", e.getMessage());
        }
    }

    public void sendPushNotification(String userToken, String title, String body) {
        logger.info("Triggering Push Notification: Title='{}', Body='{}' to Token={}", title, body, userToken);

        if (FirebaseApp.getApps().isEmpty()) {
            logger.info("Firebase is not initialized. Skipping push notification dispatch.");
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(userToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            FirebaseMessaging.getInstance().sendAsync(message);
            logger.info("FCM Notification sent successfully to: {}", userToken);
        } catch (Exception e) {
            logger.error("Error dispatching FCM message: {}", e.getMessage());
        }
    }
}
