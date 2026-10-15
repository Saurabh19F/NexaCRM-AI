package com.nexacrm.service;

import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Date;
import java.util.Objects;

/** Preserve each saved transition instead of inferring history from updatedAt. */
@Service
@RequiredArgsConstructor
public class LeadChangeAuditService {
    private final LeadRepository leads;
    private final MongoTemplate mongo;

    public Lead save(Lead lead) {
        Document previous = lead.getId() == null ? null : mongo.findOne(Query.query(Criteria.where("_id")
            .is(lead.getId()).and("tenant_id").is(lead.getTenantId())), Document.class, "leads");
        Lead saved = leads.save(lead);
        if (previous != null && !Boolean.TRUE.equals(saved.getDeleted())) {
            record(saved, "STATUS_CHANGED", "status", previous.get("status"), saved.getStatus());
            record(saved, "SCORE_CHANGED", "score", previous.get("score"), saved.getScore());
            if (!Objects.equals(previous.get("notes"), saved.getNotes())) {
                mongo.insert(new Document("tenant_id", saved.getTenantId()).append("entity_type", "lead")
                    .append("entity_id", saved.getId()).append("action", "NOTES_UPDATED")
                    .append("details", new Document("message", saved.getNotes() == null ? "Notes cleared" : saved.getNotes()))
                    .append("created_at", Date.from(Instant.now())), "audit_logs");
            }
        }
        return saved;
    }

    private void record(Lead lead, String action, String field, Object old, Object updated) {
        String before = old == null ? "Unclassified" : old.toString();
        String after = updated == null ? "Unclassified" : updated.toString();
        if (Objects.equals(before, after)) return;
        Document details = new Document("message", field + " changed from " + before + " to " + after);
        if (field.equals("status")) details.append("previousStage", before).append("updatedStage", after);
        else details.append("previousScore", before).append("updatedScore", after);
        mongo.insert(new Document("tenant_id", lead.getTenantId()).append("entity_type", "lead")
            .append("entity_id", lead.getId()).append("action", action).append("details", details)
            .append("created_at", Date.from(Instant.now())), "audit_logs");
    }
}
