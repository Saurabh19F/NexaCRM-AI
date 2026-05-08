package com.nexacrm.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "leads", indexes = {
    @Index(name = "idx_lead_tenant",   columnList = "tenant_id"),
    @Index(name = "idx_lead_status",   columnList = "status"),
    @Index(name = "idx_lead_score",    columnList = "score"),
    @Index(name = "idx_lead_assigned", columnList = "assigned_to"),
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lead extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String phone;
    private String company;
    private String website;
    private String designation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeadSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeadStatus status = LeadStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeadScore score = LeadScore.COLD;

    @Enumerated(EnumType.STRING)
    private LeadPriority priority = LeadPriority.MEDIUM;

    @Column(precision = 15, scale = 2)
    private BigDecimal dealValue;

    // UTM Tracking
    @Column(name = "utm_source")
    private String utmSource;

    @Column(name = "utm_medium")
    private String utmMedium;

    @Column(name = "utm_campaign")
    private String utmCampaign;

    // AI fields
    @Column(name = "ai_score_value")
    private Integer aiScoreValue;

    @Column(name = "ai_next_action", columnDefinition = "TEXT")
    private String aiNextAction;

    // Relations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(name = "tags")
    private String tags;  // comma-separated

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "last_contacted_at")
    private LocalDateTime lastContactedAt;

    // Facebook Lead Ads tracking
    @Column(name = "facebook_lead_id", unique = true)
    private String facebookLeadId;

    @Column(name = "facebook_form_id")
    private String facebookFormId;

    @Column(name = "facebook_ad_id")
    private String facebookAdId;

    // Enums
    public enum LeadSource { FACEBOOK, INSTAGRAM, LINKEDIN, WEBSITE, WHATSAPP, GOOGLE_ADS, META_ADS, REFERRAL, EMAIL, OTHER }
    public enum LeadStatus { NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST }
    public enum LeadScore  { HOT, WARM, COLD }
    public enum LeadPriority { HIGH, MEDIUM, LOW }
}
