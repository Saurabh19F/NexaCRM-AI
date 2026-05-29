package com.nexacrm.service;

import com.nexacrm.automation.WorkflowEngine;
import com.nexacrm.dto.DealDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Deal;
import com.nexacrm.repository.LeadRepository;
import com.nexacrm.repository.DealRepository;
import com.nexacrm.repository.UserRepository;
import com.nexacrm.websocket.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DealService {

    private final DealRepository dealRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final NotificationPublisher notificationPublisher;
    private final WorkflowEngine workflowEngine;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public PageResponse<DealDTO> findAll(String stage, String ownerId, Long pipelineId, Pageable pageable) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(DEFAULT_TENANT));
        query.addCriteria(Criteria.where("deleted").ne(true));

        Deal.DealStage stageEnum = parseStage(stage);
        if (stageEnum != null) {
            query.addCriteria(Criteria.where("stage").is(stageEnum));
        }
        if (ownerId != null && !ownerId.isBlank()) {
            query.addCriteria(Criteria.where("owner.$id").is(ownerId));
        }
        if (pipelineId != null) {
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("pipeline_id").is(pipelineId),
                Criteria.where("pipeline_id").is(null),
                Criteria.where("pipeline_id").exists(false)
            ));
        }

        long total = mongoTemplate.count(query, Deal.class);
        query.with(pageable);
        List<Deal> content = mongoTemplate.find(query, Deal.class);
        Page<Deal> page = new PageImpl<>(content, pageable, total);

        Map<String, String> ownerNameById = buildOwnerNameById(content);
        Map<String, String> companyByLeadId = buildCompanyByLeadId(content);

        return PageResponse.<DealDTO>builder()
            .content(page.getContent().stream()
                .map(deal -> toDTO(deal, ownerNameById, companyByLeadId))
                .collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .total(page.getTotalElements()).totalPages(page.getTotalPages())
            .first(page.isFirst()).last(page.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public Map<String, List<DealDTO>> getBoardView(Long pipelineId) {
        Map<String, List<DealDTO>> board = new LinkedHashMap<>();
        for (Deal.DealStage stage : Deal.DealStage.values()) {
            board.put(stage.name().toLowerCase(), new ArrayList<>());
        }

        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(DEFAULT_TENANT));
        query.addCriteria(Criteria.where("deleted").ne(true));
        if (pipelineId != null) {
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("pipeline_id").is(pipelineId),
                Criteria.where("pipeline_id").is(null),
                Criteria.where("pipeline_id").exists(false)
            ));
        }
        List<Deal> deals = mongoTemplate.find(query, Deal.class);

        Map<String, String> ownerNameById = buildOwnerNameById(deals);
        Map<String, String> companyByLeadId = buildCompanyByLeadId(deals);

        for (Deal deal : deals) {
            String stageKey = (deal.getStage() != null ? deal.getStage() : Deal.DealStage.NEW).name().toLowerCase();
            List<DealDTO> bucket = board.computeIfAbsent(stageKey, key -> new ArrayList<>());
            bucket.add(toDTO(deal, ownerNameById, companyByLeadId));
        }

        return board;
    }

    @Transactional(readOnly = true)
    public DealDTO findById(String id) {
        return dealRepository.findByIdAndTenantIdAndDeletedFalse(id, DEFAULT_TENANT)
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));
    }

    public DealDTO create(DealDTO dto) {
        Deal deal = fromDTO(dto);
        deal.setTenantId(DEFAULT_TENANT);
        Deal saved = dealRepository.save(deal);
        workflowEngine.processEvent("DEAL_CREATED", Map.of(
            "dealId", saved.getId(),
            "stage", saved.getStage() != null ? saved.getStage().name() : "UNKNOWN"
        ));
        return toDTO(saved);
    }

    public DealDTO update(String id, DealDTO dto) {
        Deal deal = dealRepository.findByIdAndTenantIdAndDeletedFalse(id, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));

        deal.setTitle(dto.getTitle());
        deal.setDescription(dto.getDescription());
        if (dto.getDealValue() != null) deal.setDealValue(dto.getDealValue());
        if (dto.getPriority() != null)  deal.setPriority(dto.getPriority());
        if (dto.getExpectedCloseDate() != null) deal.setExpectedCloseDate(dto.getExpectedCloseDate());
        if (dto.getPipelineId() != null) deal.setPipelineId(dto.getPipelineId());
        if (dto.getLeadId() != null) {
            if (dto.getLeadId().isBlank()) {
                deal.setLead(null);
            } else {
                leadRepository.findById(dto.getLeadId()).ifPresent(deal::setLead);
            }
        }
        if (dto.getOwnerId() != null) {
            if (dto.getOwnerId().isBlank()) {
                deal.setOwner(null);
            } else {
                userRepository.findById(dto.getOwnerId()).ifPresent(deal::setOwner);
            }
        }
        deal.setNotes(dto.getNotes());

        return toDTO(dealRepository.save(deal));
    }

    public DealDTO moveStage(String id, String stageName) {
        Deal deal = dealRepository.findByIdAndTenantIdAndDeletedFalse(id, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));

        Deal.DealStage newStage;
        try {
            newStage = Deal.DealStage.valueOf(stageName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid stage: " + stageName + ". Valid values: " +
                java.util.Arrays.toString(Deal.DealStage.values()));
        }
        String prevStage = deal.getStage() != null ? deal.getStage().name() : "UNKNOWN";
        deal.setStage(newStage);
        Deal saved = dealRepository.save(deal);

        // Notify deal owner if owner email exists. Notification failures should never block a stage move.
        String ownerEmail = saved.getOwner() != null ? saved.getOwner().getEmail() : null;
        if (StringUtils.hasText(ownerEmail)) {
            try {
                notificationPublisher.notifyDealStageChange(ownerEmail, saved.getTitle(), newStage.name());
            } catch (Exception ex) {
                log.warn("Failed to publish deal stage notification for deal {}: {}", id, ex.getMessage());
            }
        } else if (saved.getOwner() != null) {
            log.warn("Skipping deal stage notification for deal {} because owner email is missing", id);
        }

        log.info("Deal {} moved from {} to {}", id, prevStage, newStage);
        workflowEngine.processEvent("DEAL_STAGE_CHANGED", Map.of(
            "dealId", saved.getId(),
            "fromStage", prevStage,
            "toStage", newStage.name()
        ));
        return toDTO(saved);
    }

    public void delete(String id) {
        Deal deal = dealRepository.findByIdAndTenantIdAndDeletedFalse(id, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));
        deal.setDeleted(true);
        dealRepository.save(deal);
    }

    public List<Map<String, Object>> getActivities(String dealId) {
        // In production: query deal_activities table
        return List.of(
            Map.of("type", "CALL",  "title", "Discovery call", "time", "2 days ago"),
            Map.of("type", "EMAIL", "title", "Sent proposal",  "time", "1 day ago")
        );
    }

    public Map<String, Object> addActivity(String dealId, Map<String, Object> activity) {
        // In production: insert into deal_activities
        return Map.of("id", System.currentTimeMillis(), "dealId", dealId, "status", "logged");
    }

    // ── Mapping ───────────────────────────────────────────────────

    private Map<String, String> buildOwnerNameById(List<Deal> deals) {
        Set<String> ownerIds = deals.stream()
            .map(deal -> deal.getOwner() != null ? deal.getOwner().getId() : null)
            .filter(id -> id != null && !id.isBlank())
            .collect(Collectors.toCollection(LinkedHashSet::new));

        if (ownerIds.isEmpty()) return Map.of();

        Map<String, String> result = new LinkedHashMap<>();
        for (var user : userRepository.findAllById(ownerIds)) {
            if (user == null || user.getId() == null || user.getId().isBlank()) continue;
            result.putIfAbsent(user.getId(), user.getName() != null ? user.getName() : "");
        }
        return result;
    }

    private Map<String, String> buildCompanyByLeadId(List<Deal> deals) {
        Set<String> leadIds = deals.stream()
            .map(deal -> deal.getLead() != null ? deal.getLead().getId() : null)
            .filter(id -> id != null && !id.isBlank())
            .collect(Collectors.toCollection(LinkedHashSet::new));

        if (leadIds.isEmpty()) return Map.of();

        Map<String, String> result = new LinkedHashMap<>();
        for (var lead : leadRepository.findAllById(leadIds)) {
            if (lead == null || lead.getId() == null || lead.getId().isBlank()) continue;
            result.putIfAbsent(lead.getId(), lead.getCompany() != null ? lead.getCompany() : "");
        }
        return result;
    }

    private Deal.DealStage parseStage(String stage) {
        if (stage == null || stage.isBlank()) return null;
        return Deal.DealStage.valueOf(stage.toUpperCase());
    }

    private DealDTO toDTO(Deal d, Map<String, String> ownerNameById, Map<String, String> companyByLeadId) {
        String ownerId = d.getOwner() != null ? d.getOwner().getId() : null;
        String leadId = d.getLead() != null ? d.getLead().getId() : null;
        String ownerName = ownerId != null ? ownerNameById.get(ownerId) : null;
        String company = leadId != null ? companyByLeadId.get(leadId) : null;

        return DealDTO.builder()
            .id(d.getId())
            .title(d.getTitle())
            .description(d.getDescription())
            .stage(d.getStage())
            .priority(d.getPriority())
            .dealValue(d.getDealValue())
            .expectedCloseDate(d.getExpectedCloseDate())
            .actualCloseDate(d.getActualCloseDate())
            .winProbability(d.getWinProbability())
            .pipelineId(d.getPipelineId())
            .leadId(leadId)
            .company(company)
            .ownerId(ownerId)
            .ownerName(ownerName)
            .aiScore(d.getAiScore())
            .tags(d.getTags())
            .notes(d.getNotes())
            .createdAt(d.getCreatedAt())
            .updatedAt(d.getUpdatedAt())
            .build();
    }

    private DealDTO toDTO(Deal d) {
        return DealDTO.builder()
            .id(d.getId())
            .title(d.getTitle())
            .description(d.getDescription())
            .stage(d.getStage())
            .priority(d.getPriority())
            .dealValue(d.getDealValue())
            .expectedCloseDate(d.getExpectedCloseDate())
            .actualCloseDate(d.getActualCloseDate())
            .winProbability(d.getWinProbability())
            .pipelineId(d.getPipelineId())
            .leadId(d.getLead() != null ? d.getLead().getId() : null)
            .company(d.getLead() != null ? d.getLead().getCompany() : null)
            .ownerId(d.getOwner() != null ? d.getOwner().getId() : null)
            .ownerName(d.getOwner() != null ? d.getOwner().getName() : null)
            .aiScore(d.getAiScore())
            .tags(d.getTags())
            .notes(d.getNotes())
            .createdAt(d.getCreatedAt())
            .updatedAt(d.getUpdatedAt())
            .build();
    }

    private Deal fromDTO(DealDTO dto) {
        Deal.DealBuilder builder = Deal.builder()
            .title(dto.getTitle())
            .description(dto.getDescription())
            .stage(dto.getStage() != null ? dto.getStage() : Deal.DealStage.NEW)
            .priority(dto.getPriority() != null ? dto.getPriority() : Deal.DealPriority.MEDIUM)
            .dealValue(dto.getDealValue())
            .expectedCloseDate(dto.getExpectedCloseDate())
            .pipelineId(dto.getPipelineId() != null ? dto.getPipelineId() : 1L)
            .notes(dto.getNotes());

        if (dto.getLeadId() != null && !dto.getLeadId().isBlank()) {
            leadRepository.findById(dto.getLeadId()).ifPresent(builder::lead);
        }
        if (dto.getOwnerId() != null && !dto.getOwnerId().isBlank()) {
            userRepository.findById(dto.getOwnerId()).ifPresent(builder::owner);
        }

        return builder.build();
    }
}
