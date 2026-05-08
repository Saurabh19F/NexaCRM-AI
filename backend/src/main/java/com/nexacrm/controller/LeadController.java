package com.nexacrm.controller;

import com.nexacrm.dto.LeadDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.model.Lead;
import com.nexacrm.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
@Tag(name = "Leads", description = "Lead management endpoints")
public class LeadController {

    private final LeadService leadService;

    @GetMapping
    @Operation(summary = "Get all leads with pagination and filters")
    public ResponseEntity<PageResponse<LeadDTO>> getLeads(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String score,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) Long assignedTo,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(leadService.findAll(search, status, score, source, assignedTo, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get lead by ID")
    public ResponseEntity<LeadDTO> getLeadById(@PathVariable Long id) {
        return ResponseEntity.ok(leadService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new lead")
    public ResponseEntity<LeadDTO> createLead(@Valid @RequestBody LeadDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leadService.create(dto));
    }

    @PostMapping("/facebook")
    @Operation(summary = "Create a lead from Facebook/Zapier webhook payload")
    public ResponseEntity<?> createFacebookLead(@RequestBody Map<String, Object> payload) {
        String name = pickString(payload, "name", "full_name");
        String email = pickString(payload, "email");
        String phone = pickString(payload, "phone", "phone_number");
        String formName = pickString(payload, "form", "form_name");
        String campaign = pickString(payload, "campaign", "campaign_name");

        if (name == null || name.isBlank() || email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "name and email are required",
                    "receivedKeys", payload.keySet()
            ));
        }

        LeadDTO dto = LeadDTO.builder()
                .name(name.trim())
                .email(email.trim())
                .phone(phone)
                .source(Lead.LeadSource.META_ADS)
                .status(Lead.LeadStatus.NEW)
                .utmSource("facebook")
                .utmMedium("lead_ads")
                .utmCampaign(campaign)
                .notes(formName != null && !formName.isBlank() ? "Form: " + formName : null)
                .build();

        LeadDTO saved = leadService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Lead saved successfully",
                "leadId", saved.getId()
        ));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update lead")
    public ResponseEntity<LeadDTO> updateLead(@PathVariable Long id, @Valid @RequestBody LeadDTO dto) {
        return ResponseEntity.ok(leadService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Delete lead")
    public ResponseEntity<Void> deleteLead(@PathVariable Long id) {
        leadService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Bulk delete leads")
    public ResponseEntity<Map<String, Integer>> bulkDelete(@RequestBody Map<String, List<Long>> body) {
        int count = leadService.bulkDelete(body.get("ids"));
        return ResponseEntity.ok(Map.of("deleted", count));
    }

    @PostMapping("/import")
    @Operation(summary = "Import leads from CSV/Excel")
    public ResponseEntity<Map<String, Object>> importLeads(@RequestParam("file") MultipartFile file) {
        var result = leadService.importFromFile(file);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/export")
    @Operation(summary = "Export leads to CSV/Excel")
    public ResponseEntity<byte[]> exportLeads(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status) {
        byte[] data = leadService.export(format, status);
        String contentType = "csv".equals(format) ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        String filename = "leads." + format;
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=" + filename)
                .header("Content-Type", contentType)
                .body(data);
    }

    @PostMapping("/{id}/score")
    @Operation(summary = "Trigger AI lead scoring")
    public ResponseEntity<Map<String, Object>> scoreLead(@PathVariable Long id) {
        return ResponseEntity.ok(leadService.scoreWithAI(id));
    }

    @PostMapping("/{id}/convert")
    @Operation(summary = "Convert lead to customer and create deal")
    public ResponseEntity<Map<String, Object>> convertLead(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> options) {
        return ResponseEntity.ok(leadService.convertToCustomer(id, options));
    }

    private String pickString(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            Object value = payload.get(key);
            if (value instanceof String s && !s.isBlank()) return s;
        }
        return null;
    }
}
