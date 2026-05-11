package com.nexacrm.dto;

import com.nexacrm.model.Workflow;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkflowDTO {
    private String id;
    private String name;
    private String category;
    private Workflow.WorkflowStatus status;
    private Integer runs;
    private String lastRun;
    private String priority;
    private List<WorkflowStepDTO> steps;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WorkflowStepDTO {
        private String type;
        private String text;
    }
}
