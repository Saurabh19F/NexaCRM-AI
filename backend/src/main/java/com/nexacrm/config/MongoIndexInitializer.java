package com.nexacrm.config;

import com.nexacrm.model.CommunicationRecord;
import com.nexacrm.model.Deal;
import com.nexacrm.model.LeadActivity;
import com.nexacrm.model.Invoice;
import com.nexacrm.model.Lead;
import com.nexacrm.service.TenantAdminService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;
    private final TenantAdminService tenantAdminService;

    @PostConstruct
    public void ensureOperationalIndexes() {
        mongoTemplate.indexOps(LeadActivity.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("lead_id", Sort.Direction.ASC)
                .on("saved_at", Sort.Direction.DESC)
                .background()
                .named("lead_activity_tenant_deleted_lead_saved_idx")
        );

        mongoTemplate.indexOps(LeadActivity.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("lead_id", Sort.Direction.ASC)
                .on("activity_index", Sort.Direction.ASC)
                .on("saved_at", Sort.Direction.DESC)
                .background()
                .named("lead_activity_bulk_stage_preview_idx")
        );

        mongoTemplate.indexOps(Invoice.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .background()
                .named("invoice_tenant_deleted_created_idx")
        );

        mongoTemplate.indexOps(Lead.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("assigned_to.$id", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .background()
                .named("lead_tenant_deleted_assigned_created_idx")
        );

        // Dashboard count queries: status and source grouping
        mongoTemplate.indexOps(Lead.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("status", Sort.Direction.ASC)
                .background()
                .named("lead_tenant_deleted_status_idx")
        );

        mongoTemplate.indexOps(Lead.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("source", Sort.Direction.ASC)
                .background()
                .named("lead_tenant_deleted_source_idx")
        );

        // Leads list default sort
        mongoTemplate.indexOps(Lead.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .background()
                .named("lead_tenant_deleted_created_idx")
        );

        // Deals: pipeline/kanban queries
        mongoTemplate.indexOps(Deal.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("deleted", Sort.Direction.ASC)
                .on("stage", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .background()
                .named("deal_tenant_deleted_stage_created_idx")
        );

        // Tasks: indexes already defined via @CompoundIndex on Task model

        // Communications: dashboard call snapshots
        mongoTemplate.indexOps(CommunicationRecord.class).ensureIndex(
            new Index()
                .on("tenant_id", Sort.Direction.ASC)
                .on("channel", Sort.Direction.ASC)
                .on("created_at", Sort.Direction.DESC)
                .background()
                .named("comm_tenant_channel_created_idx")
        );

        log.info("Mongo operational indexes verified");

        try {
            tenantAdminService.backfillTenantIds();
            log.info("Tenant tenantId backfill complete");
        } catch (Exception e) {
            log.warn("Tenant backfill skipped: {}", e.getMessage());
        }
    }
}
