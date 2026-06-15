package com.nexacrm.controller;

import com.nexacrm.service.TenantAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/saas")
@RequiredArgsConstructor
@Tag(name = "SaaS Admin", description = "Super admin tenant, billing and audit controls")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final TenantAdminService tenantAdminService;

    @GetMapping("/tenants")
    @Operation(summary = "List SaaS tenants")
    public ResponseEntity<List<Map<String, Object>>> tenants() {
        return ResponseEntity.ok(tenantAdminService.listTenants());
    }

    @PostMapping("/tenants")
    @Operation(summary = "Create a tenant")
    public ResponseEntity<Map<String, Object>> createTenant(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(tenantAdminService.createTenant(body));
    }

    @PutMapping("/tenants/{id}")
    @Operation(summary = "Update a tenant")
    public ResponseEntity<Map<String, Object>> updateTenant(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(tenantAdminService.updateTenant(id, body));
    }

    @PatchMapping("/tenants/{id}/activate")
    @Operation(summary = "Activate tenant")
    public ResponseEntity<Map<String, Object>> activateTenant(@PathVariable String id) {
        return ResponseEntity.ok(tenantAdminService.setActive(id, true));
    }

    @PatchMapping("/tenants/{id}/deactivate")
    @Operation(summary = "Deactivate tenant")
    public ResponseEntity<Map<String, Object>> deactivateTenant(@PathVariable String id) {
        return ResponseEntity.ok(tenantAdminService.setActive(id, false));
    }

    @GetMapping("/plans")
    @Operation(summary = "Subscription plans")
    public ResponseEntity<List<Map<String, Object>>> plans() {
        return ResponseEntity.ok(tenantAdminService.plans());
    }

    @GetMapping("/feature-flags")
    @Operation(summary = "Feature flag catalog")
    public ResponseEntity<List<Map<String, Object>>> features() {
        return ResponseEntity.ok(tenantAdminService.featureCatalog());
    }

    @GetMapping("/billing")
    @Operation(summary = "Billing dashboard summary")
    public ResponseEntity<Map<String, Object>> billing() {
        return ResponseEntity.ok(tenantAdminService.getBillingDashboard());
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Global audit logs")
    public ResponseEntity<List<Map<String, Object>>> auditLogs() {
        return ResponseEntity.ok(tenantAdminService.globalAuditLogs());
    }
}
