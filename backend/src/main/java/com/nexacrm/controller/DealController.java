package com.nexacrm.controller;

import com.nexacrm.dto.DealDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.service.DealService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
@Tag(name = "Deals", description = "Sales pipeline & deal management")
public class DealController {

    private final DealService dealService;

    @GetMapping
    public ResponseEntity<PageResponse<DealDTO>> getDeals(
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String ownerId,
            @RequestParam(required = false) Long pipelineId,
            Pageable pageable) {
        return ResponseEntity.ok(dealService.findAll(stage, ownerId, pipelineId, pageable));
    }

    @GetMapping("/board")
    @Operation(summary = "Get all deals grouped by stage for Kanban board")
    public ResponseEntity<Map<String, List<DealDTO>>> getBoard(
            @RequestParam(defaultValue = "1") Long pipelineId) {
        return ResponseEntity.ok(dealService.getBoardView(pipelineId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DealDTO> getDealById(@PathVariable String id) {
        return ResponseEntity.ok(dealService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<DealDTO> createDeal(@Valid @RequestBody DealDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dealService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DealDTO> updateDeal(@PathVariable String id, @Valid @RequestBody DealDTO dto) {
        return ResponseEntity.ok(dealService.update(id, dto));
    }

    @PatchMapping("/{id}/stage")
    @Operation(summary = "Move deal to a different stage")
    public ResponseEntity<DealDTO> moveStage(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(dealService.moveStage(id, body.get("stage")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable String id) {
        dealService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/activities")
    public ResponseEntity<List<Map<String, Object>>> getActivities(@PathVariable String id) {
        return ResponseEntity.ok(dealService.getActivities(id));
    }

    @PostMapping("/{id}/activities")
    public ResponseEntity<Map<String, Object>> addActivity(
            @PathVariable String id,
            @RequestBody Map<String, Object> activity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dealService.addActivity(id, activity));
    }
}
