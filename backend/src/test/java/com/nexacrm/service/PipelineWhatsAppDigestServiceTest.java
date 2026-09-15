package com.nexacrm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.model.AppSetting;
import com.nexacrm.model.Lead;
import com.nexacrm.repository.AppSettingRepository;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PipelineWhatsAppDigestServiceTest {

    @Mock private AppSettingRepository appSettingRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private CommunicationService communicationService;
    @Mock private MongoTemplate mongoTemplate;

    private PipelineWhatsAppDigestService service;

    @BeforeEach
    void setUp() {
        service = new PipelineWhatsAppDigestService(
            appSettingRepository,
            leadRepository,
            communicationService,
            mongoTemplate,
            new ObjectMapper()
        );
        TenantContext.setCurrentTenantId(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void saveConfigurationNormalizesIndianNumberAndTime() {
        when(appSettingRepository.findByTenantIdAndNamespaceAndKeyAndDeletedFalse(1L, "automation", "pipelineWhatsappDigest"))
            .thenReturn(Optional.empty());
        when(appSettingRepository.save(any(AppSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> saved = service.saveCurrentConfiguration(Map.of(
            "enabled", true,
            "time", "09:05",
            "recipient", "98765 43210",
            "timezone", "Asia/Kolkata"
        ));

        assertTrue((Boolean) saved.get("enabled"));
        assertEquals("+919876543210", saved.get("recipient"));
        assertEquals("09:05", saved.get("time"));
        assertFalse(saved.containsKey("lastSentDate"));
    }

    @Test
    void sendNowBuildsSummaryAndRecordsLastSend() {
        AppSetting setting = AppSetting.builder()
            .namespace("automation")
            .key("pipelineWhatsappDigest")
            .value("{\"enabled\":true,\"time\":\"09:00\",\"recipient\":\"+919876543210\",\"timezone\":\"Asia/Kolkata\",\"lastSentDate\":\"\",\"lastSentAt\":\"\"}")
            .build();
        Lead lead = Lead.builder()
            .name("Acme Lead")
            .status(Lead.LeadStatus.PROPOSAL)
            .dealValue(new BigDecimal("50000"))
            .build();
        lead.setUpdatedAt(LocalDateTime.now());

        when(appSettingRepository.findByTenantIdAndNamespaceAndKeyAndDeletedFalse(1L, "automation", "pipelineWhatsappDigest"))
            .thenReturn(Optional.of(setting));
        when(leadRepository.findByTenantIdAndDeletedFalse(1L)).thenReturn(List.of(lead));
        when(appSettingRepository.save(any(AppSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = service.sendCurrentDigestNow();

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(communicationService).sendChannelMessage(org.mockito.ArgumentMatchers.eq("whatsapp"), org.mockito.ArgumentMatchers.eq("+919876543210"), org.mockito.ArgumentMatchers.eq(""), body.capture());
        assertTrue(body.getValue().contains("Daily Pipeline Update"));
        assertTrue(body.getValue().contains("Acme Lead — PROPOSAL"));
        assertNotNull(result.get("lastSentAt"));
    }
}
