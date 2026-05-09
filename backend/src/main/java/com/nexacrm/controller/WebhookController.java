package com.nexacrm.controller;

import com.nexacrm.service.CommunicationService;
import com.nexacrm.service.LeadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Inbound channel webhooks")
public class WebhookController {

    private final CommunicationService communicationService;
    private final LeadService leadService;
    private final ObjectMapper objectMapper;

    @Value("${meta.app-secret}")
    private String metaAppSecret;

    @Value("${meta.webhook-token}")
    private String metaWebhookToken;

    @GetMapping({"", "/"})
    @Operation(summary = "Webhook root health/check endpoint")
    public ResponseEntity<Map<String, Object>> webhookRoot() {
        return ResponseEntity.ok(Map.of(
            "ok", true,
            "facebookVerifyPath", "/api/webhooks/facebook/leads",
            "facebookLegacyPath", "/api/webhooks/meta",
            "whatsappPath", "/api/webhooks/whatsapp"
        ));
    }

    @PostMapping("/whatsapp")
    @Operation(summary = "Receive inbound WhatsApp webhook events")
    public ResponseEntity<Map<String, Object>> receiveWhatsAppWebhook(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(communicationService.processWhatsAppWebhook(payload));
    }

    @PostMapping(value = "/whatsapp", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    @Operation(summary = "Receive inbound WhatsApp webhook events (form payload)")
    public ResponseEntity<Map<String, Object>> receiveWhatsAppWebhookForm(@RequestParam MultiValueMap<String, String> form) {
        Map<String, Object> payload = new HashMap<>();
        form.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                payload.put(key, value.size() == 1 ? value.get(0) : value);
            }
        });
        Map<String, Object> normalizedPayload = inflateJsonFields(payload);
        return ResponseEntity.ok(communicationService.processWhatsAppWebhook(normalizedPayload));
    }

    @GetMapping("/whatsapp")
    @Operation(summary = "Health/check endpoint for WhatsApp webhook URL")
    public ResponseEntity<Map<String, Object>> verifyWhatsAppWebhook(@RequestParam Map<String, String> query) {
        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("receivedQuery", query);
        return ResponseEntity.ok(response);
    }

    // ── Facebook Lead Ads ─────────────────────────────────────────

    @GetMapping({"/facebook/leads", "/meta"})
    @Operation(summary = "Facebook Lead Ads webhook verification")
    public ResponseEntity<String> verifyFacebookLeadsWebhook(@RequestParam Map<String, String> query) {
        String mode = firstNonBlank(query, "hub.mode", "hub_mode", "mode");
        String verifyToken = firstNonBlank(query, "hub.verify_token", "hub_verify_token", "verify_token");
        String challenge = firstNonBlank(query, "hub.challenge", "hub_challenge", "challenge");

        if (!"subscribe".equals(mode) || challenge == null) {
            log.warn("Facebook webhook verification missing required query params: {}", query.keySet());
            return ResponseEntity.badRequest().body("Missing required webhook verification query params");
        }

        if (Objects.equals(trim(metaWebhookToken), trim(verifyToken))) {
            log.info("Facebook Lead Ads webhook verified");
            return ResponseEntity.ok(challenge);
        }
        log.warn(
            "Facebook webhook verification failed: mode={}, token_match={}",
            mode,
            Objects.equals(trim(metaWebhookToken), trim(verifyToken))
        );
        return ResponseEntity.status(403).build();
    }

    @PostMapping({"/facebook/leads", "/meta"})
    @Operation(summary = "Receive Facebook page events (Lead Ads + Messenger)")
    public ResponseEntity<Void> receiveFacebookLeadsWebhook(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String rawBody) {
        if (!isValidFacebookSignature(rawBody, signature)) {
            log.warn("Facebook webhook rejected: invalid signature");
            return ResponseEntity.status(403).build();
        }
        // Route to both services; each ignores events outside its domain.
        leadService.processFacebookLeadsWebhookAsync(rawBody);
        communicationService.processFacebookMessengerWebhookAsync(rawBody);
        return ResponseEntity.ok().build();
    }

    private boolean isValidFacebookSignature(String body, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(metaAppSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String expectedHex = HexFormat.of().formatHex(expected);
            String actual = signatureHeader.substring("sha256=".length());
            return MessageDigest.isEqual(expectedHex.getBytes(StandardCharsets.UTF_8),
                                         actual.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }

    // ── WhatsApp helpers ──────────────────────────────────────────

    private Map<String, Object> inflateJsonFields(Map<String, Object> payload) {
        Map<String, Object> inflated = new HashMap<>(payload);
        for (String key : new String[]{"data", "message", "messages", "payload"}) {
            Object value = inflated.get(key);
            if (!(value instanceof String raw) || raw.isBlank()) {
                continue;
            }
            try {
                Object parsed = objectMapper.readValue(raw, Object.class);
                inflated.put(key, parsed);
            } catch (Exception ignored) {
                // ignore malformed fragments; best-effort only
            }
        }
        log.debug("Webhook form payload normalized keys: {}", inflated.keySet());
        return inflated;
    }

    private static String firstNonBlank(Map<String, String> query, String... keys) {
        for (String key : keys) {
            String value = trim(query.get(key));
            if (!value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
