package com.nexacrm.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "workflow_run_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowRunLog extends BaseEntity {

    @Indexed
    @Field("workflow_id")
    private String workflowId;

    @Field("workflow_name")
    private String workflowName;

    @Field("trigger")
    private String trigger;

    @Field("status")
    private String status;

    @Field("message")
    private String message;

    @Indexed
    @Field("run_at")
    private LocalDateTime runAt;
}
