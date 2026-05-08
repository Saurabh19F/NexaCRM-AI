package com.nexacrm.controller;

import com.nexacrm.service.AIService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Engine", description = "AI-powered CRM features via OpenAI GPT-4")
public class AIController {

    private final AIService aiService;

    @PostMapping("/chat")
    @Operation(summary = "Chat with NexaAI assistant")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody Map<String, List<Map<String, String>>> body) {
        String response = aiService.chat(body.get("messages"));
        return ResponseEntity.ok(Map.of("response", response));
    }

    @PostMapping("/score/{leadId}")
    @Operation(summary = "Score a lead using AI — returns Hot/Warm/Cold with reasoning")
    public ResponseEntity<Map<String, Object>> scoreLead(@PathVariable Long leadId) {
        return ResponseEntity.ok(aiService.scoreLead(leadId));
    }

    @PostMapping("/predict/{dealId}")
    @Operation(summary = "Predict deal win probability using AI")
    public ResponseEntity<Map<String, Object>> predictDeal(@PathVariable Long dealId) {
        return ResponseEntity.ok(aiService.predictDealOutcome(dealId));
    }

    @PostMapping("/generate-email")
    @Operation(summary = "Generate AI email draft")
    public ResponseEntity<Map<String, String>> generateEmail(@RequestBody Map<String, Object> params) {
        String email = aiService.generateEmail(params);
        return ResponseEntity.ok(Map.of("email", email));
    }

    @GetMapping("/insights")
    @Operation(summary = "Get AI-generated business insights for the dashboard")
    public ResponseEntity<List<Map<String, Object>>> getInsights() {
        return ResponseEntity.ok(aiService.generateInsights());
    }

    @GetMapping("/next-actions/{leadId}")
    @Operation(summary = "Get AI-suggested next best actions for a lead")
    public ResponseEntity<List<String>> getNextActions(@PathVariable Long leadId) {
        return ResponseEntity.ok(aiService.suggestNextActions(leadId));
    }

    @PostMapping("/summarize/{entityType}/{entityId}")
    @Operation(summary = "Summarize a lead, deal, or customer using AI")
    public ResponseEntity<Map<String, String>> summarize(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        String summary = aiService.summarizeEntity(entityType, entityId);
        return ResponseEntity.ok(Map.of("summary", summary));
    }
}
