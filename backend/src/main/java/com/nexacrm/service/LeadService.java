package com.nexacrm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.dto.LeadDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.repository.UserRepository;
import com.nexacrm.websocket.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
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
                                         String source, String assignedTo, Pageable pageable) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(DEFAULT_TENANT));
        query.addCriteria(Criteria.where("deleted").is(false));

        if (search != null && !search.isBlank()) {
            String regex = ".*" + java.util.regex.Pattern.quote(search.trim()) + ".*";
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("name").regex(regex, "i"),
                Criteria.where("email").regex(regex, "i"),
                Criteria.where("company").regex(regex, "i")
            ));
        }
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(Lead.LeadStatus.valueOf(status.toUpperCase())));
        }
        if (score != null && !score.isBlank()) {
            query.addCriteria(Criteria.where("score").is(Lead.LeadScore.valueOf(score.toUpperCase())));
        }
        if (source != null && !source.isBlank()) {
            query.addCriteria(Criteria.where("source").is(Lead.LeadSource.valueOf(source.toUpperCase())));
        }
        if (assignedTo != null && !assignedTo.isBlank()) {
            query.addCriteria(Criteria.where("assigned_to.$id").is(assignedTo));
        }

        long total = mongoTemplate.count(query, Lead.class);
        query.with(pageable);
        List<Lead> leads = mongoTemplate.find(query, Lead.class);
        Page<Lead> page = new PageImpl<>(leads, pageable, total);

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
    public LeadDTO findById(String id) {
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

    public LeadDTO update(String id, LeadDTO dto) {
        Lead lead = leadRepository.findById(id)
            .filter(l -> !l.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));

        lead.setName(dto.getName());
        lead.setEmail(dto.getEmail());
        lead.setPhone(dto.getPhone());
        lead.setCompany(dto.getCompany());
        lead.setService(dto.getService());
        lead.setSpecialization(dto.getSpecialization());
        if (dto.getStatus() != null) lead.setStatus(dto.getStatus());
        if (dto.getScore() != null)  lead.setScore(dto.getScore());
        if (dto.getPriority() != null) lead.setPriority(dto.getPriority());
        if (dto.getDealValue() != null) lead.setDealValue(dto.getDealValue());
        if (dto.getAssignedToId() != null) {
            if (dto.getAssignedToId().isBlank()) {
                lead.setAssignedTo(null);
            } else {
                userRepository.findById(dto.getAssignedToId()).ifPresent(lead::setAssignedTo);
            }
        }
        lead.setNotes(dto.getNotes());

        return toDTO(leadRepository.save(lead));
    }

    public void delete(String id) {
        Lead lead = leadRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + id));
        lead.setDeleted(true);
        leadRepository.save(lead);
    }

    public int bulkDelete(List<String> ids) {
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

    public Map<String, Object> syncFromPublicGoogleSheet(Map<String, String> config) {
        String sourceLabel = trim(config.get("sourceLabel"));
        if (sourceLabel == null || sourceLabel.isBlank()) sourceLabel = "Kriscel.com";
        String sheetName = trim(config.get("sheetName"));

        String csv = fetchPublicSheetCsv(config);

        List<List<String>> rows = parseCsv(csv);
        if (rows.isEmpty()) {
            return Map.of(
                "ok", true,
                "message", "No rows found in sheet.",
                "imported", 0,
                "skipped", 0,
                "errors", 0
            );
        }

        Map<String, Integer> headerIndex = buildHeaderIndex(rows.get(0));
        List<String> errorList = new ArrayList<>();
        int imported = 0;
        int skipped = 0;

        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            String name = readCell(row, headerIndex, "name");
            String email = readCell(row, headerIndex, "email");
            String phone = readCell(row, headerIndex, "phone");
            String service = readCell(row, headerIndex, "service");
            String specialization = readCell(row, headerIndex, "specialization", "subservice", "sub service", "sub_service");
            String subject = readCell(row, headerIndex, "subject");
            String message = readCell(row, headerIndex, "message");
            String date = readCell(row, headerIndex, "date");

            if ((name == null || name.isBlank()) && (email == null || email.isBlank())) {
                skipped++;
                continue;
            }
            if (email == null || email.isBlank()) {
                skipped++;
                errorList.add("Row " + (i + 1) + ": missing email");
                continue;
            }

            String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
            if (leadRepository.findByEmailAndTenantIdAndDeletedFalse(normalizedEmail, DEFAULT_TENANT).isPresent()) {
                skipped++;
                continue;
            }

            String note = mergeNotes(subject, message, date);
            LeadDTO dto = LeadDTO.builder()
                .name(name != null && !name.isBlank() ? name.trim() : normalizedEmail)
                .email(normalizedEmail)
                .phone(phone)
                .service(service)
                .specialization(specialization)
                .source(Lead.LeadSource.WEBSITE)
                .status(Lead.LeadStatus.NEW)
                .utmSource("kriscel.com")
                .utmMedium("google_sheet_sync")
                .utmCampaign(sourceLabel)
                .notes(note)
                .build();

            try {
                create(dto);
                imported++;
            } catch (Exception ex) {
                skipped++;
                errorList.add("Row " + (i + 1) + ": " + ex.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("message", "Google Sheet sync complete.");
        result.put("sheet", sheetName);
        result.put("imported", imported);
        result.put("skipped", skipped);
        result.put("errors", errorList.size());
        if (!errorList.isEmpty()) {
            result.put("errorDetails", errorList.size() > 20 ? errorList.subList(0, 20) : errorList);
        }
        return result;
    }

    public Map<String, Object> testPublicGoogleSheetAccess(Map<String, String> config) {
        String csv = fetchPublicSheetCsv(config);
        List<List<String>> rows = parseCsv(csv);
        if (rows.isEmpty()) {
            throw new IllegalStateException("Sheet is reachable but empty.");
        }

        List<String> headers = rows.get(0);
        Map<String, Integer> headerIndex = buildHeaderIndex(headers);
        boolean hasName = headerIndex.containsKey("name");
        boolean hasEmail = headerIndex.containsKey("email");
        if (!hasName && !hasEmail) {
            throw new IllegalStateException("Header row must include at least Name or Email columns.");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("message", "Sheet access test passed.");
        result.put("rowsDetected", Math.max(0, rows.size() - 1));
        result.put("headers", headers);
        return result;
    }

    public byte[] export(String format, String status) {
        // TODO: generate CSV or Excel with Apache POI
        return new byte[0];
    }

    public Map<String, Object> scoreWithAI(String id) {
        return Map.of("leadId", id, "score", "WARM", "scoreValue", 55, "message", "AI scoring placeholder");
    }

    public Map<String, Object> convertToCustomer(String id, Map<String, Object> options) {
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

    private Map<String, Integer> buildHeaderIndex(List<String> headers) {
        Map<String, Integer> index = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String key = normalizeKey(headers.get(i));
            if (!key.isBlank()) {
                index.putIfAbsent(key, i);
            }
        }
        return index;
    }

    private String readCell(List<String> row, Map<String, Integer> headerIndex, String... keys) {
        for (String key : keys) {
            Integer idx = headerIndex.get(normalizeKey(key));
            if (idx == null || idx < 0 || idx >= row.size()) continue;
            String value = trim(row.get(idx));
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace(" ", "");
    }

    private String trim(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? "" : trimmed;
    }

    private String mergeNotes(String subject, String message, String date) {
        StringBuilder sb = new StringBuilder("Imported from Google Sheet");
        if (subject != null && !subject.isBlank()) sb.append(" | Subject: ").append(subject.trim());
        if (message != null && !message.isBlank()) sb.append(" | Message: ").append(message.trim());
        if (date != null && !date.isBlank()) sb.append(" | Date: ").append(date.trim());
        return sb.toString();
    }

    private List<List<String>> parseCsv(String csv) {
        List<List<String>> rows = new ArrayList<>();
        List<String> currentRow = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < csv.length(); i++) {
            char ch = csv.charAt(i);

            if (ch == '"') {
                if (inQuotes && i + 1 < csv.length() && csv.charAt(i + 1) == '"') {
                    cell.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch == ',' && !inQuotes) {
                currentRow.add(cell.toString());
                cell.setLength(0);
                continue;
            }

            if ((ch == '\n' || ch == '\r') && !inQuotes) {
                if (ch == '\r' && i + 1 < csv.length() && csv.charAt(i + 1) == '\n') i++;
                currentRow.add(cell.toString());
                cell.setLength(0);
                rows.add(currentRow);
                currentRow = new ArrayList<>();
                continue;
            }

            cell.append(ch);
        }

        if (!currentRow.isEmpty() || cell.length() > 0) {
            currentRow.add(cell.toString());
            rows.add(currentRow);
        }

        return rows;
    }

    private String fetchPublicSheetCsv(Map<String, String> config) {
        String spreadsheetId = trim(config.get("spreadsheetId"));
        String sheetName = trim(config.get("sheetName"));
        String gid = trim(config.get("gid"));
        String publishedCsvUrl = trim(config.get("publishedCsvUrl"));

        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            throw new IllegalStateException("spreadsheetId is required.");
        }
        if (sheetName == null || sheetName.isBlank()) {
            throw new IllegalStateException("sheetName is required.");
        }

        List<String> urlsToTry = new ArrayList<>();
        if (publishedCsvUrl != null && !publishedCsvUrl.isBlank()) {
            urlsToTry.add(publishedCsvUrl);
        }
        if (gid != null && !gid.isBlank()) {
            urlsToTry.add("https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=csv&gid=" + gid);
        }
        urlsToTry.add("https://docs.google.com/spreadsheets/d/" + spreadsheetId
            + "/export?format=csv&sheet=" + URLEncoder.encode(sheetName, StandardCharsets.UTF_8));
        urlsToTry.add("https://docs.google.com/spreadsheets/d/" + spreadsheetId
            + "/gviz/tq?tqx=out:csv&sheet=" + URLEncoder.encode(sheetName, StandardCharsets.UTF_8));

        StringJoiner errors = new StringJoiner(" | ");
        HttpEntity<Void> requestEntity = buildCsvFetchRequestEntity();
        for (String csvUrl : urlsToTry) {
            try {
                ResponseEntity<String> response = restTemplate.exchange(
                    csvUrl,
                    HttpMethod.GET,
                    requestEntity,
                    String.class
                );
                String csv = response.getBody();
                if (csv == null || csv.isBlank()) {
                    errors.add("empty response");
                    continue;
                }

                String sniff = csv.trim().toLowerCase(Locale.ROOT);
                if (sniff.startsWith("<!doctype html") || sniff.startsWith("<html")) {
                    errors.add("non-csv html response");
                    continue;
                }
                return csv;
            } catch (RestClientException ex) {
                errors.add(ex.getClass().getSimpleName());
            }
        }

        throw new IllegalStateException(
            "Failed to fetch Google Sheet CSV. Make sure sharing is 'Anyone with link - Viewer', sheet tab is exact, and gid is correct. Details: " + errors
        );
    }

    private HttpEntity<Void> buildCsvFetchRequestEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        headers.set(HttpHeaders.ACCEPT, "text/csv,application/csv,text/plain,*/*");
        headers.set(HttpHeaders.ACCEPT_LANGUAGE, "en-US,en;q=0.9");
        headers.setCacheControl("no-cache");
        headers.setPragma("no-cache");
        headers.setAccept(List.of(MediaType.TEXT_PLAIN, MediaType.ALL));
        return new HttpEntity<>(headers);
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
            .service(l.getService())
            .specialization(l.getSpecialization())
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
        Lead.LeadBuilder builder = Lead.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .company(dto.getCompany())
            .designation(dto.getDesignation())
            .service(dto.getService())
            .specialization(dto.getSpecialization())
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
            .facebookAdId(dto.getFacebookAdId());

        if (dto.getAssignedToId() != null && !dto.getAssignedToId().isBlank()) {
            userRepository.findById(dto.getAssignedToId()).ifPresent(builder::assignedTo);
        }

        return builder.build();
    }
}
