package com.nexacrm.dto;

import com.nexacrm.model.Notification;
import lombok.*;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private Notification.NotificationType type;
    private Boolean isRead;
    private String actionUrl;
    private String entityType;
    private Long entityId;
    private LocalDateTime createdAt;
}
