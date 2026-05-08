package com.nexacrm.service;

import com.nexacrm.dto.DealDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Deal;
import com.nexacrm.repository.DealRepository;
import com.nexacrm.websocket.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
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
    private final NotificationPublisher notificationPublisher;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public PageResponse<DealDTO> findAll(String stage, Long ownerId, Long pipelineId, Pageable pageable) {
        Page<Deal> page = dealRepository.findDeals(DEFAULT_TENANT, stage, ownerId, pipelineId, pageable);
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
            board.put(stage.name().toLowerCase(), deals.stream().map(this::toDTO).collect(Collectors.toList()));
        }
        return board;
    }

    @Transactional(readOnly = true)
    public DealDTO findById(Long id) {
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

    public DealDTO update(Long id, DealDTO dto) {
        Deal deal = dealRepository.findById(id)
            .filter(d -> !d.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));

        deal.setTitle(dto.getTitle());
        deal.setDescription(dto.getDescription());
        if (dto.getDealValue() != null) deal.setDealValue(dto.getDealValue());
        if (dto.getPriority() != null)  deal.setPriority(dto.getPriority());
        if (dto.getExpectedCloseDate() != null) deal.setExpectedCloseDate(dto.getExpectedCloseDate());
        deal.setNotes(dto.getNotes());

        return toDTO(dealRepository.save(deal));
    }

    public DealDTO moveStage(Long id, String stageName) {
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

    public void delete(Long id) {
        Deal deal = dealRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Deal not found: " + id));
        deal.setDeleted(true);
        dealRepository.save(deal);
    }

    public List<Map<String, Object>> getActivities(Long dealId) {
        // In production: query deal_activities table
        return List.of(
            Map.of("type", "CALL",  "title", "Discovery call", "time", "2 days ago"),
            Map.of("type", "EMAIL", "title", "Sent proposal",  "time", "1 day ago")
        );
    }

    public Map<String, Object> addActivity(Long dealId, Map<String, Object> activity) {
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
        return Deal.builder()
            .title(dto.getTitle())
            .description(dto.getDescription())
            .stage(dto.getStage() != null ? dto.getStage() : Deal.DealStage.NEW)
            .priority(dto.getPriority() != null ? dto.getPriority() : Deal.DealPriority.MEDIUM)
            .dealValue(dto.getDealValue())
            .expectedCloseDate(dto.getExpectedCloseDate())
            .pipelineId(dto.getPipelineId() != null ? dto.getPipelineId() : 1L)
            .notes(dto.getNotes())
            .build();
    }
}
