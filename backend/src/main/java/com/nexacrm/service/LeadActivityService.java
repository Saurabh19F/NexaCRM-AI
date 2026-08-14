package com.nexacrm.service;

import com.nexacrm.dto.LeadActivityDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Lead;
import com.nexacrm.model.LeadActivity;
import com.nexacrm.repository.LeadActivityRepository;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.repository.UserRepository;
import com.nexacrm.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Optional;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class LeadActivityService {
    private Long tenantId() {
        return TenantContext.currentTenantId();
    }

    private final LeadActivityRepository leadActivityRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    @Transactional(readOnly = true)
    public List<LeadActivityDTO> listByLeadId(String leadId) {
        ensureLeadVisible(ensureLeadExists(leadId));
        return leadActivityRepository
            .findByLeadIdAndTenantIdAndDeletedFalseOrderBySavedAtDesc(leadId, tenantId())
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, List<LeadActivityDTO>> listByLeadIds(Collection<String> requestedLeadIds) {
        Set<String> leadIds = requestedLeadIds == null
            ? Set.of()
            : requestedLeadIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .limit(500)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, List<LeadActivityDTO>> grouped = new LinkedHashMap<>();
        leadIds.forEach(id -> grouped.put(id, new ArrayList<>()));
        if (leadIds.isEmpty()) {
            return grouped;
        }

        var current = currentUser();
        boolean canSeeAll = current == null
            || com.nexacrm.model.User.isAdminLike(current.getRole())
            || current.getRole() == com.nexacrm.model.User.Role.MANAGER;
        String currentUserId = current != null ? current.getId() : null;

        Set<String> visibleLeadIds = leadRepository.findByIdInAndTenantIdAndDeletedFalse(leadIds, tenantId()).stream()
            .filter(lead -> canSeeAll || (
                currentUserId != null
                    && lead.getAssignedTo() != null
                    && currentUserId.equals(lead.getAssignedTo().getId())
            ))
            .map(Lead::getId)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        if (visibleLeadIds.isEmpty()) {
            return grouped;
        }

        fetchBulkActivityPreview(visibleLeadIds)
            .forEach(activity -> {
                if (activity.getLeadId() != null && grouped.containsKey(activity.getLeadId())) {
                    grouped.get(activity.getLeadId()).add(toDTO(activity));
                }
            });

        return grouped;
    }

    private List<LeadActivity> fetchBulkActivityPreview(Set<String> visibleLeadIds) {
        List<Document> pipeline = List.of(
            new Document("$match", new Document("tenant_id", tenantId())
                .append("deleted", false)
                .append("lead_id", new Document("$in", new ArrayList<>(visibleLeadIds)))),
            new Document("$sort", new Document("lead_id", 1)
                .append("activity_index", 1)
                .append("saved_at", -1)
                .append("createdAt", -1)),
            new Document("$group", new Document("_id", new Document("leadId", "$lead_id")
                    .append("activityIndex", "$activity_index"))
                .append("activity", new Document("$first", "$$ROOT"))),
            new Document("$replaceRoot", new Document("newRoot", "$activity")),
            new Document("$sort", new Document("lead_id", 1)
                .append("saved_at", -1)
                .append("createdAt", -1))
        );

        List<LeadActivity> activities = new ArrayList<>();
        mongoTemplate.getCollection("lead_activities")
            .aggregate(pipeline)
            .allowDiskUse(true)
            .forEach(doc -> activities.add(mongoTemplate.getConverter().read(LeadActivity.class, doc)));
        return activities;
    }

    public LeadActivityDTO create(String leadId, LeadActivityDTO dto) {
        Lead lead = ensureLeadExists(leadId);
        ensureLeadVisible(lead);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime savedAt = dto.getSavedAt() != null ? dto.getSavedAt() : now;
        Map<String, Object> values = dto.getValues() != null ? new LinkedHashMap<>(dto.getValues()) : new LinkedHashMap<>();
        String assignedTo = resolveAssignedTo(lead, dto, values);
        applyActivityDefaults(lead, dto, values, savedAt, assignedTo);
        applyLeadPipelineStatusFromActivity(lead, dto, values, savedAt);
        String summary = firstNonBlank(dto.getSummary(), buildSummary(values));

        LeadActivity activity = LeadActivity.builder()
            .leadId(leadId)
            .activityIndex(dto.getActivityIndex())
            .activityId(dto.getActivityId())
            .activityLabel(dto.getActivityLabel())
            .activityTitle(dto.getActivityTitle())
            .assignedTo(assignedTo)
            .summary(summary)
            .values(values)
            .savedAt(savedAt)
            .build();
        activity.setTenantId(tenantId());

        LeadActivity saved = leadActivityRepository.save(activity);

        lead.setLastContactedAt(savedAt);
        List<String> activityLogs = lead.getActivityLogs() != null ? new ArrayList<>(lead.getActivityLogs()) : new ArrayList<>();
        String logEntry = savedAt + " | " + firstNonBlank(dto.getActivityTitle(), dto.getActivityLabel()) + " | " + firstNonBlank(summary, "Activity recorded");
        activityLogs.add(0, logEntry);
        if (activityLogs.size() > 25) {
            activityLogs = activityLogs.subList(0, 25);
        }
        lead.setActivityLogs(activityLogs);
        leadRepository.save(lead);

        return toDTO(saved);
    }

    private void applyLeadPipelineStatusFromActivity(Lead lead, LeadActivityDTO dto, Map<String, Object> values, LocalDateTime savedAt) {
        if (lead == null || dto == null || dto.getActivityIndex() == null) {
            return;
        }

        Lead.LeadStatus nextStatus = resolveLeadStatusFromActivity(dto.getActivityIndex(), values);
        if (nextStatus != null) {
            lead.setStatus(nextStatus);
            if (nextStatus == Lead.LeadStatus.WON) {
                if (lead.getConvertedAt() == null) {
                    lead.setConvertedAt(savedAt);
                }
                BigDecimal revenue = parseMoney(stringValue(values.get("revenueValue")));
                BigDecimal finalPrice = parseMoney(stringValue(values.get("meetingPriceFinal")));
                if (finalPrice != null) {
                    lead.setDealValue(finalPrice);
                }
                if (revenue == null && isAffirmative(values.get("paymentReceived"))) {
                    revenue = finalPrice != null ? finalPrice : lead.getDealValue();
                }
                if (revenue == null && stringValue(values.get("paymentReceived")).isBlank()) {
                    revenue = lead.getRevenueValue() != null ? lead.getRevenueValue() : lead.getDealValue();
                }
                if (revenue != null) {
                    lead.setRevenueValue(revenue);
                }
                lead.setLostReason(null);
            } else if (nextStatus == Lead.LeadStatus.LOST) {
                String lostReason = firstNonBlank(
                    stringValue(values.get("lostCategory")),
                    stringValue(values.get("remarkLost")),
                    stringValue(values.get("remark")),
                    stringValue(values.get("remarks")),
                    stringValue(values.get("note"))
                );
                if (lostReason != null && !lostReason.isBlank()) {
                    lead.setLostReason(lostReason);
                }
            }
        }

        parseFollowUpDate(firstNonBlank(
            stringValue(values.get("nextFollowUpDate")),
            stringValue(values.get("followUpDate")),
            stringValue(values.get("callbackAt"))
        )).ifPresent(lead::setFollowUpDate);
    }

    private Lead.LeadStatus resolveLeadStatusFromActivity(Integer activityIndex, Map<String, Object> values) {
        String status = normalizeStatusText(firstNonBlank(
            stringValue(values.get("status")),
            stringValue(values.get("connectionStatus")),
            stringValue(values.get("callOutcome")),
            stringValue(values.get("meetingStatus")),
            stringValue(values.get("outcome")),
            stringValue(values.get("remarkStatus"))
        ));

        if (activityIndex == 0) {
            if (containsAny(status, "not interested", "not_interested")) return Lead.LeadStatus.LOST;
            if (containsAny(status, "connected", "not connected", "non connected", "no answer", "callback", "busy", "wrong number", "done")) return Lead.LeadStatus.CONTACTED;
            return null;
        }
        if (activityIndex == 1) {
            if (containsAny(status, "not interested", "not_interested")) return Lead.LeadStatus.LOST;
            if (containsAny(status, "meeting")) return Lead.LeadStatus.QUALIFIED;
            if (containsAny(status, "follow")) return Lead.LeadStatus.CONTACTED;
            return null;
        }
        if (activityIndex == 2) {
            if (containsAny(status, "success")) return Lead.LeadStatus.PROPOSAL;
            if (containsAny(status, "reschedule", "fail")) return Lead.LeadStatus.QUALIFIED;
            return null;
        }
        if (activityIndex == 3) {
            if (containsAny(status, "won", "win", "closed won")) return Lead.LeadStatus.WON;
            if (containsAny(status, "lost", "closed lost")) return Lead.LeadStatus.LOST;
            if (containsAny(status, "negoti", "pending", "pending review", "follow", "hold", "no response")) return Lead.LeadStatus.NEGOTIATION;
        }
        return null;
    }

    private Lead ensureLeadExists(String leadId) {
        return leadRepository.findByIdAndTenantIdAndDeletedFalse(leadId, tenantId())
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + leadId));
    }

    private void ensureLeadVisible(Lead lead) {
        if (!canCurrentUserAccess(lead)) {
            throw new ResourceNotFoundException("Lead not found: " + lead.getId());
        }
    }

    private boolean canCurrentUserAccess(Lead lead) {
        var current = currentUser();
        if (current == null || com.nexacrm.model.User.isAdminLike(current.getRole()) || current.getRole() == com.nexacrm.model.User.Role.MANAGER) {
            return true;
        }
        if (current.getId() == null || current.getId().isBlank() || lead == null) {
            return false;
        }
        return lead.getAssignedTo() != null && current.getId().equals(lead.getAssignedTo().getId());
    }

    private String buildSummary(Map<String, Object> values) {
        if (values == null || values.isEmpty()) return "No extra details";
        return values.entrySet().stream()
            .filter(e -> e.getValue() != null && !stringValue(e.getValue()).isBlank())
            .map(e -> e.getKey() + ": " + stringValue(e.getValue()))
            .collect(Collectors.joining(" | "));
    }

    private void applyActivityDefaults(Lead lead, LeadActivityDTO dto, Map<String, Object> values, LocalDateTime savedAt, String assignedTo) {
        if (dto.getActivityIndex() == null || dto.getActivityIndex() != 0) {
            applyGenericDefaults(values, savedAt, assignedTo);
            if (dto.getActivityIndex() != null && dto.getActivityIndex() == 1) {
                applyActivityTwoDefaults(lead, values, savedAt, assignedTo);
            } else if (dto.getActivityIndex() != null && dto.getActivityIndex() == 2) {
                applyActivityThreeDefaults(lead, values, savedAt, assignedTo);
            } else if (dto.getActivityIndex() != null && dto.getActivityIndex() == 3) {
                applyActivityFourDefaults(lead, values, savedAt, assignedTo);
            }
            return;
        }

        LocalDateTime plannedDate = lead.getCreatedAt() != null ? lead.getCreatedAt() : savedAt;
        String source = lead.getSource() != null ? lead.getSource().name() : stringValue(values.get("source"));
        String serviceRequirement = firstNonBlank(lead.getService(), lead.getSpecialization(), stringValue(values.get("serviceRequirement")));
        String connectionStatus = normalizeConnectionStatus(
            firstNonBlank(
                stringValue(values.get("connectionStatus")),
                stringValue(values.get("callOutcome")),
                stringValue(values.get("status"))
            )
        );
        String remarks = firstNonBlank(
            stringValue(values.get("remark")),
            stringValue(values.get("remarks")),
            stringValue(values.get("note"))
        );
        String nextFollowUpDate = firstNonBlank(
            stringValue(values.get("nextFollowUpDate")),
            stringValue(values.get("followUpDate"))
        );
        double delayHours = Math.abs(Duration.between(plannedDate, savedAt).toMinutes() / 60.0);

        values.put("source", source);
        values.put("serviceRequirement", serviceRequirement);
        values.put("plannedDate", plannedDate.toString());
        values.put("actualDate", savedAt.toString());
        values.put("actual", savedAt.toString());
        values.put("delayHours", roundOneDecimal(delayHours));
        values.put("delay", roundOneDecimal(delayHours));
        values.put("actualDateStatus", computeActualDateStatus(plannedDate, savedAt));
        values.put("assignedTo", assignedTo);

        if (connectionStatus != null && !connectionStatus.isBlank()) {
            values.put("connectionStatus", connectionStatus);
            values.put("callOutcome", connectionStatus);
        }
        if (remarks != null && !remarks.isBlank()) {
            values.put("remark", remarks);
            values.put("remarks", remarks);
        }
        if (nextFollowUpDate != null && !nextFollowUpDate.isBlank()) {
            values.put("nextFollowUpDate", nextFollowUpDate);
            values.put("followUpDate", nextFollowUpDate);
        }
    }

    private void applyGenericDefaults(Map<String, Object> values, LocalDateTime savedAt, String assignedTo) {
        values.put("actualDate", savedAt.toString());
        values.put("actual", savedAt.toString());
        values.put("actualDateStatus", "On Time");
        if (assignedTo != null && !assignedTo.isBlank()) {
            values.putIfAbsent("assignedTo", assignedTo);
        }
    }

    private void applyActivityTwoDefaults(Lead lead, Map<String, Object> values, LocalDateTime savedAt, String assignedTo) {
        LocalDateTime plannedDate = resolvePreviousActivityActualDate(lead.getId(), 0)
            .orElseGet(() -> lead.getCreatedAt() != null ? lead.getCreatedAt() : savedAt);
        String status = normalizeActivityTwoStatus(firstNonBlank(
            stringValue(values.get("status")),
            stringValue(values.get("remarkStatus"))
        ));
        String remark = firstNonBlank(stringValue(values.get("remark")), stringValue(values.get("remarks")), stringValue(values.get("note")));
        String nextFollowUpDate = firstNonBlank(stringValue(values.get("nextFollowUpDate")), stringValue(values.get("followUpDate")));
        double delayHours = Math.abs(Duration.between(plannedDate, savedAt).toMinutes() / 60.0);

        values.put("plannedDate", plannedDate.toString());
        values.put("actualDate", savedAt.toString());
        values.put("actual", savedAt.toString());
        values.put("delayHours", roundOneDecimal(delayHours));
        values.put("delay", roundOneDecimal(delayHours));
        values.put("actualDateStatus", computeActualDateStatus(plannedDate, savedAt));
        values.put("assignedTo", assignedTo);

        if (status != null && !status.isBlank()) {
            values.put("status", status);
        }
        if (remark != null && !remark.isBlank()) {
            values.put("remark", remark);
            values.put("remarks", remark);
        }
        if (nextFollowUpDate != null && !nextFollowUpDate.isBlank()) {
            values.put("nextFollowUpDate", nextFollowUpDate);
            values.put("followUpDate", nextFollowUpDate);
        }
    }

    private void applyActivityThreeDefaults(Lead lead, Map<String, Object> values, LocalDateTime savedAt, String assignedTo) {
        LocalDateTime plannedDate = resolvePreviousActivityActualDate(lead.getId(), 1)
            .orElseGet(() -> lead.getCreatedAt() != null ? lead.getCreatedAt() : savedAt);
        String status = normalizeActivityThreeStatus(firstNonBlank(
            stringValue(values.get("status")),
            stringValue(values.get("meetingStatus"))
        ));
        String remark = firstNonBlank(stringValue(values.get("remark")), stringValue(values.get("remarks")), stringValue(values.get("note")));
        double delayHours = Math.abs(Duration.between(plannedDate, savedAt).toMinutes() / 60.0);

        values.put("plannedDate", plannedDate.toString());
        values.put("actualDate", savedAt.toString());
        values.put("actual", savedAt.toString());
        values.put("delayHours", roundOneDecimal(delayHours));
        values.put("delay", roundOneDecimal(delayHours));
        values.put("actualDateStatus", computeActualDateStatus(plannedDate, savedAt));
        values.put("assignedTo", assignedTo);

        if (status != null && !status.isBlank()) {
            values.put("status", status);
            values.put("meetingStatus", status);
        }
        if (remark != null && !remark.isBlank()) {
            values.put("remark", remark);
            values.put("remarks", remark);
        }
    }

    private void applyActivityFourDefaults(Lead lead, Map<String, Object> values, LocalDateTime savedAt, String assignedTo) {
        LocalDateTime plannedDate = resolvePreviousActivityActualDate(lead.getId(), 2)
            .orElseGet(() -> lead.getCreatedAt() != null ? lead.getCreatedAt() : savedAt);
        String status = normalizeActivityFourStatus(firstNonBlank(
            stringValue(values.get("status")),
            stringValue(values.get("outcome"))
        ));
        String remark = firstNonBlank(
            stringValue(values.get("remark")),
            stringValue(values.get("remarks")),
            stringValue(values.get("note")),
            stringValue(values.get("remarkFollowUp")),
            stringValue(values.get("remarkWon")),
            stringValue(values.get("remarkLost"))
        );
        String followUpDate = firstNonBlank(
            stringValue(values.get("followUpDate")),
            stringValue(values.get("nextFollowUpDate"))
        );
        String lostCategory = firstNonBlank(stringValue(values.get("lostCategory")));
        String paymentReceived = firstNonBlank(stringValue(values.get("paymentReceived")));
        String meetingPriceFinal = firstNonBlank(stringValue(values.get("meetingPriceFinal")));
        String calendarStatus = firstNonBlank(stringValue(values.get("calendarStatus")));
        double delayHours = Math.abs(Duration.between(plannedDate, savedAt).toMinutes() / 60.0);

        values.put("plannedDate", plannedDate.toString());
        values.put("actualDate", savedAt.toString());
        values.put("actual", savedAt.toString());
        values.put("delayHours", roundOneDecimal(delayHours));
        values.put("delay", roundOneDecimal(delayHours));
        values.put("actualDateStatus", computeActualDateStatus(plannedDate, savedAt));
        values.put("assignedTo", assignedTo);

        if (status != null && !status.isBlank()) {
            values.put("status", status);
        }
        if (remark != null && !remark.isBlank()) {
            values.put("remark", remark);
            values.put("remarks", remark);
        }
        if (followUpDate != null && !followUpDate.isBlank()) {
            values.put("followUpDate", followUpDate);
            values.put("nextFollowUpDate", followUpDate);
        }
        if (lostCategory != null && !lostCategory.isBlank()) {
            values.put("lostCategory", lostCategory);
        }
        if (paymentReceived != null && !paymentReceived.isBlank()) {
            values.put("paymentReceived", paymentReceived);
        }
        if (meetingPriceFinal != null && !meetingPriceFinal.isBlank()) {
            values.put("meetingPriceFinal", meetingPriceFinal);
        }
        if (calendarStatus != null && !calendarStatus.isBlank()) {
            values.put("calendarStatus", calendarStatus);
        }
    }

    private Optional<LocalDateTime> resolvePreviousActivityActualDate(String leadId, int activityIndex) {
        return leadActivityRepository.findByLeadIdAndTenantIdAndDeletedFalseOrderBySavedAtDesc(leadId, tenantId()).stream()
            .filter(activity -> activity.getActivityIndex() != null && activity.getActivityIndex() == activityIndex)
            .findFirst()
            .map(this::extractActivityActualDate);
    }

    private LocalDateTime extractActivityActualDate(LeadActivity activity) {
        if (activity == null) return null;
        Map<String, Object> values = activity.getValues();
        String raw = firstNonBlank(
            values != null ? stringValue(values.get("actualDate")) : null,
            values != null ? stringValue(values.get("actual")) : null,
            activity.getSavedAt() != null ? activity.getSavedAt().toString() : null
        );
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDateTime.parse(raw);
        } catch (Exception ignored) {
            return activity.getSavedAt();
        }
    }

    private String resolveAssignedTo(Lead lead, LeadActivityDTO dto, Map<String, Object> values) {
        String explicit = firstNonBlank(dto.getAssignedTo(), stringValue(values.get("assignedTo")));
        if (explicit != null) {
            return explicit;
        }
        if (lead.getAssignedTo() != null) {
            return firstNonBlank(lead.getAssignedTo().getName(), lead.getAssignedTo().getEmail());
        }
        String currentUser = currentUserName();
        return currentUser != null ? currentUser : "Sales Team";
    }

    private String currentUserName() {
        com.nexacrm.model.User current = currentUser();
        return current != null ? firstNonBlank(current.getName(), current.getEmail()) : null;
    }

    private com.nexacrm.model.User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailAndTenantIdAndDeletedFalse(email, tenantId())
            .orElse(null);
    }

    private String normalizeConnectionStatus(String value) {
        String normalized = stringValue(value).toLowerCase(Locale.ROOT);
        if (normalized.contains("not") || normalized.contains("non")) return "Not Connected";
        if (normalized.contains("connect")) return "Connected";
        return "";
    }

    private String normalizeActivityTwoStatus(String value) {
        String normalized = stringValue(value).toLowerCase(Locale.ROOT);
        if (normalized.contains("meeting")) return "Meeting";
        if (normalized.contains("follow")) return "Follow Up";
        if (normalized.contains("not")) return "Not Interested";
        return "";
    }

    private String normalizeActivityThreeStatus(String value) {
        String normalized = stringValue(value).toLowerCase(Locale.ROOT);
        if (normalized.contains("success")) return "Successful";
        if (normalized.contains("reschedule") || normalized.contains("fail")) return "Reschedule";
        return "";
    }

    private String normalizeActivityFourStatus(String value) {
        String normalized = stringValue(value).toLowerCase(Locale.ROOT);
        if (normalized.contains("negoti")) return "Negotiation";
        if (normalized.contains("pending")) return "Pending Review";
        if (normalized.contains("won") || normalized.contains("win")) return "Won";
        if (normalized.contains("lost")) return "Lost";
        if (normalized.contains("hold") || normalized.contains("follow") || normalized.contains("no response")) return "Hold";
        return "";
    }

    private Optional<LocalDateTime> parseFollowUpDate(String value) {
        String raw = stringValue(value);
        if (raw.isBlank()) return Optional.empty();
        try {
            if (raw.length() == 10) {
                return Optional.of(LocalDate.parse(raw).atStartOfDay());
            }
            return Optional.of(LocalDateTime.parse(raw));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private BigDecimal parseMoney(String value) {
        String raw = stringValue(value).replace(",", "");
        if (raw.isBlank()) return null;
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isAffirmative(Object value) {
        String normalized = normalizeStatusText(stringValue(value));
        return normalized.equals("yes") || normalized.equals("true") || normalized.equals("paid") || normalized.equals("received");
    }

    private boolean containsAny(String normalized, String... needles) {
        if (normalized == null || normalized.isBlank() || needles == null) return false;
        for (String needle : needles) {
            if (needle != null && !needle.isBlank() && normalized.contains(normalizeStatusText(needle))) {
                return true;
            }
        }
        return false;
    }

    private String normalizeStatusText(String value) {
        return stringValue(value)
            .toLowerCase(Locale.ROOT)
            .replace('-', ' ')
            .replace('_', ' ')
            .replaceAll("\\s+", " ")
            .trim();
    }

    private String computeActualDateStatus(LocalDateTime plannedDate, LocalDateTime actualDate) {
        if (plannedDate == null || actualDate == null) return "On Time";
        long minutes = Duration.between(plannedDate, actualDate).toMinutes();
        if (Math.abs(minutes) < 1) return "On Time";
        if (minutes > 0) return "Delayed";
        return "Early";
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private LeadActivityDTO toDTO(LeadActivity activity) {
        return LeadActivityDTO.builder()
            .id(activity.getId())
            .leadId(activity.getLeadId())
            .activityIndex(activity.getActivityIndex())
            .activityId(activity.getActivityId())
            .activityLabel(activity.getActivityLabel())
            .activityTitle(activity.getActivityTitle())
            .assignedTo(activity.getAssignedTo())
            .summary(activity.getSummary())
            .values(activity.getValues())
            .savedAt(activity.getSavedAt())
            .createdAt(activity.getCreatedAt())
            .updatedAt(activity.getUpdatedAt())
            .build();
    }
}
