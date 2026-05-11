package com.nexacrm.service;

import com.nexacrm.model.Lead;
import com.nexacrm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    @Value("${openai.model:gpt-4-turbo-preview}")
    private String model;

    private final LeadRepository leadRepository;

    // ── Chat ──────────────────────────────────────────────────────

    public String chat(List<Map<String, String>> messages) {
        log.info("AI chat request with {} messages", messages.size());

        // Production: call OpenAI ChatCompletion API
        // ChatCompletionRequest request = ChatCompletionRequest.builder()
        //     .model(model)
        //     .messages(messages.stream().map(m ->
        //         new ChatMessage(m.get("role"), m.get("content"))).collect(Collectors.toList()))
        //     .maxTokens(1500)
        //     .build();
        // return openAiService.createChatCompletion(request).getChoices().get(0).getMessage().getContent();

        // Demo response
        String lastUserMessage = messages.stream()
            .filter(m -> "user".equals(m.get("role")))
            .reduce((first, second) -> second)
            .map(m -> m.get("content"))
            .orElse("");

        return generateDemoResponse(lastUserMessage);
    }

    // ── Lead Scoring ──────────────────────────────────────────────

    public Map<String, Object> scoreLead(String leadId) {
        Optional<Lead> leadOpt = leadRepository.findById(leadId);
        if (leadOpt.isEmpty()) {
            return Map.of("error", "Lead not found");
        }
        Lead lead = leadOpt.get();

        // Production: send lead context to GPT-4 with scoring prompt
        // Calculate score based on: company size, engagement, deal value, last contact, source
        int scoreValue = calculateHeuristicScore(lead);
        String scoreLabel = scoreValue >= 70 ? "HOT" : scoreValue >= 40 ? "WARM" : "COLD";
        String reasoning = buildScoreReasoning(lead, scoreValue);
        String nextAction = suggestAction(lead, scoreLabel);

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
        // Production: call GPT-4 with deal history, activities, stage, value
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

    // ── Email Generation ──────────────────────────────────────────

    public String generateEmail(Map<String, Object> params) {
        String leadName    = (String) params.getOrDefault("leadName", "");
        String company     = (String) params.getOrDefault("company", "");
        String emailType   = (String) params.getOrDefault("emailType", "Follow-up");
        String tone        = (String) params.getOrDefault("tone", "Professional");
        String keyPoints   = (String) params.getOrDefault("keyPoints", "");

        // Production: GPT-4 prompt with lead context
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

    // ── Insights ─────────────────────────────────────────────────

    public List<Map<String, Object>> generateInsights() {
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

    // ── Next Actions ──────────────────────────────────────────────

    public List<String> suggestNextActions(String leadId) {
        return List.of(
            "Schedule a discovery call within 24 hours",
            "Send personalized case study from similar industry",
            "Connect on LinkedIn to build rapport",
            "Share ROI calculator tailored to their company size"
        );
    }

    // ── Summarize ─────────────────────────────────────────────────

    public String summarizeEntity(String entityType, String entityId) {
        return String.format(
            "AI Summary for %s #%s: High-value prospect with strong engagement signals. " +
            "Last interaction was 2 days ago. Recommend priority follow-up within 24 hours.",
            entityType, entityId
        );
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
}
