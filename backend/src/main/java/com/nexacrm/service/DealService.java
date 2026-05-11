package com.nexacrm.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final NotificationPublisher notificationPublisher;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public PageResponse<DealDTO> findAll(String stage, String ownerId, Long pipelineId, Pageable pageable) {
        List<Deal> filtered;
        Deal.DealStage stageEnum = null;
        if (stage != null && !stage.isBlank()) {
            stageEnum = Deal.DealStage.valueOf(stage.toUpperCase());
        }

        if (stageEnum != null && ownerId != null && !ownerId.isBlank() && pipelineId != null) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndStageAndOwner_IdAndPipelineId(
                DEFAULT_TENANT, stageEnum, ownerId, pipelineId
            );
        } else if (stageEnum != null && ownerId != null && !ownerId.isBlank()) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndStageAndOwner_Id(
                DEFAULT_TENANT, stageEnum, ownerId
            );
        } else if (stageEnum != null && pipelineId != null) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndStageAndPipelineId(
                DEFAULT_TENANT, stageEnum, pipelineId
            );
        } else if (ownerId != null && !ownerId.isBlank() && pipelineId != null) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndOwner_IdAndPipelineId(
                DEFAULT_TENANT, ownerId, pipelineId
            );
        } else if (stageEnum != null) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndStage(DEFAULT_TENANT, stageEnum);
        } else if (ownerId != null && !ownerId.isBlank()) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndOwner_Id(DEFAULT_TENANT, ownerId);
        } else if (pipelineId != null) {
            filtered = dealRepository.findByTenantIdAndDeletedFalseAndPipelineId(DEFAULT_TENANT, pipelineId);
        } else {
            filtered = dealRepository.findByTenantIdAndDeletedFalse(DEFAULT_TENANT);
        }

        if (pageable.getSort().isSorted()) {
            Comparator<Deal> comparator = Comparator.comparing(Deal::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
            filtered.sort(comparator.reversed());
        }

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<Deal> content = start >= filtered.size() ? List.of() : filtered.subList(start, end);
        Page<Deal> page = new PageImpl<>(content, pageable, filtered.size());

        return PageResponse.<DealDTO>builder()
            .content(page.getContent().stream().map(this::toDTO).collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .total(page.getTotalElements()).totalPages(page.getTotalPages())
            .first(page.isFirst()).last(page.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public Map<String, List<DealDTO>> getBoardView(Long pipelineId) {
        Map<String, List<DealDTO>> board = new LinkedHashMap<>();
        for (Deal.DealStage stage : Deal.DealStage.values()) {
            List<Deal> deals = dealRepository.findByStageAndTenantIdAndDeletedFalse(stage, DEFAULT_TENANT);
            if (pipelineId != null) {
                deals = deals.stream()
                    .filter(d -> Objects.equals(d.getPipelineId(), pipelineId))
                    .toList();
            }
            board.put(stage.name().toLowerCase(), deals.stream().map(this::toDTO).collect(Collectors.toList()));
        }
        return board;
    }

    @Transactional(readOnly = true)
    public DealDTO findById(String id) {
        return dealRepository.findById(id)
            .filter(d -> !d.getDeleted())
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));
    }

    public DealDTO create(DealDTO dto) {
        Deal deal = fromDTO(dto);
        deal.setTenantId(DEFAULT_TENANT);
        return toDTO(dealRepository.save(deal));
    }

    public DealDTO update(String id, DealDTO dto) {
        Deal deal = dealRepository.findById(id)
            .filter(d -> !d.getDeleted())
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
        Deal deal = dealRepository.findById(id)
            .filter(d -> !d.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));

        Deal.DealStage newStage;
        try {
            newStage = Deal.DealStage.valueOf(stageName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid stage: " + stageName + ". Valid values: " +
                java.util.Arrays.toString(Deal.DealStage.values()));
        }
        String prevStage = deal.getStage().name();
        deal.setStage(newStage);
        Deal saved = dealRepository.save(deal);

        // Notify deal owner
        if (saved.getOwner() != null) {
            notificationPublisher.notifyDealStageChange(
                saved.getOwner().getEmail(),
                saved.getTitle(),
                newStage.name()
            );
        }

        log.info("Deal {} moved from {} to {}", id, prevStage, newStage);
        return toDTO(saved);
    }

    public void delete(String id) {
        Deal deal = dealRepository.findById(id)
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
