package com.nexacrm.service.dashboard;

import com.nexacrm.dto.DealDTO;
import com.nexacrm.dto.LeadDTO;
import com.nexacrm.dto.dashboard.DashboardOverviewDTO;
import com.nexacrm.dto.dashboard.DashboardWidgetSnapshotDTO;
import com.nexacrm.model.CommunicationRecord;
import com.nexacrm.model.Deal;
import com.nexacrm.model.Lead;
import com.nexacrm.model.LeadActivity;
import com.nexacrm.model.User;
import com.nexacrm.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.Arrays;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardAnalyticsService {

    private static final int PAGE_SIZE = 250;
    private static final int OVERVIEW_LEAD_LIMIT = 50;
    private static final int WIDGET_LEAD_LIMIT = 250;
    private static final int WIDGET_DEAL_LIMIT = 100;
    private static final int DASHBOARD_MONTHS = 6;
    private static final List<DashboardStage> DASHBOARD_STAGES = List.of(
        new DashboardStage("NEW", "New Leads", "#7c3aed"),
        new DashboardStage("CONTACTED", "Contacted", "#9333ea"),
        new DashboardStage("QUALIFIED", "Qualified", "#c026d3"),
        new DashboardStage("PROPOSAL", "Proposal", "#db2777"),
        new DashboardStage("NEGOTIATION", "Negotiation", "#f59e0b"),
        new DashboardStage("WON", "Won", "#10b981")
    );
    private static final Map<String, String> LEAD_SOURCE_COLORS = Map.ofEntries(
        Map.entry("facebook", "#1877f2"),
        Map.entry("instagram", "#e1306c"),
        Map.entry("linkedin", "#0077b5"),
        Map.entry("website", "#8b5cf6"),
        Map.entry("whatsapp", "#25d366"),
        Map.entry("referral", "#f59e0b"),
        Map.entry("email", "#0ea5e9"),
        Map.entry("google ads", "#f97316"),
        Map.entry("meta ads", "#ec4899")
    );
    private static final List<String> SOURCE_ORDER = List.of(
        "Facebook",
        "Instagram",
        "LinkedIn",
        "WhatsApp",
        "Website",
        "Google Sheet",
        "Manual Entry",
        "Google Ads",
        "Meta Ads",
        "Referral",
        "Email",
        "Other"
    );

    private final MongoTemplate mongoTemplate;

    private Long tenantId() {
        return TenantContext.currentTenantId();
    }

    public DashboardOverviewDTO overview() {
        List<org.bson.Document> leadDocs = fetchLeadDocuments(OVERVIEW_LEAD_LIMIT);
        Map<String, String> assignments = extractAssignments(leadDocs);
        List<LeadDTO> leads = leadDocs.stream()
            .map(doc -> docToLeadDTO(doc, assignments))
            .toList();
        List<DealDTO> deals = fetchDealDocuments(WIDGET_DEAL_LIMIT).stream()
            .map(this::docToDealDTO)
            .toList();

        return new DashboardOverviewDTO(
            leads,
            deals,
            buildFastInsights(leads),
            List.of(),
            List.of(),
            LocalDateTime.now().toString()
        );
    }

    public DashboardWidgetSnapshotDTO widgets() {
        List<Lead> leads = fetchLeadEntities();
        List<DealDTO> deals = fetchDealDocuments(WIDGET_DEAL_LIMIT).stream()
            .map(this::docToDealDTO)
            .toList();

        return new DashboardWidgetSnapshotDTO(
            buildAgingCounts(leads),
            buildSlaSummary(leads),
            buildEmployeePerformance(leads),
            buildMonthlyRevenue(deals),
            buildFunnelData(leads),
            buildLeadSources(leads),
            LocalDateTime.now().toString()
        );
    }

    private List<org.bson.Document> fetchLeadDocuments(int limit) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(tenantId()));
        query.addCriteria(Criteria.where("deleted").is(false));
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        query.limit(limit);
        includeDashboardLeadFields(query);
        return mongoTemplate.find(query, org.bson.Document.class, "leads");
    }

    private List<org.bson.Document> fetchDealDocuments(int limit) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(tenantId()));
        query.addCriteria(Criteria.where("deleted").ne(true));
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        query.limit(limit);
        includeDashboardDealFields(query);
        return mongoTemplate.find(query, org.bson.Document.class, "deals");
    }

    private void includeDashboardLeadFields(Query query) {
        query.fields()
            .include("name")
            .include("email")
            .include("phone")
            .include("company")
            .include("designation")
            .include("service")
            .include("specialization")
            .include("source")
            .include("status")
            .include("score")
            .include("priority")
            .include("deal_value")
            .include("utm_source")
            .include("utm_medium")
            .include("utm_campaign")
            .include("ai_score_value")
            .include("ai_next_action")
            .include("assigned_to")
            .include("tags")
            .include("notes")
            .include("converted_at")
            .include("lost_reason")
            .include("follow_up_date")
            .include("revenue_value")
            .include("facebook_lead_id")
            .include("facebook_form_id")
            .include("facebook_ad_id")
            .include("reminder_15_sent_at")
            .include("reminder_45_sent_at")
            .include("reminder_60_sent_at")
            .include("escalated_at")
            .include("reassigned_at")
            .include("createdAt")
            .include("updatedAt")
            .include("last_contacted_at");
    }

    private void includeDashboardDealFields(Query query) {
        query.fields()
            .include("title")
            .include("description")
            .include("stage")
            .include("priority")
            .include("deal_value")
            .include("expected_close_date")
            .include("actual_close_date")
            .include("win_probability")
            .include("pipeline_id")
            .include("ai_score")
            .include("tags")
            .include("notes")
            .include("createdAt")
            .include("updatedAt");
    }

    private Map<String, String> extractAssignments(List<org.bson.Document> leadDocs) {
        Map<String, String> leadToUserId = new LinkedHashMap<>();
        Set<String> userIds = new LinkedHashSet<>();
        for (org.bson.Document doc : leadDocs) {
            Object ref = doc.get("assigned_to");
            if (ref instanceof org.bson.Document refDoc) {
                Object uid = refDoc.get("$id");
                if (uid != null) {
                    String leadId = doc.getObjectId("_id").toString();
                    leadToUserId.put(leadId, uid.toString());
                    userIds.add(uid.toString());
                }
            }
        }
        if (userIds.isEmpty()) return Map.of();

        Query uq = new Query(Criteria.where("_id").in(userIds));
        uq.fields().include("name");
        Map<String, String> userNameMap = mongoTemplate.find(uq, org.bson.Document.class, "users").stream()
            .collect(Collectors.toMap(
                d -> d.getObjectId("_id").toString(),
                d -> d.getString("name") != null ? d.getString("name") : "",
                (a, b) -> a));

        Map<String, String> result = new LinkedHashMap<>();
        leadToUserId.forEach((leadId, userId) -> {
            String name = userNameMap.get(userId);
            if (name != null) result.put(leadId, name);
        });
        return result;
    }

    private LeadDTO docToLeadDTO(org.bson.Document d, Map<String, String> leadAssignments) {
        String id = d.getObjectId("_id").toString();
        return LeadDTO.builder()
            .id(id).name(d.getString("name")).email(d.getString("email")).phone(d.getString("phone"))
            .company(d.getString("company")).designation(d.getString("designation"))
            .service(d.getString("service")).specialization(d.getString("specialization"))
            .source(enumOrNull(Lead.LeadSource.class, d.getString("source")))
            .status(enumOrNull(Lead.LeadStatus.class, d.getString("status")))
            .score(enumOrNull(Lead.LeadScore.class, d.getString("score")))
            .priority(enumOrNull(Lead.LeadPriority.class, d.getString("priority")))
            .dealValue(d.get("deal_value") != null ? new BigDecimal(d.get("deal_value").toString()) : null)
            .utmSource(d.getString("utm_source")).utmMedium(d.getString("utm_medium")).utmCampaign(d.getString("utm_campaign"))
            .aiScoreValue(d.getInteger("ai_score_value")).aiNextAction(d.getString("ai_next_action"))
            .assignedToName(leadAssignments.get(id))
            .tags(d.getString("tags") != null && !d.getString("tags").isBlank() ? Arrays.asList(d.getString("tags").split(",")) : null)
            .notes(d.getString("notes"))
            .convertedAt(docDate(d, "converted_at")).lostReason(d.getString("lost_reason"))
            .followUpDate(docDate(d, "follow_up_date"))
            .revenueValue(d.get("revenue_value") != null ? new BigDecimal(d.get("revenue_value").toString()) : null)
            .facebookLeadId(d.getString("facebook_lead_id")).facebookFormId(d.getString("facebook_form_id")).facebookAdId(d.getString("facebook_ad_id"))
            .reminder15SentAt(docDate(d, "reminder_15_sent_at")).reminder45SentAt(docDate(d, "reminder_45_sent_at"))
            .reminder60SentAt(docDate(d, "reminder_60_sent_at")).escalatedAt(docDate(d, "escalated_at"))
            .reassignedAt(docDate(d, "reassigned_at"))
            .createdAt(docDate(d, "createdAt")).updatedAt(docDate(d, "updatedAt")).lastContactedAt(docDate(d, "last_contacted_at"))
            .build();
    }

    private DealDTO docToDealDTO(org.bson.Document d) {
        return DealDTO.builder()
            .id(d.getObjectId("_id").toString()).title(d.getString("title")).description(d.getString("description"))
            .stage(enumOrNull(Deal.DealStage.class, d.getString("stage")))
            .priority(enumOrNull(Deal.DealPriority.class, d.getString("priority")))
            .dealValue(d.get("deal_value") != null ? new BigDecimal(d.get("deal_value").toString()) : null)
            .expectedCloseDate(docLocalDate(d, "expected_close_date")).actualCloseDate(docLocalDate(d, "actual_close_date"))
            .winProbability(d.getInteger("win_probability"))
            .pipelineId(d.getLong("pipeline_id"))
            .aiScore(d.getString("ai_score")).tags(d.getString("tags")).notes(d.getString("notes"))
            .createdAt(docDate(d, "createdAt")).updatedAt(docDate(d, "updatedAt"))
            .build();
    }

    private <E extends Enum<E>> E enumOrNull(Class<E> cls, String val) {
        if (val == null || val.isBlank()) return null;
        try { return Enum.valueOf(cls, val); } catch (Exception e) { return null; }
    }

    private LocalDateTime docDate(org.bson.Document d, String key) {
        Object v = d.get(key);
        if (v instanceof java.util.Date date) return date.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
        if (v instanceof String s && !s.isBlank()) { try { return LocalDateTime.parse(s); } catch (Exception e) { return null; } }
        return null;
    }

    private LocalDate docLocalDate(org.bson.Document d, String key) {
        LocalDateTime dt = docDate(d, key);
        return dt != null ? dt.toLocalDate() : null;
    }

    private List<Lead> fetchLeadEntities() {
        return fetchLeadDocuments(WIDGET_LEAD_LIMIT).stream()
            .map(this::docToLeadEntity)
            .toList();
    }

    private Lead docToLeadEntity(org.bson.Document d) {
        Lead lead = new Lead();
        if (d.getObjectId("_id") != null) lead.setId(d.getObjectId("_id").toString());
        lead.setName(d.getString("name"));
        lead.setCompany(d.getString("company"));
        lead.setSource(enumOrNull(Lead.LeadSource.class, d.getString("source")));
        lead.setStatus(enumOrNull(Lead.LeadStatus.class, d.getString("status")));
        lead.setScore(enumOrNull(Lead.LeadScore.class, d.getString("score")));
        lead.setPriority(enumOrNull(Lead.LeadPriority.class, d.getString("priority")));
        lead.setDealValue(d.get("deal_value") != null ? new BigDecimal(d.get("deal_value").toString()) : null);
        lead.setRevenueValue(d.get("revenue_value") != null ? new BigDecimal(d.get("revenue_value").toString()) : null);
        lead.setFollowUpDate(docDate(d, "follow_up_date"));
        lead.setConvertedAt(docDate(d, "converted_at"));
        lead.setLastContactedAt(docDate(d, "last_contacted_at"));
        lead.setCreatedAt(docDate(d, "createdAt"));
        lead.setUpdatedAt(docDate(d, "updatedAt"));
        return lead;
    }

    private List<Map<String, Object>> safeDashboardInsights(List<LeadDTO> leads) {
        try {
            return buildLocalInsightsFromDTOs(leads);
        } catch (Exception ex) {
            return List.of(Map.of(
                "id", "insights-fallback",
                "type", "warning",
                "title", "Insights temporarily unavailable",
                "body", "AI insights are currently unavailable. The dashboard will keep showing live CRM data.",
                "action", "Dashboard"
            ));
        }
    }

    private List<Map<String, Object>> buildFastInsights(List<LeadDTO> fallbackLeads) {
        long total = countLeads();
        if (total <= 0 && fallbackLeads != null) {
            return buildLocalInsightsFromDTOs(fallbackLeads);
        }

        long qualified = countLeads(Criteria.where("status").in(
            Lead.LeadStatus.QUALIFIED,
            Lead.LeadStatus.PROPOSAL,
            Lead.LeadStatus.NEGOTIATION
        ));
        long won = countLeads(Criteria.where("status").is(Lead.LeadStatus.WON));
        long stale = countStaleLeads();

        Map.Entry<String, Long> topSource = topLeadSource();

        List<Map<String, Object>> insights = new ArrayList<>();
        insights.add(Map.of("id", 1, "type", "prediction", "title", "Qualified pipeline momentum",
            "body", qualified + " of " + total + " leads are already qualified or beyond, and " + won + " have closed won.", "action", "View Profile"));
        insights.add(Map.of("id", 2, "type", "warning", "title", "Stale follow-ups need attention",
            "body", stale + " leads have not been touched recently and are at risk of cooling off.", "action", "Schedule Call"));
        insights.add(Map.of("id", 3, "type", "opportunity", "title", "Strongest lead source",
            "body", "Your most active source is " + topSource.getKey() + " with " + topSource.getValue() + " live leads.", "action", "Plan Campaign"));
        insights.add(Map.of("id", 4, "type", "insight", "title", "Re-engagement opportunity",
            "body", "Many active prospects still need a follow-up touch. A quick re-engagement sequence can recover momentum.", "action", "Send Follow-up"));
        return insights;
    }

    private long countLeads(Criteria... extraCriteria) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(tenantId()));
        query.addCriteria(Criteria.where("deleted").is(false));
        for (Criteria criteria : extraCriteria) {
            query.addCriteria(criteria);
        }
        return mongoTemplate.count(query, "leads");
    }

    private long countStaleLeads() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        Query query = new Query();
        query.addCriteria(Criteria.where("tenant_id").is(tenantId()));
        query.addCriteria(Criteria.where("deleted").is(false));
        query.addCriteria(Criteria.where("status").nin(Lead.LeadStatus.WON, Lead.LeadStatus.LOST));
        query.addCriteria(new Criteria().orOperator(
            Criteria.where("last_contacted_at").lt(cutoff),
            Criteria.where("last_contacted_at").is(null).and("updatedAt").lt(cutoff),
            Criteria.where("last_contacted_at").exists(false).and("updatedAt").lt(cutoff)
        ));
        return mongoTemplate.count(query, "leads");
    }

    private Map.Entry<String, Long> topLeadSource() {
        Map.Entry<String, Long> top = Map.entry("unknown", 0L);
        for (Lead.LeadSource source : Lead.LeadSource.values()) {
            long count = countLeads(Criteria.where("source").is(source));
            if (count > top.getValue()) {
                top = Map.entry(sourceLabel(source), count);
            }
        }
        return top;
    }

    private List<Map<String, Object>> buildLocalInsightsFromDTOs(List<LeadDTO> leads) {
        long total = leads.size();
        long qualified = leads.stream().filter(l -> l.getStatus() == Lead.LeadStatus.QUALIFIED || l.getStatus() == Lead.LeadStatus.PROPOSAL || l.getStatus() == Lead.LeadStatus.NEGOTIATION).count();
        long won = leads.stream().filter(l -> l.getStatus() == Lead.LeadStatus.WON).count();
        long stale = leads.stream().filter(l -> {
            if (l.getStatus() == null || l.getStatus() == Lead.LeadStatus.WON || l.getStatus() == Lead.LeadStatus.LOST) return false;
            LocalDateTime ref = l.getLastContactedAt() != null ? l.getLastContactedAt() : l.getUpdatedAt();
            return ref != null && Duration.between(ref, LocalDateTime.now()).toDays() > 7;
        }).count();

        Map<String, Long> sourceCounts = new LinkedHashMap<>();
        for (LeadDTO l : leads) {
            String source = l.getSource() != null ? l.getSource().name().toLowerCase(Locale.ROOT) : "unknown";
            sourceCounts.merge(source, 1L, Long::sum);
        }
        Map.Entry<String, Long> topSource = sourceCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .orElse(Map.entry("unknown", 0L));

        List<Map<String, Object>> insights = new ArrayList<>();
        insights.add(Map.of("id", 1, "type", "prediction", "title", "Qualified pipeline momentum",
            "body", qualified + " of " + total + " leads are already qualified or beyond, and " + won + " have closed won.", "action", "View Profile"));
        insights.add(Map.of("id", 2, "type", "warning", "title", "Stale follow-ups need attention",
            "body", stale + " leads have not been touched recently and are at risk of cooling off.", "action", "Schedule Call"));
        insights.add(Map.of("id", 3, "type", "opportunity", "title", "Strongest lead source",
            "body", "Your most active source is " + topSource.getKey() + " with " + topSource.getValue() + " live leads.", "action", "Plan Campaign"));
        insights.add(Map.of("id", 4, "type", "insight", "title", "Re-engagement opportunity",
            "body", "Many active prospects still need a follow-up touch. A quick re-engagement sequence can recover momentum.", "action", "Send Follow-up"));
        return insights;
    }

    private List<Map<String, Object>> buildRecentActivity(List<LeadDTO> leads) {
        List<LeadDTO> recentLeads = leads.stream()
            .sorted(Comparator.comparing(this::leadTimestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .limit(4)
            .toList();

        Set<String> leadIds = recentLeads.stream().map(LeadDTO::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        Query actQ = new Query();
        actQ.addCriteria(Criteria.where("lead_id").in(leadIds));
        actQ.addCriteria(Criteria.where("tenant_id").is(tenantId()));
        actQ.addCriteria(Criteria.where("deleted").is(false));
        actQ.with(Sort.by(Sort.Direction.DESC, "savedAt"));
        List<LeadActivity> allActivities = mongoTemplate.find(actQ, LeadActivity.class);

        Map<String, List<LeadActivity>> actByLead = new LinkedHashMap<>();
        for (LeadActivity a : allActivities) {
            actByLead.computeIfAbsent(a.getLeadId(), k -> new ArrayList<>()).add(a);
        }

        List<Map<String, Object>> feed = new ArrayList<>();
        for (LeadDTO lead : recentLeads) {
            List<LeadActivity> activities = actByLead.getOrDefault(lead.getId(), List.of());
            for (LeadActivity activity : activities.stream().limit(2).toList()) {
                feed.add(activityRow(lead, activity));
            }
            feed.add(leadRow(lead));
        }

        return feed.stream()
            .sorted(Comparator.comparing((Map<String, Object> row) -> parseTimestamp(String.valueOf(row.get("timestamp"))),
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed())
            .limit(7)
            .toList();
    }

    private Map<String, Object> leadRow(LeadDTO lead) {
        LocalDateTime timestamp = leadTimestamp(lead);
        String source = formatSourceLabel(String.valueOf(lead.getSource() != null ? lead.getSource().name() : "OTHER"));
        String user = lead.getAssignedToName() != null && !lead.getAssignedToName().isBlank()
            ? lead.getAssignedToName()
            : "System";

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "lead-" + lead.getId());
        row.put("type", "lead");
        row.put("text", "Lead " + safeText(lead.getName(), "Unnamed lead") + " from " + source + " is " + safeText(lead.getStatus() != null ? lead.getStatus().name() : "NEW", "NEW").toLowerCase(Locale.ROOT));
        row.put("time", formatRelativeTime(timestamp));
        row.put("user", user);
        row.put("avatar", avatarFor(user));
        row.put("timestamp", timestamp != null ? timestamp.toString() : "");
        return row;
    }

    private Map<String, Object> activityRow(LeadDTO lead, LeadActivity activity) {
        LocalDateTime timestamp = activity.getSavedAt();
        String assignedTo = safeText(activity.getAssignedTo(), lead.getAssignedToName() != null ? lead.getAssignedToName() : "System");
        String summary = safeText(activity.getSummary(), activity.getActivityTitle() != null ? activity.getActivityTitle() : "Activity updated");

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", activity.getId() != null ? activity.getId() : lead.getId() + "-" + activity.getActivityId());
        row.put("type", safeText(activity.getActivityTitle(), "note").toLowerCase(Locale.ROOT));
        row.put("text", summary);
        row.put("time", formatRelativeTime(timestamp));
        row.put("user", assignedTo);
        row.put("avatar", avatarFor(assignedTo));
        row.put("timestamp", timestamp != null ? timestamp.toString() : "");
        return row;
    }

    private List<Map<String, Object>> buildRecentCallSnapshots(List<LeadDTO> leads) {
        List<LeadDTO> sortedLeads = leads.stream()
            .sorted(Comparator.comparing(this::leadTimestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .limit(5)
            .toList();

        Set<String> leadIds = sortedLeads.stream().map(LeadDTO::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        Query callQ = new Query();
        callQ.addCriteria(Criteria.where("lead_id").in(leadIds));
        callQ.addCriteria(Criteria.where("channel").regex("^CALL$", "i"));
        callQ.with(Sort.by(Sort.Direction.DESC, "created_at"));
        List<CommunicationRecord> allCalls = mongoTemplate.find(callQ, CommunicationRecord.class);

        Map<String, List<CommunicationRecord>> callsByLead = new LinkedHashMap<>();
        for (CommunicationRecord c : allCalls) {
            callsByLead.computeIfAbsent(c.getLeadId(), k -> new ArrayList<>()).add(c);
        }

        List<Map<String, Object>> snapshots = new ArrayList<>();
        for (LeadDTO lead : sortedLeads) {
            List<CommunicationRecord> calls = callsByLead.getOrDefault(lead.getId(), List.of());
            if (calls.isEmpty()) {
                continue;
            }

            try {
                CommunicationRecord latest = calls.get(0);
                String summary = extractCallSummaryFromRecord(latest);
                String recordingUrl = extractFieldFromRawPayload(latest.getRawPayload(), List.of("recording_url", "recordingUrl", "recording"));
                String verdict = lead.getScore() != null ? lead.getScore().name() : "UNCERTAIN";
                int confidence = lead.getAiScoreValue() != null ? lead.getAiScoreValue() : 0;

                Map<String, Object> snapshot = new LinkedHashMap<>();
                snapshot.put("leadId", lead.getId());
                snapshot.put("leadName", safeText(lead.getName(), "Unknown"));
                snapshot.put("company", safeText(lead.getCompany(), ""));
                snapshot.put("currentStatus", lead.getStatus() != null ? lead.getStatus().name() : "NEW");
                snapshot.put("verdict", verdict);
                snapshot.put("confidence", confidence);
                snapshot.put("summary", safeText(summary, "No summary available yet."));
                snapshot.put("recordingUrl", safeText(recordingUrl, ""));
                snapshot.put("calledAt", latest.getCreatedAt() != null ? latest.getCreatedAt().toString() : "");
                snapshots.add(snapshot);
            } catch (Exception ignored) {
            }

            if (snapshots.size() >= 3) {
                break;
            }
        }

        return snapshots;
    }

    private String extractCallSummaryFromRecord(CommunicationRecord call) {
        String raw = call.getRawPayload();
        if (raw != null && !raw.isBlank()) {
            for (String key : List.of("summary", "note", "message")) {
                String value = extractFieldFromRawPayload(raw, List.of(key));
                if (!value.isBlank()) return value;
            }
        }
        String body = call.getBody();
        if (body != null && !body.isBlank()) {
            return body.length() > 320 ? body.substring(0, 320) + "..." : body;
        }
        return "";
    }

    private String extractFieldFromRawPayload(String rawPayload, List<String> keys) {
        if (rawPayload == null || rawPayload.isBlank()) return "";
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = new com.fasterxml.jackson.databind.ObjectMapper().readValue(rawPayload, Map.class);
            for (String key : keys) {
                Object value = parsed.get(key);
                if (value instanceof String text && !text.isBlank()) return text.trim();
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private DashboardWidgetSnapshotDTO.AgingCounts buildAgingCounts(List<Lead> leads) {
        long fresh = 0;
        long warning = 0;
        long critical = 0;
        for (Lead lead : leads) {
            switch (agingLevel(lead)) {
                case "fresh" -> fresh++;
                case "warning" -> warning++;
                case "critical" -> critical++;
                default -> { }
            }
        }
        return new DashboardWidgetSnapshotDTO.AgingCounts(fresh, warning, critical);
    }

    private DashboardWidgetSnapshotDTO.LeadSlaSummary buildSlaSummary(List<Lead> leads) {
        List<Double> responseSamples = new ArrayList<>();
        long unattendedCritical = 0;
        long pending = 0;
        long met = 0;
        long breached = 0;

        Map<String, LocalDateTime> firstResponseByLead = fetchFirstResponseByLeadId(leads);
        for (Lead lead : leads) {
            if ("critical".equals(agingLevel(lead))) {
                unattendedCritical++;
            }

            Double responseMinutes = responseMinutes(lead, firstResponseByLead.get(lead.getId()));
            if (responseMinutes == null) {
                pending++;
                continue;
            }

            responseSamples.add(responseMinutes);
            if (responseMinutes <= leadSlaMinutes(lead)) {
                met++;
            } else {
                breached++;
            }
        }

        Double average = responseSamples.isEmpty()
            ? null
            : round(responseSamples.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));

        return new DashboardWidgetSnapshotDTO.LeadSlaSummary(
            leads.size(),
            unattendedCritical,
            pending,
            met,
            breached,
            average
        );
    }

    private List<DashboardWidgetSnapshotDTO.EmployeePerformance> buildEmployeePerformance(List<Lead> leads) {
        Map<String, List<Lead>> byOwner = new LinkedHashMap<>();
        for (Lead lead : leads) {
            String owner = leadOwnerName(lead);
            byOwner.computeIfAbsent(owner, key -> new ArrayList<>()).add(lead);
        }

        Map<String, LocalDateTime> firstResponseByLead = fetchFirstResponseByLeadId(leads);
        List<DashboardWidgetSnapshotDTO.EmployeePerformance> rows = new ArrayList<>();
        for (Map.Entry<String, List<Lead>> entry : byOwner.entrySet()) {
            String owner = entry.getKey();
            List<Lead> ownerLeads = entry.getValue();
            long total = ownerLeads.size();
            long unattended = ownerLeads.stream().filter(lead -> "critical".equals(agingLevel(lead))).count();
            long met = 0;
            long breached = 0;
            long pending = 0;
            for (Lead lead : ownerLeads) {
                Double responseMinutes = responseMinutes(lead, firstResponseByLead.get(lead.getId()));
                if (responseMinutes == null) {
                    pending++;
                } else if (responseMinutes <= leadSlaMinutes(lead)) {
                    met++;
                } else {
                    breached++;
                }
            }
            rows.add(new DashboardWidgetSnapshotDTO.EmployeePerformance(owner, total, unattended, met, breached, pending));
        }

        rows.sort((left, right) -> {
            int compare = Long.compare(right.unattended(), left.unattended());
            if (compare != 0) return compare;
            compare = Long.compare(right.breached(), left.breached());
            if (compare != 0) return compare;
            return String.CASE_INSENSITIVE_ORDER.compare(left.owner(), right.owner());
        });
        return rows.stream().limit(5).toList();
    }

    private List<DashboardWidgetSnapshotDTO.RevenueBucket> buildMonthlyRevenue(List<DealDTO> deals) {
        List<DashboardWidgetSnapshotDTO.RevenueBucket> buckets = new ArrayList<>();
        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
        for (int i = DASHBOARD_MONTHS - 1; i >= 0; i--) {
            LocalDate start = currentMonthStart.minusMonths(i);
            LocalDate end = start.plusMonths(1);
            double revenue = 0.0;
            long count = 0;
            for (DealDTO deal : deals) {
                LocalDateTime dateTime = dealTimestamp(deal);
                if (dateTime == null) continue;
                LocalDate date = dateTime.toLocalDate();
                if (!date.isBefore(start) && date.isBefore(end) && "WON".equalsIgnoreCase(dealStageKey(deal))) {
                    revenue += dealRevenueValue(deal).doubleValue();
                    count++;
                }
            }
            buckets.add(new DashboardWidgetSnapshotDTO.RevenueBucket(formatMonthLabel(start), round(revenue), count));
        }
        return buckets;
    }

    private List<DashboardWidgetSnapshotDTO.FunnelStage> buildFunnelData(List<Lead> leads) {
        List<DashboardWidgetSnapshotDTO.FunnelStage> stages = new ArrayList<>();
        for (DashboardStage stage : dashboardStages()) {
            long count = leads.stream()
                .filter(lead -> stage.key().equalsIgnoreCase(dashboardStageKey(lead)))
                .count();
            stages.add(new DashboardWidgetSnapshotDTO.FunnelStage(stage.label(), count, stage.color()));
        }
        return stages;
    }

    private List<DashboardWidgetSnapshotDTO.LeadSourceShare> buildLeadSources(List<Lead> leads) {
        Map<String, Long> totals = new LinkedHashMap<>();
        for (String source : SOURCE_ORDER) {
            totals.put(source, 0L);
        }
        for (Lead lead : leads) {
            String label = sourceLabel(lead);
            totals.compute(label, (key, value) -> (value == null ? 0L : value) + 1L);
        }
        long totalLeads = Math.max(1L, leads.size());
        return totals.entrySet().stream()
            .filter(entry -> entry.getValue() != null && entry.getValue() > 0)
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(6)
            .map(entry -> new DashboardWidgetSnapshotDTO.LeadSourceShare(
                entry.getKey(),
                round((entry.getValue() * 100.0) / totalLeads),
                leadSourceColor(entry.getKey())
            ))
            .toList();
    }

    private Map<String, LocalDateTime> fetchFirstResponseByLeadId(List<Lead> leads) {
        return Map.of();
    }

    private Double responseMinutes(Lead lead, LocalDateTime firstResponseAt) {
        LocalDateTime createdAt = lead != null ? lead.getCreatedAt() : null;
        if (createdAt == null || firstResponseAt == null || firstResponseAt.isBefore(createdAt)) {
            return null;
        }
        return Duration.between(createdAt, firstResponseAt).toMinutes() * 1.0;
    }

    private long leadSlaMinutes(Lead lead) {
        return 60L;
    }

    private String agingLevel(Lead lead) {
        if (lead == null || lead.getStatus() == null) {
            return "unknown";
        }
        if (lead.getStatus() != Lead.LeadStatus.NEW) {
            return "resolved";
        }
        LocalDateTime reference = leadReferenceTimestamp(lead);
        if (reference == null) {
            return "unknown";
        }
        long minutes = Math.max(0, Duration.between(reference, LocalDateTime.now()).toMinutes());
        if (minutes <= 15) return "fresh";
        if (minutes <= 60) return "warning";
        return "critical";
    }

    private LocalDateTime leadReferenceTimestamp(Lead lead) {
        if (lead == null) return null;
        return lead.getLastContactedAt() != null
            ? lead.getLastContactedAt()
            : lead.getUpdatedAt() != null
                ? lead.getUpdatedAt()
                : lead.getCreatedAt();
    }

    private String leadOwnerName(Lead lead) {
        if (lead == null || lead.getAssignedTo() == null) {
            return "Unassigned";
        }
        String name = lead.getAssignedTo().getName();
        return name == null || name.isBlank() ? "Unassigned" : name.trim();
    }

    private String dashboardStageKey(Lead lead) {
        if (lead == null || lead.getStatus() == null) {
            return lead != null && lead.getAssignedTo() != null ? "NEW" : "NEW";
        }
        return switch (lead.getStatus()) {
            case NEW -> "NEW";
            case CONTACTED -> "CONTACTED";
            case QUALIFIED -> "QUALIFIED";
            case PROPOSAL -> "PROPOSAL";
            case NEGOTIATION -> "NEGOTIATION";
            case WON -> "WON";
            case LOST -> "LOST";
        };
    }

    private List<DashboardStage> dashboardStages() {
        return DASHBOARD_STAGES;
    }

    private String sourceLabel(Lead lead) {
        if (lead == null || lead.getSource() == null) {
            return "Manual Entry";
        }
        if (lead.getSource() == Lead.LeadSource.OTHER) {
            return inferOtherSource(lead);
        }
        return sourceLabel(lead.getSource());
    }

    private String sourceLabel(Lead.LeadSource source) {
        if (source == null) {
            return "Manual Entry";
        }
        return switch (source) {
            case FACEBOOK -> "Facebook";
            case INSTAGRAM -> "Instagram";
            case LINKEDIN -> "LinkedIn";
            case WEBSITE -> "Website";
            case WHATSAPP -> "WhatsApp";
            case GOOGLE_ADS -> "Google Ads";
            case META_ADS -> "Meta Ads";
            case REFERRAL -> "Referral";
            case EMAIL -> "Email";
            case OTHER -> "Other";
        };
    }

    private String inferOtherSource(Lead lead) {
        String utmMedium = normalize(lead.getUtmMedium());
        String utmCampaign = normalize(lead.getUtmCampaign());
        String notes = normalize(lead.getNotes());
        if (utmMedium.contains("google_sheet") || utmCampaign.contains("sheet") || notes.contains("sheet")) {
            return "Google Sheet";
        }
        return "Manual Entry";
    }

    private String leadSourceColor(String label) {
        return LEAD_SOURCE_COLORS.getOrDefault(normalize(label), "#8b5cf6");
    }

    private String formatMonthLabel(LocalDate date) {
        if (date == null) return "";
        String month = date.getMonth().name().substring(0, 1) + date.getMonth().name().substring(1).toLowerCase(Locale.ROOT);
        return month;
    }

    private LocalDateTime dealTimestamp(DealDTO deal) {
        if (deal == null) return null;
        if (deal.getActualCloseDate() != null) {
            return deal.getActualCloseDate().atStartOfDay();
        }
        if (deal.getUpdatedAt() != null) return deal.getUpdatedAt();
        return deal.getCreatedAt();
    }

    private String dealStageKey(DealDTO deal) {
        if (deal == null || deal.getStage() == null) {
            return "NEW";
        }
        return deal.getStage().name();
    }

    private BigDecimal dealRevenueValue(DealDTO deal) {
        if (deal == null || deal.getDealValue() == null) {
            return BigDecimal.ZERO;
        }
        return deal.getDealValue();
    }

    private record DashboardStage(String key, String label, String color) {}

    private LocalDateTime leadTimestamp(LeadDTO lead) {
        return lead.getLastContactedAt() != null
            ? lead.getLastContactedAt()
            : lead.getUpdatedAt() != null
                ? lead.getUpdatedAt()
                : lead.getCreatedAt();
    }

    private String formatRelativeTime(LocalDateTime timestamp) {
        if (timestamp == null) {
            return "Just now";
        }
        long diffMinutes = Math.max(0, Duration.between(timestamp, LocalDateTime.now()).toMinutes());
        if (diffMinutes < 1) return "Just now";
        if (diffMinutes < 60) return diffMinutes + " min ago";
        long hours = diffMinutes / 60;
        if (hours < 24) return hours + " hr ago";
        long days = hours / 24;
        return days + " day" + (days == 1 ? "" : "s") + " ago";
    }

    private String avatarFor(String name) {
        String text = safeText(name, "S").trim();
        return text.isBlank() ? "S" : text.substring(0, 1).toUpperCase(Locale.ROOT);
    }

    private String formatSourceLabel(String source) {
        String text = safeText(source, "Other").trim();
        if (text.isBlank()) return "Other";
        return String.valueOf(text.charAt(0)).toUpperCase(Locale.ROOT) + text.substring(1).toLowerCase(Locale.ROOT);
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    private LocalDateTime parseTimestamp(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            map.forEach((k, v) -> out.put(String.valueOf(k), v));
            return out;
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> asMapList(Object value) {
        if (value instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : list) {
                out.add(asMap(item));
            }
            return out;
        }
        return List.of();
    }

    private Number toNumber(Object value) {
        if (value instanceof Number number) {
            return number;
        }
        try {
            return value == null ? 0 : Double.parseDouble(String.valueOf(value));
        } catch (Exception ex) {
            return 0;
        }
    }
}
