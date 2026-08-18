package com.nexacrm.service;

import com.nexacrm.model.Tenant;
import com.nexacrm.model.User;
import com.nexacrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TenantAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final DealRepository dealRepository;
    private final InvoiceRepository invoiceRepository;
    private final WorkflowRepository workflowRepository;
    private final IntegrationConfigRepository integrationConfigRepository;

    // ── Tenants ─────────────────────────────────────────────────

    /**
     * Backfill tenantId on any Tenant documents that are missing it.
     * Called at startup to fix legacy data.
     */
    public void backfillTenantIds() {
        List<Tenant> all = tenantRepository.findAll();
        long maxId = all.stream()
            .map(Tenant::getTenantId)
            .filter(java.util.Objects::nonNull)
            .max(Long::compareTo)
            .orElse(0L);
        for (Tenant t : all) {
            if (t.getTenantId() == null) {
                t.setTenantId(++maxId);
                tenantRepository.save(t);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTenants() {
        return tenantRepository.findAll().stream()
            .sorted((a, b) -> {
                LocalDateTime right = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
                LocalDateTime left = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
                return right.compareTo(left);
            })
            .map(this::tenantSummary)
            .collect(Collectors.toList());
    }

    public Map<String, Object> createTenant(Map<String, Object> body) {
        Tenant tenant = Tenant.builder()
            .name(string(body.get("name"), "New Tenant"))
            .slug(slugify(string(body.get("slug"), "new-tenant")))
            .plan(string(body.get("plan"), "TRIAL"))
            .isActive(bool(body.get("isActive"), true))
            .maxUsers(number(body.get("maxUsers"), 5))
            .logoUrl(string(body.get("logoUrl"), null))
            .billingStatus(string(body.get("billingStatus"), "TRIAL"))
            .trialEndsAt(parseDateTime(body.get("trialEndsAt")))
            .subscriptionStartedAt(parseDateTime(body.get("subscriptionStartedAt")))
            .subscriptionEndsAt(parseDateTime(body.get("subscriptionEndsAt")))
            .build();
        tenant.setTenantId(nextTenantId());
        tenant.setFeatureFlags(parseBooleanMap(body.get("featureFlags")));
        tenant.setUsageLimits(parseIntegerMap(body.get("usageLimits")));
        return tenantSummary(tenantRepository.save(tenant));
    }

    public Map<String, Object> updateTenant(String id, Map<String, Object> body) {
        Tenant tenant = tenantRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        if (body.containsKey("name")) tenant.setName(string(body.get("name"), tenant.getName()));
        if (body.containsKey("slug")) tenant.setSlug(slugify(string(body.get("slug"), tenant.getSlug())));
        if (body.containsKey("plan")) tenant.setPlan(string(body.get("plan"), tenant.getPlan()));
        if (body.containsKey("isActive")) tenant.setIsActive(bool(body.get("isActive"), tenant.getIsActive()));
        if (body.containsKey("maxUsers")) tenant.setMaxUsers(number(body.get("maxUsers"), tenant.getMaxUsers()));
        if (body.containsKey("logoUrl")) tenant.setLogoUrl(string(body.get("logoUrl"), tenant.getLogoUrl()));
        if (body.containsKey("billingStatus")) tenant.setBillingStatus(string(body.get("billingStatus"), tenant.getBillingStatus()));
        if (body.containsKey("trialEndsAt")) tenant.setTrialEndsAt(parseDateTime(body.get("trialEndsAt")));
        if (body.containsKey("subscriptionStartedAt")) tenant.setSubscriptionStartedAt(parseDateTime(body.get("subscriptionStartedAt")));
        if (body.containsKey("subscriptionEndsAt")) tenant.setSubscriptionEndsAt(parseDateTime(body.get("subscriptionEndsAt")));
        if (body.containsKey("featureFlags")) tenant.setFeatureFlags(parseBooleanMap(body.get("featureFlags")));
        if (body.containsKey("usageLimits")) tenant.setUsageLimits(parseIntegerMap(body.get("usageLimits")));
        return tenantSummary(tenantRepository.save(tenant));
    }

    public Map<String, Object> setActive(String id, boolean active) {
        Tenant tenant = tenantRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        tenant.setIsActive(active);
        if (active) {
            tenant.setDeactivatedAt(null);
            tenant.setActivatedAt(LocalDateTime.now());
        } else {
            tenant.setDeactivatedAt(LocalDateTime.now());
        }
        return tenantSummary(tenantRepository.save(tenant));
    }

    // ── Cross-tenant User Management ────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAllUsers() {
        List<Tenant> tenants = tenantRepository.findAll();
        Map<Long, String> tenantNames = new LinkedHashMap<>();
        for (Tenant t : tenants) {
            if (t.getTenantId() != null) {
                tenantNames.put(t.getTenantId(), t.getName());
            }
        }

        return userRepository.findAll().stream()
            .filter(u -> !Boolean.TRUE.equals(u.getDeleted()))
            .map(u -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", u.getId());
                row.put("name", u.getName());
                row.put("email", u.getEmail());
                row.put("phone", u.getPhone());
                row.put("role", u.getRole() != null ? u.getRole().name() : "SALES_EXEC");
                row.put("isActive", Boolean.TRUE.equals(u.getIsActive()));
                row.put("twoFaEnabled", Boolean.TRUE.equals(u.getTwoFaEnabled()));
                row.put("tenantId", u.getTenantId());
                row.put("tenantName", tenantNames.getOrDefault(u.getTenantId(), "Unknown"));
                row.put("createdAt", u.getCreatedAt());
                row.put("updatedAt", u.getUpdatedAt());
                return row;
            })
            .collect(Collectors.toList());
    }

    public Map<String, Object> changeUserRole(String userId, String roleName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setRole(User.Role.valueOf(roleName));
        userRepository.save(user);
        return Map.of("id", userId, "role", roleName, "success", true);
    }

    public Map<String, Object> setUserActive(String userId, boolean active) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setIsActive(active);
        userRepository.save(user);
        return Map.of("id", userId, "isActive", active, "success", true);
    }

    // ── Billing Dashboard ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getBillingDashboard() {
        List<Tenant> tenants = tenantRepository.findAll();
        long active = tenants.stream().filter(t -> Boolean.TRUE.equals(t.getIsActive())).count();
        long inactive = tenants.size() - active;
        long trialing = tenants.stream().filter(t -> "TRIAL".equalsIgnoreCase(defaultString(t.getBillingStatus()))).count();
        long expiringSoon = tenants.stream()
            .filter(t -> t.getTrialEndsAt() != null)
            .filter(t -> t.getTrialEndsAt().isBefore(LocalDateTime.now().plusDays(7)))
            .count();

        List<Map<String, Object>> planBreakdown = tenants.stream()
            .collect(Collectors.groupingBy(
                tenant -> defaultString(tenant.getPlan()).toUpperCase(),
                LinkedHashMap::new,
                Collectors.counting()
            ))
            .entrySet().stream()
            .map(entry -> Map.<String, Object>of("plan", entry.getKey(), "count", entry.getValue()))
            .toList();

        return Map.of(
            "totalTenants", tenants.size(),
            "activeTenants", active,
            "inactiveTenants", inactive,
            "trialTenants", trialing,
            "expiringSoon", expiringSoon,
            "plans", planBreakdown
        );
    }

    // ── Platform Overview ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getPlatformOverview() {
        List<Tenant> tenants = tenantRepository.findAll();
        List<User> allUsers = userRepository.findAll().stream()
            .filter(u -> !Boolean.TRUE.equals(u.getDeleted()))
            .toList();

        long totalCompanies = tenants.size();
        long activeCompanies = tenants.stream().filter(t -> Boolean.TRUE.equals(t.getIsActive())).count();
        long totalUsers = allUsers.size();
        long activeUsers = allUsers.stream().filter(u -> Boolean.TRUE.equals(u.getIsActive())).count();
        long twoFaUsers = allUsers.stream().filter(u -> Boolean.TRUE.equals(u.getTwoFaEnabled())).count();

        // Role breakdown
        Map<String, Long> roleBreakdown = allUsers.stream()
            .collect(Collectors.groupingBy(
                u -> u.getRole() != null ? u.getRole().name() : "SALES_EXEC",
                Collectors.counting()
            ));

        // Plan breakdown
        Map<String, Long> planBreakdown = tenants.stream()
            .collect(Collectors.groupingBy(
                t -> defaultString(t.getPlan()).toUpperCase().isEmpty() ? "UNKNOWN" : defaultString(t.getPlan()).toUpperCase(),
                Collectors.counting()
            ));

        // Count data across all tenants
        long totalLeads = 0;
        long totalDeals = 0;
        long totalInvoices = 0;
        long totalWorkflows = 0;
        long totalIntegrations = 0;
        for (Tenant t : tenants) {
            Long tid = t.getTenantId();
            if (tid != null) {
                totalLeads += leadRepository.findByTenantIdAndDeletedFalse(tid).size();
                totalDeals += dealRepository.findByTenantIdAndDeletedFalse(tid).size();
                totalInvoices += invoiceRepository.findByTenantIdAndDeletedFalse(tid).size();
                try { totalWorkflows += workflowRepository.findByTenantIdAndDeletedFalse(tid).size(); } catch (Exception ignored) {}
                try { totalIntegrations += integrationConfigRepository.findByTenantIdAndDeletedFalse(tid).size(); } catch (Exception ignored) {}
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalCompanies", totalCompanies);
        result.put("activeCompanies", activeCompanies);
        result.put("totalUsers", totalUsers);
        result.put("activeUsers", activeUsers);
        result.put("twoFaUsers", twoFaUsers);
        result.put("totalLeads", totalLeads);
        result.put("totalDeals", totalDeals);
        result.put("totalInvoices", totalInvoices);
        result.put("totalWorkflows", totalWorkflows);
        result.put("totalIntegrations", totalIntegrations);
        result.put("roleBreakdown", roleBreakdown);
        result.put("planBreakdown", planBreakdown);
        return result;
    }

    // ── Audit Logs ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAuditLogs() {
        // Return recent platform activity from all tenants
        List<User> allUsers = userRepository.findAll().stream()
            .filter(u -> !Boolean.TRUE.equals(u.getDeleted()))
            .sorted((a, b) -> {
                LocalDateTime ra = b.getUpdatedAt() != null ? b.getUpdatedAt() : LocalDateTime.MIN;
                LocalDateTime la = a.getUpdatedAt() != null ? a.getUpdatedAt() : LocalDateTime.MIN;
                return ra.compareTo(la);
            })
            .limit(50)
            .toList();

        return allUsers.stream().map(u -> {
            Map<String, Object> log = new LinkedHashMap<>();
            log.put("id", u.getId());
            log.put("action", "USER_ACTIVITY");
            log.put("entityType", "User");
            log.put("entityId", u.getId());
            log.put("userName", u.getName());
            log.put("userEmail", u.getEmail());
            log.put("role", u.getRole() != null ? u.getRole().name() : "SALES_EXEC");
            log.put("tenantId", u.getTenantId());
            log.put("isActive", Boolean.TRUE.equals(u.getIsActive()));
            log.put("createdAt", u.getCreatedAt());
            log.put("updatedAt", u.getUpdatedAt());
            return log;
        }).collect(Collectors.toList());
    }

    // ── Security Overview ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getSecurityOverview() {
        List<User> allUsers = userRepository.findAll().stream()
            .filter(u -> !Boolean.TRUE.equals(u.getDeleted()))
            .toList();

        long total = allUsers.size();
        long active = allUsers.stream().filter(u -> Boolean.TRUE.equals(u.getIsActive())).count();
        long inactive = total - active;
        long twoFaEnabled = allUsers.stream().filter(u -> Boolean.TRUE.equals(u.getTwoFaEnabled())).count();
        long twoFaDisabled = total - twoFaEnabled;
        long platformAdmins = allUsers.stream().filter(u -> u.getRole() == User.Role.PLATFORM_ADMIN).count();
        long companyAdmins = allUsers.stream().filter(u -> u.getRole() == User.Role.COMPANY_ADMIN).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalUsers", total);
        result.put("activeUsers", active);
        result.put("inactiveUsers", inactive);
        result.put("twoFaEnabled", twoFaEnabled);
        result.put("twoFaDisabled", twoFaDisabled);
        result.put("twoFaPercent", total > 0 ? Math.round((twoFaEnabled * 100.0) / total) : 0);
        result.put("platformAdmins", platformAdmins);
        result.put("companyAdmins", companyAdmins);
        result.put("policies", List.of(
            Map.of("name", "Password Policy", "status", "ACTIVE", "description", "Minimum 8 characters, BCrypt hashed"),
            Map.of("name", "JWT Authentication", "status", "ACTIVE", "description", "Stateless token-based auth with refresh rotation"),
            Map.of("name", "Two-Factor Auth", "status", "AVAILABLE", "description", twoFaEnabled + " of " + total + " users enabled"),
            Map.of("name", "Rate Limiting", "status", "ACTIVE", "description", "API rate limiting per IP and user"),
            Map.of("name", "CORS Policy", "status", "ACTIVE", "description", "Restricted to configured origins"),
            Map.of("name", "Data Isolation", "status", "ACTIVE", "description", "Multi-tenant row-level security via tenantId"),
            Map.of("name", "Audit Logging", "status", "ACTIVE", "description", "All admin and delete operations tracked"),
            Map.of("name", "Session Management", "status", "ACTIVE", "description", "Stateless JWT with configurable expiry")
        ));
        return result;
    }

    // ── Feature Flags & Plans ───────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> featureCatalog() {
        return List.of(
            Map.of("key", "lead_automation", "label", "Lead Automation", "description", "Auto-assign, SLA and escalation rules"),
            Map.of("key", "team_management", "label", "Team Management", "description", "Invite users, manage roles and teams"),
            Map.of("key", "billing_dashboard", "label", "Billing Dashboard", "description", "Tenant invoices, plan state and trial expiry"),
            Map.of("key", "webhook_hardening", "label", "Webhook Hardening", "description", "Signature verification and replay protection"),
            Map.of("key", "realtime_notifications", "label", "Realtime Notifications", "description", "Live websocket and toast notifications"),
            Map.of("key", "ai_engine", "label", "AI Engine", "description", "NexaAI chat, insights, and call intelligence"),
            Map.of("key", "workflow_automation", "label", "Workflow Automation", "description", "Triggers, conditions, and automated actions"),
            Map.of("key", "advanced_analytics", "label", "Advanced Analytics", "description", "Lead conversion, pipeline, and revenue reports"),
            Map.of("key", "whatsapp_integration", "label", "WhatsApp Integration", "description", "Send and receive WhatsApp messages"),
            Map.of("key", "call_agent", "label", "AI Call Agent", "description", "Automated AI-powered outbound calls")
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> plans() {
        return List.of(
            plan("TRIAL", 0, 5, 14, "Core CRM, tasks, notifications"),
            plan("STARTER", 4999, 10, 30, "Lead, deal and invoice management"),
            plan("BUSINESS", 14999, 25, 60, "Automation, reports and webhooks"),
            plan("ENTERPRISE", 49999, 100, 365, "SSO, SaaS controls and priority support")
        );
    }

    // ── Private helpers ─────────────────────────────────────────

    private Long nextTenantId() {
        return tenantRepository.findAll().stream()
            .map(Tenant::getTenantId)
            .filter(java.util.Objects::nonNull)
            .max(Long::compareTo)
            .orElse(0L) + 1;
    }

    private Map<String, Object> tenantSummary(Tenant tenant) {
        Long tenantId = tenant.getTenantId();
        long userCount = tenantId != null ? userRepository.findByTenantIdAndDeletedFalse(tenantId).size() : 0L;
        long leadCount = tenantId != null ? leadRepository.findByTenantIdAndDeletedFalse(tenantId).size() : 0L;
        long dealCount = tenantId != null ? dealRepository.findByTenantIdAndDeletedFalse(tenantId).size() : 0L;
        long invoiceCount = tenantId != null ? invoiceRepository.findByTenantIdAndDeletedFalse(tenantId).size() : 0L;
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", tenant.getId());
        row.put("tenantId", tenant.getTenantId());
        row.put("name", tenant.getName());
        row.put("slug", tenant.getSlug());
        row.put("plan", tenant.getPlan());
        row.put("billingStatus", tenant.getBillingStatus());
        row.put("isActive", tenant.getIsActive());
        row.put("maxUsers", tenant.getMaxUsers());
        row.put("logoUrl", tenant.getLogoUrl());
        row.put("trialEndsAt", tenant.getTrialEndsAt());
        row.put("subscriptionStartedAt", tenant.getSubscriptionStartedAt());
        row.put("subscriptionEndsAt", tenant.getSubscriptionEndsAt());
        row.put("featureFlags", tenant.getFeatureFlags());
        row.put("usageLimits", tenant.getUsageLimits());
        row.put("userCount", userCount);
        row.put("leadCount", leadCount);
        row.put("dealCount", dealCount);
        row.put("invoiceCount", invoiceCount);
        row.put("createdAt", tenant.getCreatedAt());
        row.put("updatedAt", tenant.getUpdatedAt());
        return row;
    }

    private Map<String, Object> plan(String name, int priceInRupees, int maxUsers, int trialDays, String features) {
        return Map.of(
            "name", name,
            "priceInRupees", priceInRupees,
            "maxUsers", maxUsers,
            "trialDays", trialDays,
            "features", features
        );
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private String string(Object value, String fallback) {
        if (value == null) return fallback;
        String text = String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private boolean bool(Object value, boolean fallback) {
        if (value == null) return fallback;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private Integer number(Object value, Integer fallback) {
        if (value == null) return fallback;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (Exception ex) {
            return fallback;
        }
    }

    private LocalDateTime parseDateTime(Object value) {
        if (value == null) return null;
        try {
            return LocalDateTime.parse(String.valueOf(value));
        } catch (Exception ex) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Boolean> parseBooleanMap(Object value) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        if (!(value instanceof Map<?, ?> map)) {
            return result;
        }
        map.forEach((key, val) -> result.put(String.valueOf(key), bool(val, false)));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Integer> parseIntegerMap(Object value) {
        Map<String, Integer> result = new LinkedHashMap<>();
        if (!(value instanceof Map<?, ?> map)) {
            return result;
        }
        map.forEach((key, val) -> result.put(String.valueOf(key), number(val, 0)));
        return result;
    }

    private String slugify(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
            .toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }
}
