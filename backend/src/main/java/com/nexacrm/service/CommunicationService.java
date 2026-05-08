package com.nexacrm.service;

import com.nexacrm.dto.EmailSendRequest;
import com.nexacrm.dto.WhatsAppConversationResponse;
import com.nexacrm.dto.WhatsAppMessageResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexacrm.model.CommunicationRecord;
import com.nexacrm.repository.CommunicationRecordRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunicationService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JavaMailSender mailSender;
    private final IntegrationService integrationService;
    private final CommunicationRecordRepository communicationRecordRepository;
    private final ObjectMapper objectMapper;
    @PersistenceContext
    private EntityManager entityManager;

    @Value("${spring.mail.username}")
    private String smtpFrom;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    @Value("${nexacrm.whatsapp.aiadrika-base-url:https://aiadrika.in/api/send}")
    private String aiadrikaBaseUrl;

    @Value("${nexacrm.whatsapp.aiadrika.instance-id:}")
    private String defaultInstanceId;

    @Value("${nexacrm.whatsapp.aiadrika.access-token:}")
    private String defaultAccessToken;

    public void sendEmail(EmailSendRequest request) {
        validateSmtpConfiguration();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(smtpFrom);
            helper.setTo(request.getTo().trim());
            helper.setSubject(request.getSubject().trim());
            helper.setText(request.getBody().trim(), false);
            mailSender.send(message);
            log.info("Email sent to {}", request.getTo());
        } catch (MailAuthenticationException ex) {
            log.error("SMTP authentication failed", ex);
            throw new IllegalStateException(
                "SMTP authentication failed. Verify you are using a current App Password generated for this same Gmail account."
            );
        } catch (MailSendException ex) {
            log.error("SMTP send failed: {}", ex.getMessage());
            throw new IllegalStateException("Failed to send email. Check recipient and SMTP settings.");
        } catch (MessagingException ex) {
            log.error("Email compose failed: {}", ex.getMessage());
            throw new IllegalStateException("Failed to compose email message.");
        }
    }

    private void validateSmtpConfiguration() {
        String host = trim(smtpHost).toLowerCase(Locale.ROOT);
        if (!host.contains("gmail.com")) {
            return;
        }

        String password = trim(smtpPassword).replace(" ", "");
        if (password.isBlank() || password.length() != 16) {
            throw new IllegalStateException(
                "Gmail SMTP requires a 16-character App Password. Current configured password length="
                    + password.length()
                    + ". Generate it in Google Account > Security > 2-Step Verification > App passwords."
            );
        }
    }

    public void sendChannelMessage(@NonNull String channel, @NonNull String recipient, String subject, @NonNull String body) {
        String normalizedChannel = channel.trim().toLowerCase(Locale.ROOT);
        switch (normalizedChannel) {
            case "email", "gmail" -> {
                EmailSendRequest emailRequest = new EmailSendRequest();
                emailRequest.setTo(recipient);
                emailRequest.setSubject(normalizeSubject(subject));
                emailRequest.setBody(body);
                sendEmail(emailRequest);
            }
            case "whatsapp", "instagram", "facebook", "linkedin" -> sendSocialMessage(normalizedChannel, recipient, body);
            default -> throw new IllegalStateException("Unsupported channel: " + normalizedChannel);
        }
    }

    public List<WhatsAppMessageResponse> getWhatsAppMessages(@NonNull String contact) {
        String normalizedContact = normalizeContact(contact);
        return communicationRecordRepository
            .findTop500ByChannelIgnoreCaseAndContactIdentifierOrderByCreatedAtAsc("WHATSAPP", normalizedContact)
            .stream()
            .map(this::toMessageResponse)
            .toList();
    }

    public List<WhatsAppConversationResponse> getWhatsAppConversations() {
        List<CommunicationRecord> rows = communicationRecordRepository.findRecentByChannel(
            "WHATSAPP",
            PageRequest.of(0, 1000)
        );

        Map<String, CommunicationRecord> latestByContact = new LinkedHashMap<>();
        for (CommunicationRecord row : rows) {
            String contact = trim(row.getContactIdentifier());
            if (contact.isBlank()) {
                continue;
            }
            latestByContact.putIfAbsent(contact, row);
        }

        return latestByContact.values().stream()
            .map(row -> WhatsAppConversationResponse.builder()
                .contact(row.getContactIdentifier())
                .lastMessage(row.getBody())
                .lastDirection(row.getDirection())
                .lastAt(row.getCreatedAt())
                .build())
            .sorted(Comparator.comparing(
                (WhatsAppConversationResponse c) -> c.getLastAt() == null ? OffsetDateTime.MIN : c.getLastAt()
            ).reversed())
            .toList();
    }

    // ── Facebook Messenger ────────────────────────────────────────

    @Async
    public void processFacebookMessengerWebhookAsync(String rawBody) {
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode entries = root.path("entry");
            if (!entries.isArray()) return;

            int saved = 0;
            for (JsonNode entry : entries) {
                JsonNode messaging = entry.path("messaging");
                if (!messaging.isArray()) continue;
                for (JsonNode event : messaging) {
                    String psid = trim(event.at("/sender/id").asText(""));
                    JsonNode msgNode = event.path("message");
                    if (psid.isBlank() || msgNode.isMissingNode()) continue;
                    if (msgNode.path("is_echo").asBoolean(false)) continue;

                    String text = trim(msgNode.path("text").asText(""));
                    String mid  = trim(msgNode.path("mid").asText(""));
                    if (text.isBlank()) continue;

                    boolean persisted = tryPersistCommunication(
                        "FACEBOOK", "IN", psid, text, "RECEIVED", mid, toJson(event), "facebook_messenger"
                    );
                    if (persisted) saved++;
                }
            }
            log.info("Facebook Messenger webhook processed, inbound saved={}", saved);
        } catch (Exception e) {
            log.error("Error processing Facebook Messenger webhook", e);
        }
    }

    public List<WhatsAppMessageResponse> getFacebookMessages(String psid) {
        String normalizedPsid = psid == null ? "" : psid.trim().replaceAll("\\D", "");
        return communicationRecordRepository
            .findTop500ByChannelIgnoreCaseAndContactIdentifierOrderByCreatedAtAsc("FACEBOOK", normalizedPsid)
            .stream()
            .map(this::toMessageResponse)
            .toList();
    }

    public List<WhatsAppConversationResponse> getFacebookConversations() {
        List<CommunicationRecord> rows = communicationRecordRepository.findRecentByChannel(
            "FACEBOOK", PageRequest.of(0, 1000)
        );

        Map<String, CommunicationRecord> latestByContact = new LinkedHashMap<>();
        for (CommunicationRecord row : rows) {
            String contact = trim(row.getContactIdentifier());
            if (contact.isBlank()) continue;
            latestByContact.putIfAbsent(contact, row);
        }

        return latestByContact.values().stream()
            .map(row -> WhatsAppConversationResponse.builder()
                .contact(row.getContactIdentifier())
                .lastMessage(row.getBody())
                .lastDirection(row.getDirection())
                .lastAt(row.getCreatedAt())
                .build())
            .sorted(Comparator.comparing(
                (WhatsAppConversationResponse c) -> c.getLastAt() == null ? OffsetDateTime.MIN : c.getLastAt()
            ).reversed())
            .toList();
    }

    public Map<String, Object> processWhatsAppWebhook(Map<String, Object> payload) {
        JsonNode root = objectMapper.valueToTree(payload);
        List<JsonNode> candidates = collectCandidates(root);
        int saved = 0;

        for (JsonNode candidate : candidates) {
            String contact = extractContact(candidate);
            String text = extractText(candidate);
            String direction = extractDirection(candidate);
            String externalId = extractExternalId(candidate);
            String status = extractStatus(candidate);

            if (contact.isBlank() || text.isBlank()) {
                continue;
            }
            if (!"IN".equals(direction)) {
                continue;
            }

            boolean persisted = tryPersistCommunication(
                "WHATSAPP",
                direction,
                contact,
                text,
                status,
                externalId,
                toJson(candidate),
                "aiadrika"
            );
            if (persisted) {
                saved++;
            }
        }

        if (saved == 0) {
            log.info("WhatsApp webhook received, no inbound messages detected.");
        } else {
            log.info("WhatsApp webhook processed, inbound saved={}", saved);
        }

        return Map.of("ok", true, "saved", saved);
    }

    private void sendSocialMessage(String channel, String recipient, String body) {
        if ("whatsapp".equals(channel)) {
            sendViaAiadrikaWhatsApp(recipient, body);
            return;
        }

        if (!integrationService.isConnected(channel)) {
            throw new IllegalStateException("Connect " + channel + " in Integrations page first.");
        }

        log.info("Simulated {} send to {} with text length {}", channel, recipient, body.length());
    }

    private void sendViaAiadrikaWhatsApp(String recipient, String body) {
        String number = recipient == null ? "" : recipient.replaceAll("\\D", "");
        if (number.isBlank()) {
            throw new IllegalStateException("Invalid WhatsApp number.");
        }

        Map<String, String> config = integrationService.getConfig("whatsapp");
        String instanceId = trim(config.get("instanceId"));
        String accessToken = trim(config.get("accessToken"));

        if (instanceId.isBlank()) {
            instanceId = trim(defaultInstanceId);
        }
        if (accessToken.isBlank()) {
            accessToken = trim(defaultAccessToken);
        }

        if (instanceId.isBlank() || accessToken.isBlank()) {
            throw new IllegalStateException("WhatsApp instance ID or access token is missing in backend config.");
        }

        String url = UriComponentsBuilder.fromHttpUrl(aiadrikaBaseUrl)
            .queryParam("number", number)
            .queryParam("type", "text")
            .queryParam("message", body)
            .queryParam("instance_id", instanceId)
            .queryParam("access_token", accessToken)
            .build(true)
            .toUriString();

        try {
            String response = new RestTemplate().getForObject(url, String.class);
            String externalId = null;
            if (response != null && !response.isBlank()) {
                Map<String, Object> data = objectMapper.readValue(response, MAP_TYPE);
                Object status = data.get("status");
                if (status != null && "error".equalsIgnoreCase(String.valueOf(status))) {
                    String apiMessage = String.valueOf(data.getOrDefault("message", "Unknown error"));
                    throw new IllegalStateException("Aiadrika error: " + apiMessage);
                }
                externalId = extractExternalId(objectMapper.valueToTree(data));
            }
            tryPersistCommunication("WHATSAPP", "OUT", number, body, "SENT", externalId, response, "aiadrika");
            log.info("WhatsApp sent via Aiadrika to {}", number);
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Aiadrika send failed: {}", ex.getMessage());
            throw new IllegalStateException("Failed to send WhatsApp message via Aiadrika.");
        }
    }

    private String normalizeSubject(String subject) {
        String normalized = subject == null ? "" : subject.trim();
        return normalized.isBlank() ? "NexaCRM message" : normalized;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private void persistCommunication(
        String channel,
        String direction,
        String contactIdentifier,
        String body,
        String status,
        String externalId,
        String rawPayload,
        String provider
    ) {
        Long tenantId = resolveTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("No tenant found in database. Create a tenant before persisting communications.");
        }

        CommunicationRecord record = new CommunicationRecord();
        record.setTenantId(tenantId);
        record.setChannel(channel);
        record.setDirection(direction);
        record.setBody(body);
        record.setStatus(trim(status).isBlank() ? "SENT" : trim(status).toUpperCase(Locale.ROOT));
        record.setExternalId(trim(externalId));
        record.setContactIdentifier(normalizeContact(contactIdentifier));
        record.setProvider(provider);
        record.setRawPayload(rawPayload);
        record.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        communicationRecordRepository.save(record);
    }

    private boolean tryPersistCommunication(
        String channel,
        String direction,
        String contactIdentifier,
        String body,
        String status,
        String externalId,
        String rawPayload,
        String provider
    ) {
        try {
            persistCommunication(channel, direction, contactIdentifier, body, status, externalId, rawPayload, provider);
            return true;
        } catch (Exception ex) {
            log.warn(
                "Communication persistence failed for {} {}: {}",
                channel,
                contactIdentifier,
                ex.getMessage(),
                ex
            );
            return false;
        }
    }

    private Long resolveTenantId() {
        List<?> rows = entityManager
            .createNativeQuery("select id from tenants order by id asc limit 1")
            .getResultList();
        if (rows.isEmpty()) {
            return null;
        }
        Object id = rows.get(0);
        if (id instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(id));
    }

    private WhatsAppMessageResponse toMessageResponse(CommunicationRecord row) {
        return WhatsAppMessageResponse.builder()
            .id(row.getId())
            .contact(row.getContactIdentifier())
            .direction(row.getDirection())
            .body(row.getBody())
            .status(row.getStatus())
            .externalId(row.getExternalId())
            .createdAt(row.getCreatedAt())
            .build();
    }

    private List<JsonNode> collectCandidates(JsonNode root) {
        List<JsonNode> candidates = new ArrayList<>();

        JsonNode messages = root.path("messages");
        if (messages.isArray()) {
            messages.forEach(candidates::add);
        }

        JsonNode data = root.path("data");
        if (data.isArray()) {
            data.forEach(candidates::add);
        } else if (data.isObject()) {
            candidates.add(data);
        }

        JsonNode message = root.path("message");
        if (message.isArray()) {
            message.forEach(candidates::add);
        } else if (message.isObject()) {
            candidates.add(message);
        }

        if (candidates.isEmpty()) {
            candidates.add(root);
        }
        return candidates;
    }

    private String extractDirection(JsonNode node) {
        JsonNode direction = node.path("direction");
        if (direction.isTextual()) {
            String raw = trim(direction.asText(""));
            if ("out".equalsIgnoreCase(raw) || "outgoing".equalsIgnoreCase(raw) || "sent".equalsIgnoreCase(raw)) {
                return "OUT";
            }
            if ("in".equalsIgnoreCase(raw) || "incoming".equalsIgnoreCase(raw) || "received".equalsIgnoreCase(raw)) {
                return "IN";
            }
        }
        JsonNode fromMeDirect = node.path("fromMe");
        if (fromMeDirect.isBoolean() && fromMeDirect.booleanValue()) {
            return "OUT";
        }
        JsonNode fromMe = node.at("/key/fromMe");
        if (fromMe.isBoolean() && fromMe.booleanValue()) {
            return "OUT";
        }
        return "IN";
    }

    private String extractContact(JsonNode node) {
        String[] options = {
            node.at("/key/remoteJid").asText(""),
            node.at("/key/participant").asText(""),
            node.at("/chat/id").asText(""),
            node.at("/chat/jid").asText(""),
            node.path("from").asText(""),
            node.path("to").asText(""),
            node.path("sender").asText(""),
            node.path("recipient").asText(""),
            node.path("number").asText(""),
            node.path("chatId").asText(""),
            node.path("jid").asText(""),
            node.path("author").asText(""),
            node.path("remoteJid").asText("")
        };
        for (String option : options) {
            String normalized = normalizeContact(option);
            if (!normalized.isBlank()) {
                return normalized;
            }
        }
        return "";
    }

    private String extractText(JsonNode node) {
        String[] options = {
            node.at("/message/conversation").asText(""),
            node.at("/message/extendedTextMessage/text").asText(""),
            node.at("/message/text").asText(""),
            node.at("/messageTemplate/text").asText(""),
            node.at("/data/text").asText(""),
            node.at("/data/body").asText(""),
            node.path("text").asText(""),
            node.path("body").asText(""),
            node.path("caption").asText(""),
            node.path("message").asText(""),
            node.path("msg").asText(""),
            node.path("content").asText("")
        };
        for (String option : options) {
            String value = trim(option);
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String extractExternalId(JsonNode node) {
        String id = trim(node.at("/key/id").asText(""));
        if (!id.isBlank()) {
            return id;
        }
        return trim(node.path("id").asText(""));
    }

    private String extractStatus(JsonNode node) {
        String status = trim(node.path("status").asText(""));
        return status.isBlank() ? "RECEIVED" : status;
    }

    private String normalizeContact(String raw) {
        String value = trim(raw);
        if (value.contains("@")) {
            value = value.substring(0, value.indexOf('@'));
        }
        value = value.replaceAll("\\D", "");
        return value;
    }

    private String toJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception ignored) {
            return "";
        }
    }
}
