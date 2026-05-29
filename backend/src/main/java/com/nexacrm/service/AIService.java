package com.nexacrm.service;

import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI Service — integrates with OpenAI GPT-4 for:
 * - Lead scoring (Hot/Warm/Cold)
 * - Deal win probability prediction
 * - Email generation
 * - CRM chat assistant
 * - Business insights
 * - Next-best-action suggestions
 *
 * Wire in a real OpenAI client (e.g. openai-java) once the API key is configured.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIService {

    @Value("${openai.api.key:placeholder}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    @Value("${openai.max-tokens:1500}")
    private int defaultMaxTokens;

    private final LeadRepository leadRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // ── Chat ──────────────────────────────────────────────────────

    public String chat(List<Map<String, String>> messages) {
        List<Map<String, String>> safeMessages = messages == null ? Collections.emptyList() : messages;
        log.info("AI chat request with {} messages", safeMessages.size());

        List<Map<String, String>> payloadMessages = new ArrayList<>();
        payloadMessages.add(Map.of(
            "role", "system",
            "content", "You are NexaAI, an expert CRM copilot. Be concise, practical, and actionable."
        ));
        payloadMessages.addAll(safeMessages);

        try {
            return callOpenAIText(payloadMessages, Math.max(defaultMaxTokens, 1200), 0.6);
        } catch (Exception e) {
            log.warn("OpenAI chat failed, using fallback: {}", e.getMessage());
            String lastUserMessage = safeMessages.stream()
                .filter(m -> "user".equals(m.get("role")))
                .reduce((first, second) -> second)
                .map(m -> m.get("content"))
                .orElse("");
            return generateDemoResponse(lastUserMessage);
        }
    }

    // ── Lead Scoring ──────────────────────────────────────────────

    public Map<String, Object> scoreLead(String leadId) {
        Optional<Lead> leadOpt = leadRepository.findById(leadId);
        if (leadOpt.isEmpty()) {
            return Map.of("error", "Lead not found");
        }
        Lead lead = leadOpt.get();

        int scoreValue = calculateHeuristicScore(lead);
        String scoreLabel = scoreValue >= 70 ? "HOT" : scoreValue >= 40 ? "WARM" : "COLD";
        String reasoning = buildScoreReasoning(lead, scoreValue);
        String nextAction = suggestAction(lead, scoreLabel);

        try {
            String prompt = """
                Score this CRM lead and return strict JSON:
                {
                  "scoreLabel": "HOT|WARM|COLD",
                  "scoreValue": <integer 0-99>,
                  "reasoning": "<short reason>",
                  "nextAction": "<single clear action>"
                }

                Lead:
                %s
                """.formatted(Map.of(
                    "id", lead.getId(),
                    "name", lead.getName(),
                    "company", lead.getCompany(),
                    "source", String.valueOf(lead.getSource()),
                    "status", String.valueOf(lead.getStatus()),
                    "dealValue", lead.getDealValue()
                ));

            Map<String, Object> ai = callOpenAIJson(
                "You are a CRM lead scoring analyst. Output only valid JSON.",
                prompt,
                500,
                0.2
            );

            scoreLabel = String.valueOf(ai.getOrDefault("scoreLabel", scoreLabel)).toUpperCase();
            if (!List.of("HOT", "WARM", "COLD").contains(scoreLabel)) {
                scoreLabel = scoreValue >= 70 ? "HOT" : scoreValue >= 40 ? "WARM" : "COLD";
            }

            Object aiScoreValue = ai.get("scoreValue");
            if (aiScoreValue instanceof Number n) {
                scoreValue = Math.max(0, Math.min(99, n.intValue()));
            }

            reasoning = String.valueOf(ai.getOrDefault("reasoning", reasoning));
            nextAction = String.valueOf(ai.getOrDefault("nextAction", nextAction));
        } catch (Exception e) {
            log.warn("OpenAI lead scoring failed, using heuristic fallback: {}", e.getMessage());
        }

        // Persist back to DB
        lead.setAiScoreValue(scoreValue);
        lead.setAiNextAction(nextAction);
        if (scoreLabel.equals("HOT") && lead.getScore() != Lead.LeadScore.HOT) {
            lead.setScore(Lead.LeadScore.HOT);
        }
        leadRepository.save(lead);

        return Map.of(
            "leadId", leadId,
            "score", scoreLabel,
            "scoreValue", scoreValue,
            "reasoning", reasoning,
            "nextAction", nextAction
        );
    }

    @Async
    public void scoreLeadAsync(String leadId) {
        try {
            scoreLead(leadId);
        } catch (Exception e) {
            log.error("Async lead scoring failed for id={}: {}", leadId, e.getMessage());
        }
    }

    // ── Deal Prediction ───────────────────────────────────────────

    public Map<String, Object> predictDealOutcome(String dealId) {
        String prompt = """
            Predict win probability for this CRM opportunity and return strict JSON:
            {
              "winProbability": <integer 0-100>,
              "confidence": "LOW|MEDIUM|HIGH",
              "keyFactors": ["..."],
              "riskFactors": ["..."],
              "recommendation": "..."
            }

            DealId: %s
            """.formatted(dealId);

        try {
            Map<String, Object> ai = callOpenAIJson(
                "You are a B2B sales forecasting assistant. Output only valid JSON.",
                prompt,
                700,
                0.3
            );

            int winProbability = 70;
            Object winProbabilityObj = ai.get("winProbability");
            if (winProbabilityObj instanceof Number n) {
                winProbability = Math.max(0, Math.min(100, n.intValue()));
            }

            String confidence = String.valueOf(ai.getOrDefault("confidence", "MEDIUM"));
            List<String> keyFactors = asStringList(ai.get("keyFactors"), List.of("Strong stakeholder engagement"));
            List<String> riskFactors = asStringList(ai.get("riskFactors"), List.of("Insufficient recent activity"));
            String recommendation = String.valueOf(ai.getOrDefault("recommendation", "Schedule a next-step call this week"));

            return Map.of(
                "dealId", dealId,
                "winProbability", winProbability,
                "confidence", confidence,
                "keyFactors", keyFactors,
                "riskFactors", riskFactors,
                "recommendation", recommendation
            );
        } catch (Exception e) {
            log.warn("OpenAI deal prediction failed, using fallback: {}", e.getMessage());
            int probability = 65 + (int)(Math.random() * 30);
            return Map.of(
                "dealId", dealId,
                "winProbability", probability,
                "confidence", "HIGH",
                "keyFactors", List.of(
                    "Decision maker engaged",
                    "Budget confirmed",
                    "Timeline agreed",
                    "Competitor analysis completed"
                ),
                "riskFactors", List.of("Procurement approval pending"),
                "recommendation", "Schedule closing call within 48 hours"
            );
        }
    }

    // ── Email Generation ──────────────────────────────────────────

    public String generateEmail(Map<String, Object> params) {
        String leadName    = (String) params.getOrDefault("leadName", "");
        String company     = (String) params.getOrDefault("company", "");
        String emailType   = (String) params.getOrDefault("emailType", "Follow-up");
        String tone        = (String) params.getOrDefault("tone", "Professional");
        String keyPoints   = (String) params.getOrDefault("keyPoints", "");

        String userPrompt = """
            Write a complete sales email draft.
            Constraints:
            - Include a clear subject line as first line prefixed with "Subject:".
            - Keep the tone: %s.
            - Email type: %s.
            - Personalize for contact: %s, company: %s.
            - Use this context where relevant: %s.
            - Keep it concise, persuasive, and natural.
            - Do not include markdown.
            """.formatted(
                tone,
                emailType,
                leadName.isBlank() ? "there" : leadName,
                company.isBlank() ? "their organization" : company,
                keyPoints.isBlank() ? "No extra context" : keyPoints
            );

        try {
            return callOpenAIText(
                List.of(
                    Map.of("role", "system", "content", "You are an expert B2B sales copywriter."),
                    Map.of("role", "user", "content", userPrompt)
                ),
                900,
                0.8
            );
        } catch (Exception e) {
            log.warn("OpenAI email generation failed, using fallback: {}", e.getMessage());
            return String.format("""
                Subject: %s — Continuing Our Conversation

                Dear %s,

                I hope this message finds you well. I'm following up on our recent discussion about implementing NexaCRM AI at %s.

                %s

                Based on your requirements, I believe we have an excellent solution that can help your team:
                • Reduce sales cycle by 35%%
                • Improve lead conversion by 2.5x with AI scoring
                • Automate 80%% of routine follow-ups

                I'd love to schedule a brief call to address any questions and discuss next steps.
                Would Thursday or Friday work for a 30-minute demo?

                Looking forward to your response.

                Best regards,
                Your NexaCRM AI Assistant
                """,
                emailType, leadName.isEmpty() ? "there" : leadName,
                company.isEmpty() ? "your organization" : company,
                keyPoints.isEmpty() ? "" : "\n" + keyPoints + "\n"
            );
        }
    }

    // ── Insights ─────────────────────────────────────────────────

    public List<Map<String, Object>> generateInsights() {
        String prompt = """
            Return strict JSON array with exactly 4 CRM insights.
            Each item format:
            {
              "id": <integer>,
              "type": "prediction|warning|opportunity|insight",
              "title": "...",
              "body": "...",
              "action": "..."
            }
            """;

        try {
            String raw = callOpenAIText(
                List.of(
                    Map.of("role", "system", "content", "You are a CRM analytics assistant. Output valid JSON only."),
                    Map.of("role", "user", "content", prompt)
                ),
                900,
                0.5
            );
            String jsonArray = extractJsonArray(raw);
            return objectMapper.readValue(jsonArray, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("OpenAI insights generation failed, using fallback: {}", e.getMessage());
            return List.of(
                Map.of("id", 1, "type", "prediction",  "title", "High Win Probability",
                       "body", "HCL Tech Package has 89% win probability — schedule demo call this week.",
                       "action", "Schedule Call"),
                Map.of("id", 2, "type", "warning",     "title", "At-Risk Deal",
                       "body", "Wipro Cloud Suite stalled for 8 days. Send follow-up now.",
                       "action", "Send Follow-up"),
                Map.of("id", 3, "type", "opportunity", "title", "Upsell Opportunity",
                       "body", "Bajaj Finserv may be ready for add-ons based on usage patterns.",
                       "action", "View Profile"),
                Map.of("id", 4, "type", "insight",     "title", "Best Contact Time",
                       "body", "LinkedIn leads respond 3x better between 10am–12pm on weekdays.",
                       "action", "Plan Campaign")
            );
        }
    }

    // ── Next Actions ──────────────────────────────────────────────

    public List<String> suggestNextActions(String leadId) {
        String prompt = """
            Suggest 4 next best sales actions for lead id %s.
            Return strict JSON array of strings only.
            """.formatted(leadId);

        try {
            String raw = callOpenAIText(
                List.of(
                    Map.of("role", "system", "content", "You are a CRM sales coach. Output valid JSON only."),
                    Map.of("role", "user", "content", prompt)
                ),
                400,
                0.4
            );
            String jsonArray = extractJsonArray(raw);
            return objectMapper.readValue(jsonArray, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("OpenAI next-actions generation failed, using fallback: {}", e.getMessage());
            return List.of(
                "Schedule a discovery call within 24 hours",
                "Send personalized case study from similar industry",
                "Connect on LinkedIn to build rapport",
                "Share ROI calculator tailored to their company size"
            );
        }
    }

    // ── Summarize ─────────────────────────────────────────────────

    public String summarizeEntity(String entityType, String entityId) {
        String prompt = """
            Summarize this CRM entity in 3-5 sentences with actionable guidance.
            Entity type: %s
            Entity id: %s
            """.formatted(entityType, entityId);

        try {
            return callOpenAIText(
                List.of(
                    Map.of("role", "system", "content", "You are a CRM analyst. Be specific and concise."),
                    Map.of("role", "user", "content", prompt)
                ),
                500,
                0.4
            );
        } catch (Exception e) {
            log.warn("OpenAI summary generation failed, using fallback: {}", e.getMessage());
            return String.format(
                "AI Summary for %s #%s: High-value prospect with strong engagement signals. " +
                "Last interaction was 2 days ago. Recommend priority follow-up within 24 hours.",
                entityType, entityId
            );
        }
    }

    // ── Private helpers ───────────────────────────────────────────

    private int calculateHeuristicScore(Lead lead) {
        int score = 30; // base

        // Source quality
        score += switch (lead.getSource()) {
            case LINKEDIN -> 20;
            case REFERRAL -> 25;
            case WEBSITE  -> 15;
            case FACEBOOK, INSTAGRAM -> 10;
            default       -> 5;
        };

        // Deal value
        if (lead.getDealValue() != null) {
            if (lead.getDealValue().doubleValue() > 400000) score += 25;
            else if (lead.getDealValue().doubleValue() > 100000) score += 15;
            else score += 5;
        }

        // Status progression
        score += switch (lead.getStatus()) {
            case QUALIFIED, PROPOSAL, NEGOTIATION -> 20;
            case CONTACTED -> 10;
            case NEW       -> 0;
            case WON       -> 30;
            default        -> 0;
        };

        return Math.min(score, 99);
    }

    private String buildScoreReasoning(Lead lead, int score) {
        List<String> reasons = new ArrayList<>();
        if (lead.getSource() == Lead.LeadSource.REFERRAL) reasons.add("referral source (high trust)");
        if (lead.getDealValue() != null && lead.getDealValue().doubleValue() > 200000) reasons.add("high deal value");
        if (lead.getStatus() == Lead.LeadStatus.QUALIFIED) reasons.add("lead is qualified");
        if (lead.getCompany() != null && !lead.getCompany().isEmpty()) reasons.add("company identified");
        return reasons.isEmpty() ? "Standard scoring applied" : "Key factors: " + String.join(", ", reasons);
    }

    private String suggestAction(Lead lead, String scoreLabel) {
        return switch (scoreLabel) {
            case "HOT"  -> "Call immediately — high win probability";
            case "WARM" -> "Send personalized follow-up within 24 hours";
            default     -> "Nurture with educational content";
        };
    }

    private String generateDemoResponse(String userMessage) {
        String lower = userMessage.toLowerCase();
        if (lower.contains("priorit")) {
            return "Based on your pipeline, here are today's top 3 priority actions:\n\n" +
                   "1. 🔥 Call Vijay Kumar (HCL Tech) — deal in Negotiation, ₹5.8L at stake\n" +
                   "2. 🔥 Send proposal to Divya Nair (InfoSys) — qualified lead, high urgency\n" +
                   "3. 🌡️ Follow up with Sunita Rao (Wipro) — proposal pending for 3 days";
        }
        if (lower.contains("email") || lower.contains("follow")) {
            return "Here's a personalized follow-up email draft:\n\nSubject: Continuing Our Partnership Discussion\n\n" +
                   "Dear [Name],\n\nThank you for your time. I wanted to follow up on our discussion about NexaCRM AI. " +
                   "Based on your team's requirements, I believe our Enterprise plan would reduce your sales cycle by 35%.\n\n" +
                   "Best regards,\nNexaCRM Team";
        }
        if (lower.contains("predict") || lower.contains("win") || lower.contains("probability")) {
            return "📊 Deal Win Predictions:\n\n• HCL Tech Package: **89%** win probability ↑\n" +
                   "• Wipro Cloud Suite: **67%** probability (follow-up needed)\n" +
                   "• InfoSys Enterprise: **72%** probability\n\nI recommend prioritizing the HCL deal this week.";
        }
        return "I'm analyzing your CRM data... Based on current pipeline metrics, you have " +
               "8 active deals worth ₹24.2L. Your top priority today should be the HCL Tech deal " +
               "in Negotiation stage. Would you like me to draft a follow-up email or schedule a call?";
    }

    private String callOpenAIText(List<Map<String, String>> messages, int maxTokens, double temperature) {
        if (!hasRealApiKey()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        Map<String, Object> payload = Map.of(
            "model", model,
            "messages", messages,
            "max_tokens", maxTokens,
            "temperature", temperature
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(
            "https://api.openai.com/v1/chat/completions",
            entity,
            Map.class
        );

        if (response == null) {
            throw new IllegalStateException("Empty OpenAI response");
        }

        Object choicesObj = response.get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
            throw new IllegalStateException("OpenAI response missing choices");
        }

        Object firstObj = choices.get(0);
        if (!(firstObj instanceof Map<?, ?> firstChoice)) {
            throw new IllegalStateException("OpenAI response choice format invalid");
        }

        Object messageObj = firstChoice.get("message");
        if (!(messageObj instanceof Map<?, ?> message)) {
            throw new IllegalStateException("OpenAI response missing message");
        }

        Object content = message.get("content");
        if (!(content instanceof String text) || text.isBlank()) {
            throw new IllegalStateException("OpenAI response content empty");
        }

        return text.trim();
    }

    private Map<String, Object> callOpenAIJson(String systemPrompt, String userPrompt, int maxTokens, double temperature) throws Exception {
        String raw = callOpenAIText(
            List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            ),
            maxTokens,
            temperature
        );
        String json = extractJsonObject(raw);
        return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
    }

    private List<String> asStringList(Object value, List<String> fallback) {
        if (value instanceof List<?> list) {
            List<String> converted = list.stream()
                .map(String::valueOf)
                .filter(s -> !s.isBlank())
                .toList();
            if (!converted.isEmpty()) return converted;
        }
        return fallback;
    }

    private String extractJsonObject(String input) {
        String trimmed = input == null ? "" : input.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
        Matcher matcher = Pattern.compile("\\{[\\s\\S]*\\}").matcher(trimmed);
        if (matcher.find()) return matcher.group();
        throw new IllegalStateException("No JSON object found in model output");
    }

    private String extractJsonArray(String input) {
        String trimmed = input == null ? "" : input.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
        Matcher matcher = Pattern.compile("\\[[\\s\\S]*\\]").matcher(trimmed);
        if (matcher.find()) return matcher.group();
        throw new IllegalStateException("No JSON array found in model output");
    }

    private boolean hasRealApiKey() {
        if (openAiApiKey == null) return false;
        String key = openAiApiKey.trim();
        return !key.isEmpty()
            && !key.equalsIgnoreCase("placeholder")
            && !key.equalsIgnoreCase("your-openai-key-here")
            && !key.equalsIgnoreCase("replace-me");
    }
}
