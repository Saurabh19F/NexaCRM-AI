package com.nexacrm.model;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification extends BaseEntity {

    @DBRef(lazy = true)
    @Field("user")
    private User user;

    @Field("title")
    private String title;

    @Field("message")
    private String message;

    @Field("type")
    private NotificationType type;

    @Field("is_read")
    private Boolean isRead = false;

    @Field("action_url")
    private String actionUrl;

    @Field("entity_type")
    private String entityType;

    @Field("entity_id")
    private String entityId;

    public enum NotificationType { LEAD, DEAL, TASK, INVOICE, AI, SYSTEM, AUTOMATION }
}
