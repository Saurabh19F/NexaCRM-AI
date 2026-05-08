package com.nexacrm.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "deals", indexes = {
    @Index(name = "idx_deal_stage",    columnList = "stage"),
    @Index(name = "idx_deal_pipeline", columnList = "pipeline_id"),
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deal extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DealStage stage = DealStage.NEW;

    @Enumerated(EnumType.STRING)
    private DealPriority priority = DealPriority.MEDIUM;

    @Column(name = "deal_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal dealValue;

    @Column(name = "expected_close_date")
    private LocalDate expectedCloseDate;

    @Column(name = "actual_close_date")
    private LocalDate actualCloseDate;

    @Column(name = "win_probability")
    private Integer winProbability;

    @Column(name = "pipeline_id")
    private Long pipelineId = 1L;  // default pipeline

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "ai_score")
    private String aiScore;

    @Column(name = "tags")
    private String tags;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public enum DealStage {
        NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST;
    }

    public enum DealPriority { HIGH, MEDIUM, LOW }
}
