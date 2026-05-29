package com.nexacrm.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.CommunicationRecord;
import com.nexacrm.model.Lead;
import com.nexacrm.model.LeadActivity;
import com.nexacrm.model.User;
import com.nexacrm.repository.CommunicationRecordRepository;
import com.nexacrm.repository.LeadActivityRepository;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.repository.UserRepository;
import com.nexacrm.websocket.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CallAgentService {

    private static final Long DEFAULT_TENANT = 1L;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final CommunicationRecordRepository communicationRecordRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final LeadActivityRepository leadActivityRepository;
    private final CommunicationService communicationService;
    private final IntegrationService integrationService;
    private final NotificationPublisher notificationPublisher;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public boolean isWebhookAuthorized(String secretHeader, String authorizationHeader, Map<String, Object> payload) {
        String expectedSecret = trim(integrationService.getConfig("voice_call_agent").get("webhookSecret"));
        if (expectedSecret.isBlank()) {
            return true;
        }

        String payloadSecret = trim(stringValue(payload.get("secret")));
        if (payloadSecret.isBlank()) {
            payloadSecret = trim(stringValue(payload.get("webhookSecret")));
        }

        String bearer = trim(authorizationHeader);
        if (bearer.toLowerCase(Locale.ROOT).startsWith("bearer ")) {
            bearer = trim(bearer.substring("bearer ".length()));
        }

        return expectedSecret.equals(trim(secretHeader))
            || expectedSecret.equals(payloadSecret)
            || expectedSecret.equals(bearer);
    }

    public Map<String, Object> processWebhook(Map<String, Object> payload) {
        Map<String, Object> metadata = readMetadata(payload);

        String externalId = firstNonBlank(
            stringValue(payload.get("externalId")),
            stringValue(payload.get("external_id")),
            stringValue(payload.get("callId")),
            stringValue(payload.get("call_id")),
            stringValue(payload.get("sipCallId")),
            stringValue(payload.get("sip_call_id")),
            stringValue(payload.get("sip.callID")),
            stringValue(payload.get("executionId")),
            stringValue(payload.get("execution_id")),
            stringValue(payload.get("id"))
        );
        String leadId = firstNonBlank(
            stringValue(payload.get("leadId")),
            stringValue(payload.get("lead_id")),
            stringValue(metadata.get("leadId")),
            stringValue(metadata.get("lead_id"))
        );
        String status = normalizeStatus(firstNonBlank(
            stringValue(payload.get("status")),
            stringValue(payload.get("callStatus")),
            stringValue(payload.get("call_status")),
            stringValue(payload.get("event")),
            stringValue(payload.get("state"))
        ));
        String outcome = normalizeOutcome(firstNonBlank(
            stringValue(payload.get("outcome")),
            stringValue(payload.get("callOutcome")),
            stringValue(payload.get("call_outcome")),
            stringValue(payload.get("disposition")),
            stringValue(payload.get("result"))
        ));
        String transcript = extractTranscript(payload, metadata);
        String summary = firstNonBlank(
            stringValue(payload.get("summary")),
            stringValue(payload.get("note")),
            stringValue(payload.get("message")),
            stringValue(payload.get("recording_url"))
        );
        if (summary.isBlank() && !transcript.isBlank()) {
            summary = transcript.length() > 320 ? transcript.substring(0, 320) + "..." : transcript;
        }

        Optional<CommunicationRecord> callRecord = Optional.empty();
        if (!externalId.isBlank()) {
            callRecord = communicationRecordRepository
                .findFirstByChannelIgnoreCaseAndExternalIdOrderByCreatedAtDesc("CALL", externalId);
        }
        if (callRecord.isEmpty() && !leadId.isBlank()) {
            List<CommunicationRecord> leadCalls = communicationRecordRepository
                .findTop50ByLeadIdAndChannelIgnoreCaseOrderByCreatedAtDesc(leadId, "CALL");
            if (!leadCalls.isEmpty()) {
                callRecord = Optional.of(leadCalls.get(0));
            }
        }

        if (callRecord.isPresent()) {
            CommunicationRecord record = callRecord.get();
            if (!externalId.isBlank() && trim(record.getExternalId()).isBlank()) {
                record.setExternalId(externalId);
            }
            if (!status.isBlank()) {
                record.setStatus(status);
            }
            if (!leadId.isBlank() && trim(record.getLeadId()).isBlank()) {
                record.setLeadId(leadId);
            }
            String rawPayload = toJson(payload);
            if (!rawPayload.isBlank()) {
                record.setRawPayload(rawPayload);
            }
            communicationRecordRepository.save(record);
            if (leadId.isBlank()) {
                leadId = trim(record.getLeadId());
            }
        }

        Lead lead = null;
        if (!leadId.isBlank()) {
            lead = leadRepository.findById(leadId)
                .filter(l -> !Boolean.TRUE.equals(l.getDeleted()))
                .orElse(null);
        }

        String hotSignal = resolveHotSignal(payload, metadata, outcome);
        boolean assignedLead = false;
        if (lead != null) {
            if (!status.isBlank() && "NEW".equalsIgnoreCase(lead.getStatus().name()) && isConnectedStatus(status)) {
                lead.setStatus(Lead.LeadStatus.CONTACTED);
            }
            if (isConnectedStatus(status) || !outcome.isBlank()) {
                lead.setLastContactedAt(LocalDateTime.now());
            }

            if ("HOT".equals(hotSignal)) {
                lead.setScore(Lead.LeadScore.HOT);
                if (lead.getStatus() == Lead.LeadStatus.NEW || lead.getStatus() == Lead.LeadStatus.CONTACTED) {
                    lead.setStatus(Lead.LeadStatus.QUALIFIED);
                }
                assignedLead = assignIfUnassigned(lead);
            } else if ("WARM".equals(hotSignal) && lead.getScore() == Lead.LeadScore.COLD) {
                lead.setScore(Lead.LeadScore.WARM);
            }

            leadRepository.save(lead);
            saveLeadCallActivity(lead, status, outcome, externalId, summary, transcript, payload);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("externalId", externalId);
        response.put("leadId", lead != null ? lead.getId() : leadId);
        response.put("status", status);
        response.put("outcome", outcome);
        response.put("transcript", transcript);
        response.put("assignedHotLead", assignedLead);
        return response;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLeadCallHistory(String leadId) {
        ensureLeadExists(leadId);
        List<CommunicationRecord> calls = communicationRecordRepository
            .findTop50ByLeadIdAndChannelIgnoreCaseOrderByCreatedAtDesc(leadId, "CALL");
        List<Map<String, Object>> response = new ArrayList<>();
        for (CommunicationRecord call : calls) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", call.getId());
            row.put("leadId", call.getLeadId());
            row.put("status", call.getStatus());
            row.put("externalId", call.getExternalId());
            row.put("phone", call.getContactIdentifier());
            row.put("script", call.getBody());
            row.put("provider", call.getProvider());
            row.put("createdAt", call.getCreatedAt());
            row.put("rawPayload", call.getRawPayload());
            row.put("transcript", extractTranscriptFromRawPayload(call.getRawPayload()));
            response.add(row);
        }
        return response;
    }

    public Map<String, Object> retryCall(String callId) {
        CommunicationRecord record = communicationRecordRepository
            .findByIdAndChannelIgnoreCase(callId, "CALL")
            .orElseThrow(() -> new ResourceNotFoundException("Call record not found: " + callId));

        String phone = trim(record.getContactIdentifier());
        if (phone.isBlank()) {
            throw new IllegalStateException("Cannot retry call without phone number.");
        }

        Lead lead = null;
        String leadId = trim(record.getLeadId());
        if (!leadId.isBlank()) {
            lead = leadRepository.findById(leadId).orElse(null);
        }

        String leadName = lead != null ? trim(lead.getName()) : "";
        String script = trim(record.getBody());
        if (script.isBlank()) {
            script = "Hello, this is NexaCRM. We are calling to follow up on your enquiry.";
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("retryOfCallId", record.getId());
        if (!trim(record.getExternalId()).isBlank()) {
            metadata.put("previousExternalId", trim(record.getExternalId()));
        }

        communicationService.sendLeadVoiceCall(
            leadId,
            leadName,
            phone,
            script,
            "retry_call",
            metadata
        );

        if (lead != null) {
            lead.setLastContactedAt(LocalDateTime.now());
            leadRepository.save(lead);
        }

        return Map.of(
            "ok", true,
            "message", "Call retried successfully",
            "callId", record.getId(),
            "leadId", leadId,
            "phone", phone
        );
    }

    private Lead ensureLeadExists(String leadId) {
        return leadRepository.findById(leadId)
            .filter(l -> !Boolean.TRUE.equals(l.getDeleted()))
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + leadId));
    }

    private Map<String, Object> readMetadata(Map<String, Object> payload) {
        Object metadata = payload.get("metadata");
        if (metadata instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((k, v) -> normalized.put(String.valueOf(k), v));
            return normalized;
        }
        if (metadata instanceof String raw && !trim(raw).isBlank()) {
            try {
                return objectMapper.readValue(raw, MAP_TYPE);
            } catch (Exception ignored) {
                return Map.of();
            }
        }
        return Map.of();
    }

    private String extractTranscript(Map<String, Object> payload, Map<String, Object> metadata) {
        String direct = firstNonBlank(
            stringValue(payload.get("transcript")),
            stringValue(payload.get("finalTranscript")),
            stringValue(payload.get("final_transcript")),
            stringValue(payload.get("fullTranscript")),
            stringValue(payload.get("full_transcript"))
        );
        if (!direct.isBlank()) {
            return direct;
        }

        if (metadata != null && !metadata.isEmpty()) {
            direct = firstNonBlank(
                stringValue(metadata.get("transcript")),
                stringValue(metadata.get("finalTranscript")),
                stringValue(metadata.get("final_transcript"))
            );
            if (!direct.isBlank()) {
                return direct;
            }
        }

        Object transcriptObj = payload.get("transcripts");
        if (transcriptObj instanceof List<?> rows) {
            StringBuilder merged = new StringBuilder();
            for (Object row : rows) {
                if (row instanceof Map<?, ?> map) {
                    String speaker = trim(stringValue(map.get("speaker")));
                    String text = firstNonBlank(
                        stringValue(map.get("text")),
                        stringValue(map.get("transcript")),
                        stringValue(map.get("message"))
                    );
                    if (text.isBlank()) {
                        continue;
                    }
                    if (!merged.isEmpty()) {
                        merged.append("\n");
                    }
                    if (!speaker.isBlank()) {
                        merged.append("[").append(speaker).append("] ");
                    }
                    merged.append(text);
                }
            }
            return merged.toString();
        }

        return "";
    }

    private String extractTranscriptFromRawPayload(String rawPayload) {
        String raw = trim(rawPayload);
        if (raw.isBlank()) {
            return "";
        }
        try {
            Map<String, Object> map = objectMapper.readValue(raw, MAP_TYPE);
            String fromTopLevel = extractTranscript(map, readMetadata(map));
            if (!fromTopLevel.isBlank()) {
                return fromTopLevel;
            }
            Object response = map.get("response");
            if (response instanceof Map<?, ?> responseMap) {
                Map<String, Object> normalized = new LinkedHashMap<>();
                responseMap.forEach((k, v) -> normalized.put(String.valueOf(k), v));
                return extractTranscript(normalized, readMetadata(normalized));
            }
            return "";
        } catch (Exception ignored) {
            return "";
        }
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String resolveHotSignal(Map<String, Object> payload, Map<String, Object> metadata, String outcome) {
        String textualSignal = firstNonBlank(
            stringValue(payload.get("scoreLabel")),
            stringValue(payload.get("leadScore")),
            stringValue(payload.get("lead_score")),
            stringValue(metadata.get("scoreLabel")),
            stringValue(metadata.get("leadScore")),
            outcome
        ).toUpperCase(Locale.ROOT);

        if (textualSignal.contains("HOT")) return "HOT";
        if (textualSignal.contains("WARM")) return "WARM";

        Integer numericScore = parseInteger(
            firstNonBlank(
                stringValue(payload.get("scoreValue")),
                stringValue(payload.get("leadScoreValue")),
                stringValue(payload.get("lead_score_value")),
                stringValue(metadata.get("scoreValue")),
                stringValue(metadata.get("leadScoreValue")),
                stringValue(payload.get("score"))
            )
        );
        if (numericScore == null) return "";
        if (numericScore >= 75) return "HOT";
        if (numericScore >= 45) return "WARM";
        return "COLD";
    }

    private boolean assignIfUnassigned(Lead lead) {
        if (lead.getAssignedTo() != null) {
            return false;
        }
        String rawFlag = trim(integrationService.getConfig("voice_call_agent").get("autoAssignHotLead"));
        if (!rawFlag.isBlank() && !parseBooleanFlag(rawFlag)) {
            return false;
        }

        Optional<User> assignee = userRepository.findAll().stream()
            .filter(user -> !Boolean.TRUE.equals(user.getDeleted()))
            .filter(user -> Boolean.TRUE.equals(user.getIsActive()))
            .min(Comparator
                .comparingInt((User user) -> roleRank(user.getRole()))
                .thenComparing(user -> user.getCreatedAt() == null ? LocalDateTime.MAX : user.getCreatedAt()));

        if (assignee.isEmpty()) {
            return false;
        }

        User user = assignee.get();
        lead.setAssignedTo(user);
        notificationPublisher.notifyLeadAssigned(user.getEmail(), trim(lead.getName()));
        return true;
    }

    private int roleRank(User.Role role) {
        if (role == null) return 4;
        return switch (role) {
            case SALES_EXEC -> 1;
            case MANAGER -> 2;
            case ADMIN -> 3;
        };
    }

    private void saveLeadCallActivity(
        Lead lead,
        String status,
        String outcome,
        String externalId,
        String summary,
        String transcript,
        Map<String, Object> payload
    ) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("channel", "voice_call_agent");
        values.put("status", status);
        values.put("callOutcome", outcome);
        values.put("externalId", externalId);
        values.put("note", summary);
        values.put("transcript", transcript);
        values.put("phone", trim(lead.getPhone()));
        values.put("payload", payload);

        String cleanSummary = firstNonBlank(
            !outcome.isBlank() ? "Call outcome: " + outcome : "",
            !status.isBlank() ? "Call status: " + status : "",
            summary
        );
        if (cleanSummary.isBlank()) {
            cleanSummary = "AI call webhook update received";
        }

        LeadActivity activity = LeadActivity.builder()
            .leadId(lead.getId())
            .activityIndex(0)
            .activityId("act01")
            .activityLabel("Activity 01")
            .activityTitle("Call Outcome")
            .assignedTo(lead.getAssignedTo() != null ? trim(lead.getAssignedTo().getName()) : "AI Calling Agent")
            .summary(cleanSummary)
            .values(values)
            .savedAt(LocalDateTime.now())
            .build();
        activity.setTenantId(DEFAULT_TENANT);
        leadActivityRepository.save(activity);
    }

    private boolean isConnectedStatus(String status) {
        String normalized = normalizeStatus(status);
        return normalized.contains("CONNECTED")
            || normalized.contains("ANSWERED")
            || normalized.contains("COMPLETED")
            || normalized.contains("SUCCESS");
    }

    private String normalizeStatus(String status) {
        String normalized = trim(status)
            .toUpperCase(Locale.ROOT)
            .replace(' ', '_')
            .replace('-', '_');
        return normalized.isBlank() ? "RECEIVED" : normalized;
    }

    private String normalizeOutcome(String outcome) {
        return trim(outcome).toLowerCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!trim(value).isBlank()) {
                return trim(value);
            }
        }
        return "";
    }

    private boolean parseBooleanFlag(String raw) {
        String normalized = trim(raw).toLowerCase(Locale.ROOT);
        return "true".equals(normalized)
            || "1".equals(normalized)
            || "yes".equals(normalized)
            || "on".equals(normalized)
            || "enabled".equals(normalized);
    }

    private Integer parseInteger(String raw) {
        String value = trim(raw);
        if (value.isBlank()) return null;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
