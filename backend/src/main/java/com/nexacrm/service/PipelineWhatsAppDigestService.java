package com.nexacrm.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.model.AppSetting;
import com.nexacrm.model.Lead;
import com.nexacrm.repository.AppSettingRepository;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineWhatsAppDigestService {

    private static final String NAMESPACE = "automation";
    private static final String KEY = "pipelineWhatsappDigest";
    private static final String DEFAULT_TIME = "18:00";
    private static final String DEFAULT_TIMEZONE = "Asia/Kolkata";
    private static final TypeReference<Map<String, Object>> CONFIG_TYPE = new TypeReference<>() {};
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final AppSettingRepository appSettingRepository;
    private final LeadRepository leadRepository;
    private final CommunicationService communicationService;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper;

    public Map<String, Object> getCurrentConfiguration() {
        return publicConfiguration(readConfiguration(TenantContext.currentTenantId()));
    }

    public Map<String, Object> saveCurrentConfiguration(Map<String, Object> request) {
        Long tenantId = TenantContext.currentTenantId();
        Map<String, Object> current = readConfiguration(tenantId);
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", booleanValue(request != null && request.containsKey("enabled") ? request.get("enabled") : current.get("enabled"), false));
        config.put("time", normalizeTime(textValue(request, "time", textValue(current, "time", DEFAULT_TIME))));
        config.put("recipient", normalizePhone(textValue(request, "recipient", textValue(current, "recipient", ""))));
        config.put("timezone", normalizeTimezone(textValue(request, "timezone", textValue(current, "timezone", DEFAULT_TIMEZONE))));
        config.put("lastSentDate", "");
        config.put("lastSentAt", "");

        if (Boolean.TRUE.equals(config.get("enabled")) && String.valueOf(config.get("recipient")).isBlank()) {
            throw new IllegalArgumentException("A WhatsApp recipient number is required when the daily digest is enabled.");
        }
        persistConfiguration(tenantId, config);
        return publicConfiguration(config);
    }

    public Map<String, Object> sendCurrentDigestNow() {
        Long tenantId = TenantContext.currentTenantId();
        Map<String, Object> config = readConfiguration(tenantId);
        if (String.valueOf(config.getOrDefault("recipient", "")).isBlank()) {
            throw new IllegalArgumentException("Set a WhatsApp recipient number before sending the digest.");
        }
        sendDigest(tenantId, config);
        return publicConfiguration(readConfiguration(tenantId));
    }

    @Scheduled(cron = "0 * * * * *")
    public void sendScheduledDigests() {
        for (Long tenantId : resolveTenantIds()) {
            try {
                Map<String, Object> config = readConfiguration(tenantId);
                if (!booleanValue(config.get("enabled"), false)) {
                    continue;
                }

                ZoneId zone = ZoneId.of(String.valueOf(config.get("timezone")));
                LocalDateTime now = LocalDateTime.now(zone);
                LocalTime scheduledTime = LocalTime.parse(String.valueOf(config.get("time")), TIME_FORMAT);
                String lastSentDate = textValue(config, "lastSentDate", "");
                if (now.getHour() == scheduledTime.getHour()
                    && now.getMinute() == scheduledTime.getMinute()
                    && !lastSentDate.equals(now.toLocalDate().toString())) {
                    sendDigest(tenantId, config);
                }
            } catch (Exception ex) {
                log.warn("Pipeline WhatsApp digest failed for tenant {}: {}", tenantId, ex.getMessage());
            }
        }
    }

    private void sendDigest(Long tenantId, Map<String, Object> config) {
        TenantContext.setCurrentTenantId(tenantId);
        try {
            ZoneId zone = ZoneId.of(String.valueOf(config.get("timezone")));
            LocalDateTime now = LocalDateTime.now(zone);
            List<Lead> leads = leadRepository.findByTenantIdAndDeletedFalse(tenantId);
            String message = buildMessage(leads, now);
            communicationService.sendChannelMessage("whatsapp", String.valueOf(config.get("recipient")), "", message);

            config.put("lastSentDate", now.toLocalDate().toString());
            config.put("lastSentAt", Instant.now().toString());
            persistConfiguration(tenantId, config);
            log.info("Pipeline WhatsApp digest sent for tenant {} to {}", tenantId, maskPhone(String.valueOf(config.get("recipient"))));
        } finally {
            TenantContext.clear();
        }
    }

    private String buildMessage(List<Lead> leads, LocalDateTime now) {
        List<Lead> rows = leads == null ? List.of() : leads.stream().filter(Objects::nonNull).toList();
        Map<Lead.LeadStatus, Integer> counts = new EnumMap<>(Lead.LeadStatus.class);
        for (Lead.LeadStatus status : Lead.LeadStatus.values()) counts.put(status, 0);
        rows.forEach(lead -> counts.compute(lead.getStatus() == null ? Lead.LeadStatus.NEW : lead.getStatus(), (key, value) -> value + 1));

        LocalDateTime since = now.minusHours(24);
        List<Lead> recent = rows.stream()
            .filter(lead -> lead.getUpdatedAt() != null && !lead.getUpdatedAt().isBefore(since))
            .sorted(Comparator.comparing(Lead::getUpdatedAt).reversed())
            .limit(8)
            .toList();

        StringBuilder message = new StringBuilder()
            .append("📊 *Daily Pipeline Update*\n")
            .append("📅 ").append(now.toLocalDate().format(DATE_FORMAT)).append("\n\n")
            .append("*Current pipeline:* ").append(rows.size()).append(" leads\n")
            .append("• New: ").append(counts.get(Lead.LeadStatus.NEW))
            .append("  • Contacted: ").append(counts.get(Lead.LeadStatus.CONTACTED)).append("\n")
            .append("• Qualified: ").append(counts.get(Lead.LeadStatus.QUALIFIED))
            .append("  • Proposal: ").append(counts.get(Lead.LeadStatus.PROPOSAL)).append("\n")
            .append("• Negotiation: ").append(counts.get(Lead.LeadStatus.NEGOTIATION))
            .append("  • Won: ").append(counts.get(Lead.LeadStatus.WON))
            .append("  • Lost: ").append(counts.get(Lead.LeadStatus.LOST)).append("\n\n")
            .append("*Updated in the last 24 hours: ").append(recent.size()).append("*\n");

        if (recent.isEmpty()) {
            message.append("No lead records were updated in the last 24 hours.");
        } else {
            for (Lead lead : recent) {
                String name = cleanText(lead.getName(), "Unnamed lead");
                String status = lead.getStatus() == null ? "NEW" : lead.getStatus().name();
                String value = lead.getDealValue() == null ? "" : " · ₹" + lead.getDealValue().stripTrailingZeros().toPlainString();
                message.append("• ").append(name).append(" — ").append(status).append(value).append("\n");
            }
        }
        message.append("\nOpen NexaCRM Pipeline for full details.");
        return message.toString();
    }

    private Map<String, Object> readConfiguration(Long tenantId) {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("enabled", false);
        defaults.put("time", DEFAULT_TIME);
        defaults.put("recipient", "");
        defaults.put("timezone", DEFAULT_TIMEZONE);
        defaults.put("lastSentDate", "");
        defaults.put("lastSentAt", "");
        return appSettingRepository.findByTenantIdAndNamespaceAndKeyAndDeletedFalse(tenantId, NAMESPACE, KEY)
            .map(AppSetting::getValue)
            .map(this::parseConfiguration)
            .map(config -> mergeDefaults(defaults, config))
            .orElse(defaults);
    }

    private Map<String, Object> parseConfiguration(String json) {
        try {
            return objectMapper.readValue(json, CONFIG_TYPE);
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private Map<String, Object> mergeDefaults(Map<String, Object> defaults, Map<String, Object> saved) {
        Map<String, Object> merged = new LinkedHashMap<>(defaults);
        if (saved != null) merged.putAll(saved);
        return merged;
    }

    private Map<String, Object> publicConfiguration(Map<String, Object> config) {
        Map<String, Object> response = new LinkedHashMap<>(config);
        response.remove("lastSentDate");
        return response;
    }

    private void persistConfiguration(Long tenantId, Map<String, Object> config) {
        AppSetting setting = appSettingRepository
            .findByTenantIdAndNamespaceAndKeyAndDeletedFalse(tenantId, NAMESPACE, KEY)
            .orElseGet(() -> AppSetting.builder().namespace(NAMESPACE).key(KEY).encrypted(false).build());
        try {
            setting.setTenantId(tenantId);
            setting.setNamespace(NAMESPACE);
            setting.setKey(KEY);
            setting.setValue(objectMapper.writeValueAsString(config));
            setting.setDescription("Daily WhatsApp pipeline digest");
            setting.setEncrypted(false);
            setting.setDeleted(false);
            appSettingRepository.save(setting);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to save pipeline WhatsApp digest settings.", ex);
        }
    }

    private Set<Long> resolveTenantIds() {
        Set<Long> tenantIds = new LinkedHashSet<>();
        try {
            tenantIds.addAll(mongoTemplate.findDistinct(
                Query.query(Criteria.where("deleted").is(false)), "tenant_id", "settings", Long.class));
            tenantIds.addAll(mongoTemplate.findDistinct(
                Query.query(Criteria.where("deleted").is(false)), "tenant_id", "leads", Long.class));
        } catch (Exception ex) {
            log.warn("Unable to enumerate tenants for pipeline WhatsApp digest: {}", ex.getMessage());
        }
        return tenantIds.stream().filter(Objects::nonNull).collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeTime(String raw) {
        try {
            return LocalTime.parse(raw, TIME_FORMAT).format(TIME_FORMAT);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Time must use 24-hour HH:mm format.");
        }
    }

    private String normalizeTimezone(String raw) {
        try {
            return ZoneId.of(raw).getId();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Select a valid timezone.");
        }
    }

    private String normalizePhone(String raw) {
        String digits = raw == null ? "" : raw.replaceAll("\\D", "");
        if (digits.isBlank()) return "";
        if (digits.length() < 7 || digits.length() > 15) {
            throw new IllegalArgumentException("WhatsApp number must contain 7 to 15 digits.");
        }
        return digits.length() == 10 ? "+91" + digits : "+" + digits;
    }

    private String textValue(Map<String, Object> map, String key, String fallback) {
        Object value = map == null ? null : map.get(key);
        return value == null ? fallback : String.valueOf(value).trim();
    }

    private boolean booleanValue(Object value, boolean fallback) {
        if (value == null) return fallback;
        if (value instanceof Boolean bool) return bool;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String cleanText(String value, String fallback) {
        String normalized = value == null ? "" : value.replaceAll("[\\r\\n]+", " ").trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private String maskPhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        return digits.length() <= 4 ? "****" : "****" + digits.substring(digits.length() - 4);
    }
}
