package com.nexacrm.service;

import com.nexacrm.dto.IntegrationConfigResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class IntegrationService {

    private static final Map<String, List<String>> REQUIRED_FIELDS = Map.of(
        "facebook", List.of("pageId", "accessToken"),
        "instagram", List.of("igAccountId", "accessToken"),
        "whatsapp", List.of("instanceId", "accessToken"),
        "gmail", List.of("clientId", "clientSecret", "refreshToken"),
        "google_calendar", List.of("clientId", "clientSecret"),
        "openai", List.of("apiKey"),
        "linkedin", List.of("clientId", "clientSecret"),
        "google_sheets_leads", List.of("spreadsheetId", "sheetName")
    );

    private final LeadService leadService;
    private final Map<String, Map<String, String>> configs = new ConcurrentHashMap<>();
    private final Set<String> connected = ConcurrentHashMap.newKeySet();

    public List<IntegrationConfigResponse> getAll() {
        List<IntegrationConfigResponse> all = new ArrayList<>();
        REQUIRED_FIELDS.forEach((id, requiredFields) -> all.add(buildResponse(id, requiredFields)));
        return all;
    }

    public IntegrationConfigResponse getById(String integrationId) {
        String normalizedId = normalizeId(integrationId);
        List<String> required = getRequiredFields(normalizedId);
        return buildResponse(normalizedId, required);
    }

    public IntegrationConfigResponse save(String integrationId, Map<String, String> values) {
        String normalizedId = normalizeId(integrationId);
        List<String> required = getRequiredFields(normalizedId);
        validateRequired(values, required);

        Map<String, String> sanitizedValues = new LinkedHashMap<>();
        values.forEach((k, v) -> sanitizedValues.put(k, v == null ? "" : v.trim()));
        configs.put(normalizedId, sanitizedValues);
        connected.add(normalizedId);

        return buildResponse(normalizedId, required);
    }

    public Map<String, Object> test(String integrationId, Map<String, String> values) {
        String normalizedId = normalizeId(integrationId);
        List<String> required = getRequiredFields(normalizedId);

        Map<String, String> testValues = values != null && !values.isEmpty()
            ? values
            : configs.getOrDefault(normalizedId, Map.of());

        validateRequired(testValues, required);

        if ("google_sheets_leads".equals(normalizedId)) {
            return leadService.testPublicGoogleSheetAccess(testValues);
        }

        return Map.of(
            "ok", true,
            "message", "Connection test passed for " + normalizedId,
            "integration", normalizedId
        );
    }

    public Map<String, Object> sync(String integrationId, Map<String, String> values) {
        String normalizedId = normalizeId(integrationId);
        if (!"google_sheets_leads".equals(normalizedId)) {
            throw new IllegalStateException("Sync is not supported for integration: " + normalizedId);
        }

        Map<String, String> savedValues = configs.getOrDefault(normalizedId, Map.of());
        Map<String, String> merged = new LinkedHashMap<>(savedValues);
        if (values != null && !values.isEmpty()) {
            values.forEach((k, v) -> merged.put(k, v == null ? "" : v.trim()));
        }

        validateRequired(merged, getRequiredFields(normalizedId));
        return leadService.syncFromPublicGoogleSheet(merged);
    }

    public void disconnect(String integrationId) {
        String normalizedId = normalizeId(integrationId);
        configs.remove(normalizedId);
        connected.remove(normalizedId);
    }

    public boolean isConnected(String integrationId) {
        String normalizedId = normalizeId(integrationId);
        return connected.contains(normalizedId);
    }

    public Map<String, String> getConfig(String integrationId) {
        String normalizedId = normalizeId(integrationId);
        return new LinkedHashMap<>(configs.getOrDefault(normalizedId, Map.of()));
    }

    private IntegrationConfigResponse buildResponse(String id, List<String> requiredFields) {
        Map<String, String> stored = new LinkedHashMap<>(configs.getOrDefault(id, Map.of()));

        return IntegrationConfigResponse.builder()
            .id(id)
            .connected(connected.contains(id))
            .requiredFields(requiredFields)
            .values(stored)
            .build();
    }

    private String normalizeId(String integrationId) {
        if (integrationId == null || integrationId.isBlank()) {
            throw new IllegalStateException("Integration id is required.");
        }
        return integrationId.trim().toLowerCase(Locale.ROOT);
    }

    private List<String> getRequiredFields(String integrationId) {
        List<String> required = REQUIRED_FIELDS.get(integrationId);
        if (required == null) {
            throw new IllegalStateException("Unsupported integration: " + integrationId);
        }
        return required;
    }

    private void validateRequired(Map<String, String> values, List<String> requiredFields) {
        List<String> missing = requiredFields.stream()
            .filter(field -> values.get(field) == null || values.get(field).isBlank())
            .toList();

        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing required fields: " + String.join(", ", missing));
        }
    }
}
