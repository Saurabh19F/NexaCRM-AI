package com.nexacrm.model;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.math.BigDecimal;
import java.time.LocalDate;

@Document(collection = "deals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deal extends BaseEntity {

    @Field("title")
    private String title;

    @Field("description")
    private String description;

    @Indexed
    @Field("stage")
    private DealStage stage = DealStage.NEW;

    @Field("priority")
    private DealPriority priority = DealPriority.MEDIUM;

    @Field("deal_value")
    private BigDecimal dealValue;

    @Field("expected_close_date")
    private LocalDate expectedCloseDate;

    @Field("actual_close_date")
    private LocalDate actualCloseDate;

    @Field("win_probability")
    private Integer winProbability;

    @Indexed
    @Field("pipeline_id")
    private Long pipelineId = 1L;  // default pipeline

    @DBRef(lazy = true)
    @Field("lead")
    private Lead lead;

    @DBRef(lazy = true)
    @Field("owner")
    private User owner;

    @Field("ai_score")
    private String aiScore;

    @Field("tags")
    private String tags;

    @Field("notes")
    private String notes;

    public enum DealStage {
        NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST;
    }

    public enum DealPriority { HIGH, MEDIUM, LOW }
}
