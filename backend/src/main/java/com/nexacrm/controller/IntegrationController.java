package com.nexacrm.controller;

import com.nexacrm.dto.IntegrationConfigRequest;
import com.nexacrm.dto.IntegrationConfigResponse;
import com.nexacrm.service.IntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
@Tag(name = "Integrations", description = "Manage external channel integrations")
public class IntegrationController {

    private final IntegrationService integrationService;

    @GetMapping
    @Operation(summary = "List integration configurations")
    public ResponseEntity<List<IntegrationConfigResponse>> list() {
        return ResponseEntity.ok(integrationService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one integration")
    public ResponseEntity<IntegrationConfigResponse> getOne(@PathVariable String id) {
        return ResponseEntity.ok(integrationService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Save integration credentials")
    public ResponseEntity<IntegrationConfigResponse> save(@PathVariable String id, @Valid @RequestBody IntegrationConfigRequest request) {
        return ResponseEntity.ok(integrationService.save(id, request.getValues()));
    }

    @PostMapping("/{id}/test")
    @Operation(summary = "Test integration config")
    public ResponseEntity<Map<String, Object>> test(@PathVariable String id, @RequestBody(required = false) IntegrationConfigRequest request) {
        Map<String, String> values = request == null ? null : request.getValues();
        return ResponseEntity.ok(integrationService.test(id, values));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Disconnect integration")
    public ResponseEntity<Map<String, String>> disconnect(@PathVariable String id) {
        integrationService.disconnect(id);
        return ResponseEntity.ok(Map.of("message", "Disconnected"));
    }
}
