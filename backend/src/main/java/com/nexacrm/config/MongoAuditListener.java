package com.nexacrm.config;

import com.nexacrm.model.AuditLog;
import com.nexacrm.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.AfterDeleteEvent;
import org.springframework.data.mongodb.core.mapping.event.AfterSaveEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeSaveEvent;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class MongoAuditListener extends AbstractMongoEventListener<Object> {

    private static final String AUDIT_COLLECTION = "audit_logs";
    private final MongoTemplate mongoTemplate;
    private final Map<String, Document> previousDocuments = new ConcurrentHashMap<>();

    @Override
    public void onBeforeSave(BeforeSaveEvent<Object> event) {
        if (shouldSkip(event.getSource(), event.getCollectionName())) {
            return;
        }

        Object id = readProperty(event.getSource(), "id");
        if (id == null) {
            return;
        }

        Document previous = mongoTemplate.findById(id, Document.class, event.getCollectionName());
        if (previous != null) {
            previousDocuments.put(key(event.getCollectionName(), id), previous);
        }
    }

    @Override
    public void onAfterSave(AfterSaveEvent<Object> event) {
        if (shouldSkip(event.getSource(), event.getCollectionName())) {
            return;
        }

        Object id = readProperty(event.getSource(), "id");
        if (id == null) {
            return;
        }

        String key = key(event.getCollectionName(), id);
        Document previous = previousDocuments.remove(key);
        if (previous != null && previous.equals(event.getDocument())) {
            return;
        }

        AuditLog auditLog = AuditLog.builder()
            .userId(resolveUserId())
            .action(previous == null ? "INSERT" : "UPDATE")
            .entityType(event.getSource().getClass().getSimpleName())
            .entityId(String.valueOf(id))
            .oldValues(previous != null ? mapOf(previous) : null)
            .newValues(mapOf(event.getDocument()))
            .build();
        auditLog.setTenantId(resolveTenantId(event.getSource()));
        mongoTemplate.save(auditLog);
    }

    @Override
    public void onAfterDelete(AfterDeleteEvent<Object> event) {
        if (AUDIT_COLLECTION.equalsIgnoreCase(event.getCollectionName())) {
            return;
        }

        Document document = event.getDocument();
        if (document == null) {
            return;
        }

        AuditLog auditLog = AuditLog.builder()
            .userId(resolveUserId())
            .action("DELETE")
            .entityType(document.getString("_class") != null ? document.getString("_class") : event.getCollectionName())
            .entityId(stringValue(document.get("_id")))
            .oldValues(mapOf(document))
            .newValues(null)
            .build();
        auditLog.setTenantId(resolveTenantId(document));
        mongoTemplate.save(auditLog);
    }

    private boolean shouldSkip(Object source, String collectionName) {
        return source == null
            || collectionName == null
            || AUDIT_COLLECTION.equalsIgnoreCase(collectionName)
            || source instanceof AuditLog
            || source.getClass() == AuditLog.class;
    }

    private String resolveUserId() {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return SecurityContextHolder.getContext().getAuthentication().getName();
        }
        return "system";
    }

    private Long resolveTenantId(Object source) {
        Object value = readProperty(source, "tenantId");
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String str && !str.isBlank()) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return TenantContext.currentTenantIdOrNull();
    }

    private String key(String collectionName, Object id) {
        return collectionName + ":" + String.valueOf(id);
    }

    private Map<String, Object> mapOf(Document document) {
        if (document == null) {
            return null;
        }
        return new LinkedHashMap<>(document);
    }

    private Object readProperty(Object source, String property) {
        if (source == null) {
            return null;
        }
        try {
            return new BeanWrapperImpl(source).getPropertyValue(property);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value == null ? null : Objects.toString(value, null);
    }
}
