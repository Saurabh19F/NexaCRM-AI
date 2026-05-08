package com.nexacrm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.dto.LeadDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.websocket.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final NotificationPublisher notificationPublisher;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${meta.page-access-token}")
    private String pageAccessToken;

    @Value("${meta.graph-api-version:v19.0}")
    private String graphApiVersion;

    private static final Long DEFAULT_TENANT = 1L;

    // ── Queries ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<LeadDTO> findAll(String search, String status, String score,
                                         String source, Long assignedTo, Pageable pageable) {
        Page<Lead> page = leadRepository.searchLeads(
            DEFAULT_TENANT,
            search != null && !search.isBlank() ? search : null,
            status,
            score,
            source,
            pageable
        );
        return PageResponse.<LeadDTO>builder()
            .content(page.getContent().stream().map(this::toDTO).collect(Collectors.toList()))
            .page(page.getNumber())
            .size(page.getSize())
            .total(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .first(page.isFirst())
            .last(page.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public LeadDTO findById(Long id) {
        return leadRepository.findById(id)
            .filter(l -> !l.getDeleted())
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));
    }

    // ── Commands ─────────────────────────────────────────────────

    public LeadDTO create(LeadDTO dto) {
        // Deduplication check
        leadRepository.findByEmailAndTenantIdAndDeletedFalse(dto.getEmail(), DEFAULT_TENANT)
            .ifPresent(existing -> {
                log.warn("Duplicate lead detected for email: {}", dto.getEmail());
                // Could throw ConflictException or merge — for now just warn
            });

        Lead lead = fromDTO(dto);
        lead.setTenantId(DEFAULT_TENANT);
        Lead saved = leadRepository.save(lead);

        // Trigger WebSocket notification
        notificationPublisher.notifyNewLead(saved.getName(), saved.getSource().name());

        log.info("Lead created: id={}, name={}", saved.getId(), saved.getName());
        return toDTO(saved);
    }

    public LeadDTO update(Long id, LeadDTO dto) {
        Lead lead = leadRepository.findById(id)
            .filter(l -> !l.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));

        lead.setName(dto.getName());
        lead.setEmail(dto.getEmail());
        lead.setPhone(dto.getPhone());
        lead.setCompany(dto.getCompany());
        if (dto.getStatus() != null) lead.setStatus(dto.getStatus());
        if (dto.getScore() != null)  lead.setScore(dto.getScore());
        if (dto.getPriority() != null) lead.setPriority(dto.getPriority());
        if (dto.getDealValue() != null) lead.setDealValue(dto.getDealValue());
        lead.setNotes(dto.getNotes());

        return toDTO(leadRepository.save(lead));
    }

    public void delete(Long id) {
        Lead lead = leadRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));
        lead.setDeleted(true);
        leadRepository.save(lead);
    }

    public int bulkDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        List<Lead> leads = leadRepository.findAllById(ids);
        leads.forEach(l -> l.setDeleted(true));
        leadRepository.saveAll(leads);
        return leads.size();
    }

    public Map<String, Object> importFromFile(MultipartFile file) {
        // TODO: parse CSV/Excel with Apache POI, batch insert
        return Map.of("imported", 0, "skipped", 0, "errors", 0);
    }

    public byte[] export(String format, String status) {
        // TODO: generate CSV or Excel with Apache POI
        return new byte[0];
    }

    public Map<String, Object> scoreWithAI(Long id) {
        return Map.of("leadId", id, "score", "WARM", "scoreValue", 55, "message", "AI scoring placeholder");
    }

    public Map<String, Object> convertToCustomer(Long id, Map<String, Object> options) {
        Lead lead = leadRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));
        lead.setStatus(Lead.LeadStatus.WON);
        leadRepository.save(lead);
        // TODO: create Customer and Deal records
        return Map.of("message", "Lead converted to customer", "leadId", id);
    }

    // ── Facebook Lead Ads ─────────────────────────────────────────

    @Async
    public void processFacebookLeadsWebhookAsync(String rawBody) {
        try {
            Map<String, Object> payload = objectMapper.readValue(rawBody, Map.class);
            List<Map<String, Object>> entries = (List<Map<String, Object>>) payload.get("entry");
            if (entries == null) return;

            for (Map<String, Object> entry : entries) {
                List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get("changes");
                if (changes == null) continue;
                for (Map<String, Object> change : changes) {
                    if (!"leadgen".equals(change.get("field"))) continue;
                    Map<String, Object> value = (Map<String, Object>) change.get("value");
                    if (value == null) continue;
                    String leadgenId = String.valueOf(value.get("leadgen_id"));
                    String adId     = value.get("ad_id")   != null ? String.valueOf(value.get("ad_id"))   : null;
                    String formId   = value.get("form_id") != null ? String.valueOf(value.get("form_id")) : null;
                    fetchAndSaveLead(leadgenId, adId, formId);
                }
            }
        } catch (Exception e) {
            log.error("Error processing Facebook Lead Ads webhook", e);
        }
    }

    @SuppressWarnings("unchecked")
    private void fetchAndSaveLead(String leadgenId, String adId, String formId) {
        try {
            // Idempotency: skip if we already processed this Facebook lead
            if (leadRepository.findByFacebookLeadIdAndDeletedFalse(leadgenId).isPresent()) {
                log.info("Facebook lead already exists, skipping: leadgen_id={}", leadgenId);
                return;
            }

            String url = UriComponentsBuilder
                .fromHttpUrl("https://graph.facebook.com/{version}/{id}")
                .queryParam("access_token", pageAccessToken)
                .queryParam("fields", "field_data,created_time,ad_id,form_id,campaign_id")
                .buildAndExpand(graphApiVersion, leadgenId)
                .toUriString();

            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) {
                log.warn("Facebook Graph API returned null for leadgen_id={}", leadgenId);
                return;
            }

            // Prefer IDs from the Graph API response over the webhook payload (more authoritative)
            String resolvedFormId = response.get("form_id") != null
                ? String.valueOf(response.get("form_id")) : formId;
            String resolvedAdId   = response.get("ad_id") != null
                ? String.valueOf(response.get("ad_id"))   : adId;

            List<Map<String, Object>> fieldData = (List<Map<String, Object>>) response.get("field_data");
            String name        = extractFieldValue(fieldData, "full_name", "first_name");
            String email       = extractFieldValue(fieldData, "email");
            String phone       = extractFieldValue(fieldData, "phone_number", "phone");
            String company     = extractFieldValue(fieldData, "company_name", "company");
            String designation = extractFieldValue(fieldData, "job_title", "work_job_title");

            if (name == null || name.isBlank()) name = "Facebook Lead " + leadgenId;
            if (email == null || email.isBlank()) email = leadgenId + "@facebook-lead.local";

            LeadDTO dto = LeadDTO.builder()
                .name(name)
                .email(email)
                .phone(phone)
                .company(company)
                .designation(designation)
                .source(Lead.LeadSource.META_ADS)
                .status(Lead.LeadStatus.NEW)
                .score(Lead.LeadScore.COLD)
                .priority(Lead.LeadPriority.MEDIUM)
                .utmSource("facebook")
                .utmMedium("lead_ad")
                .utmCampaign(resolvedAdId)
                .facebookLeadId(leadgenId)
                .facebookFormId(resolvedFormId)
                .facebookAdId(resolvedAdId)
                .notes("Facebook Lead Ad | Form: " + resolvedFormId
                    + (resolvedAdId != null ? " | Ad: " + resolvedAdId : ""))
                .build();

            create(dto);
            log.info("Facebook lead saved: leadgen_id={}, name={}, email={}", leadgenId, name, email);
        } catch (Exception e) {
            log.error("Failed to fetch/save Facebook lead for leadgen_id={}", leadgenId, e);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractFieldValue(List<Map<String, Object>> fieldData, String... fieldNames) {
        if (fieldData == null) return null;
        for (String fieldName : fieldNames) {
            String value = fieldData.stream()
                .filter(f -> fieldName.equals(f.get("name")))
                .findFirst()
                .map(f -> {
                    List<String> values = (List<String>) f.get("values");
                    return (values != null && !values.isEmpty()) ? values.get(0) : null;
                })
                .orElse(null);
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }

    // ── Mapping helpers ──────────────────────────────────────────

    private LeadDTO toDTO(Lead l) {
        return LeadDTO.builder()
            .id(l.getId())
            .name(l.getName())
            .email(l.getEmail())
            .phone(l.getPhone())
            .company(l.getCompany())
            .designation(l.getDesignation())
            .source(l.getSource())
            .status(l.getStatus())
            .score(l.getScore())
            .priority(l.getPriority())
            .dealValue(l.getDealValue())
            .utmSource(l.getUtmSource())
            .utmMedium(l.getUtmMedium())
            .utmCampaign(l.getUtmCampaign())
            .aiScoreValue(l.getAiScoreValue())
            .aiNextAction(l.getAiNextAction())
            .assignedToId(l.getAssignedTo() != null ? l.getAssignedTo().getId() : null)
            .assignedToName(l.getAssignedTo() != null ? l.getAssignedTo().getName() : null)
            .tags(l.getTags() != null && !l.getTags().isBlank()
                ? Arrays.asList(l.getTags().split(",")) : null)
            .notes(l.getNotes())
            .facebookLeadId(l.getFacebookLeadId())
            .facebookFormId(l.getFacebookFormId())
            .facebookAdId(l.getFacebookAdId())
            .createdAt(l.getCreatedAt())
            .updatedAt(l.getUpdatedAt())
            .lastContactedAt(l.getLastContactedAt())
            .build();
    }

    private Lead fromDTO(LeadDTO dto) {
        return Lead.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .company(dto.getCompany())
            .designation(dto.getDesignation())
            .source(dto.getSource())
            .status(dto.getStatus() != null ? dto.getStatus() : Lead.LeadStatus.NEW)
            .score(dto.getScore() != null ? dto.getScore() : Lead.LeadScore.COLD)
            .priority(dto.getPriority() != null ? dto.getPriority() : Lead.LeadPriority.MEDIUM)
            .dealValue(dto.getDealValue())
            .utmSource(dto.getUtmSource())
            .utmMedium(dto.getUtmMedium())
            .utmCampaign(dto.getUtmCampaign())
            .tags(dto.getTags() != null ? String.join(",", dto.getTags()) : null)
            .notes(dto.getNotes())
            .facebookLeadId(dto.getFacebookLeadId())
            .facebookFormId(dto.getFacebookFormId())
            .facebookAdId(dto.getFacebookAdId())
            .build();
    }
}
