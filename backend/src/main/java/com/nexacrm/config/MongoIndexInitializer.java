package com.nexacrm.config;

import com.nexacrm.model.LeadActivity;
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

        log.info("Mongo operational indexes verified");
    }
}
