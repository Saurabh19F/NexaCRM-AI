package com.nexacrm.model;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "leads")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lead extends BaseEntity {

    @Field("name")
    private String name;

    @Indexed
    @Field("email")
    private String email;

    @Field("phone")
    private String phone;
    @Field("company")
    private String company;
    @Field("website")
    private String website;
    @Field("designation")
    private String designation;
    @Field("service")
    private String service;
    @Field("specialization")
    private String specialization;

    @Indexed
    @Field("source")
    private LeadSource source;

    @Indexed
    @Field("status")
    private LeadStatus status = LeadStatus.NEW;

    @Indexed
    @Field("score")
    private LeadScore score = LeadScore.COLD;

    @Field("priority")
    private LeadPriority priority = LeadPriority.MEDIUM;

    @Field("deal_value")
    private BigDecimal dealValue;

    // UTM Tracking
    @Field("utm_source")
    private String utmSource;

    @Field("utm_medium")
    private String utmMedium;

    @Field("utm_campaign")
    private String utmCampaign;

    // AI fields
    @Field("ai_score_value")
    private Integer aiScoreValue;

    @Field("ai_next_action")
    private String aiNextAction;

    // Relations
    @DBRef(lazy = true)
    @Field("assigned_to")
    private User assignedTo;

    @Field("tags")
    private String tags;  // comma-separated

    @Field("notes")
    private String notes;

    @Field("last_contacted_at")
    private LocalDateTime lastContactedAt;

    // Facebook Lead Ads tracking
    @Indexed(unique = true, sparse = true)
    @Field("facebook_lead_id")
    private String facebookLeadId;

    @Field("facebook_form_id")
    private String facebookFormId;

    @Field("facebook_ad_id")
    private String facebookAdId;

    // Enums
    public enum LeadSource { FACEBOOK, INSTAGRAM, LINKEDIN, WEBSITE, WHATSAPP, GOOGLE_ADS, META_ADS, REFERRAL, EMAIL, OTHER }
    public enum LeadStatus { NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST }
    public enum LeadScore  { HOT, WARM, COLD }
    public enum LeadPriority { HIGH, MEDIUM, LOW }
}
