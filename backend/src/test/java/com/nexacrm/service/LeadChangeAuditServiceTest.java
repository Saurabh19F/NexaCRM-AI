package com.nexacrm.service;

import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LeadChangeAuditServiceTest {
    @Test void recordsOnlyRealChangesAfterSuccessfulSave() {
        var leads = mock(LeadRepository.class);
        var mongo = mock(MongoTemplate.class);
        var service = new LeadChangeAuditService(leads, mongo);
        Lead lead = Lead.builder().status(Lead.LeadStatus.QUALIFIED).score(Lead.LeadScore.HOT).build();
        lead.setId("lead"); lead.setTenantId(7L);
        when(mongo.findOne(any(Query.class), eq(Document.class), eq("leads")))
            .thenReturn(new Document("status", "NEW").append("score", "COLD"))
            .thenReturn(new Document("status", "QUALIFIED").append("score", "HOT"));
        when(leads.save(lead)).thenReturn(lead);
        service.save(lead); service.save(lead);
        verify(mongo, times(2)).insert(any(Document.class), eq("audit_logs"));
    }
}
