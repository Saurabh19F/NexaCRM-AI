package com.nexacrm.service;

import com.nexacrm.dto.LeadActivityDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Lead;
import com.nexacrm.model.LeadActivity;
import com.nexacrm.repository.LeadActivityRepository;
import com.nexacrm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service

@RequiredArgsConstructor
@Transactional
public class LeadActivityService {

    private static final Long DEFAULT_TENANT = 1L;

    private final LeadActivityRepository leadActivityRepository;
    private final LeadRepository leadRepository;

    @Transactional(readOnly = true)
    public List<LeadActivityDTO> listByLeadId(String leadId) {
        ensureLeadExists(leadId);
        return leadActivityRepository
            .findByLeadIdAndTenantIdAndDeletedFalseOrderBySavedAtDesc(leadId, DEFAULT_TENANT)
            .stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public LeadActivityDTO create(String leadId, LeadActivityDTO dto) {
        Lead lead = ensureLeadExists(leadId);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime savedAt = dto.getSavedAt() != null ? dto.getSavedAt() : now;
        Map<String, Object> values = dto.getValues();
        String assignedTo = firstNonBlank(dto.getAssignedTo(), values != null ? stringValue(values.get("assignedTo")) : null);
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
        activity.setTenantId(DEFAULT_TENANT);

        LeadActivity saved = leadActivityRepository.save(activity);

        lead.setLastContactedAt(savedAt);
        leadRepository.save(lead);

        return toDTO(saved);
    }

    private Lead ensureLeadExists(String leadId) {
        return leadRepository.findByIdAndTenantIdAndDeletedFalse(leadId, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("Lead not found: " + leadId));
    }

    private String buildSummary(Map<String, Object> values) {
        if (values == null || values.isEmpty()) return "No extra details";
        return values.entrySet().stream()
            .filter(e -> e.getValue() != null && !stringValue(e.getValue()).isBlank())
            .map(e -> e.getKey() + ": " + stringValue(e.getValue()))
            .collect(Collectors.joining(" | "));
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
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
