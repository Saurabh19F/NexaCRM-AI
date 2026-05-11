package com.nexacrm.service;

import com.nexacrm.dto.WorkflowDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Workflow;
import com.nexacrm.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkflowService {

    private final WorkflowRepository workflowRepository;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public List<WorkflowDTO> findAll() {
        return workflowRepository.findByTenantIdAndDeletedFalse(DEFAULT_TENANT).stream()
            .sorted(Comparator.comparing(Workflow::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public WorkflowDTO create(WorkflowDTO dto) {
        Workflow workflow = fromDTO(dto);
        workflow.setTenantId(DEFAULT_TENANT);
        if (workflow.getStatus() == null) workflow.setStatus(Workflow.WorkflowStatus.ACTIVE);
        if (workflow.getRuns() == null) workflow.setRuns(0);
        if (workflow.getLastRun() == null || workflow.getLastRun().isBlank()) workflow.setLastRun("Never");
        return toDTO(workflowRepository.save(workflow));
    }

    public WorkflowDTO update(String id, WorkflowDTO dto) {
        Workflow workflow = workflowRepository.findById(id)
            .filter(w -> !w.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));

        if (dto.getName() != null) workflow.setName(dto.getName());
        if (dto.getCategory() != null) workflow.setCategory(dto.getCategory());
        if (dto.getStatus() != null) workflow.setStatus(dto.getStatus());
        if (dto.getRuns() != null) workflow.setRuns(dto.getRuns());
        if (dto.getLastRun() != null) workflow.setLastRun(dto.getLastRun());
        workflow.setPriority(dto.getPriority());
        if (dto.getSteps() != null) {
            workflow.setSteps(dto.getSteps().stream()
                .map(s -> Workflow.WorkflowStep.builder().type(s.getType()).text(s.getText()).build())
                .collect(Collectors.toList()));
        }
        return toDTO(workflowRepository.save(workflow));
    }

    public void delete(String id) {
        Workflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        workflow.setDeleted(true);
        workflowRepository.save(workflow);
    }

    public WorkflowDTO toggle(String id) {
        Workflow workflow = workflowRepository.findById(id)
            .filter(w -> !w.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        workflow.setStatus(
            workflow.getStatus() == Workflow.WorkflowStatus.ACTIVE
                ? Workflow.WorkflowStatus.PAUSED
                : Workflow.WorkflowStatus.ACTIVE
        );
        return toDTO(workflowRepository.save(workflow));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> logs(String id) {
        Workflow workflow = workflowRepository.findById(id)
            .filter(w -> !w.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));

        return List.of(
            Map.of("workflowId", workflow.getId(), "status", "OK", "message", "Workflow fetched", "time", "just now")
        );
    }

    private WorkflowDTO toDTO(Workflow workflow) {
        return WorkflowDTO.builder()
            .id(workflow.getId())
            .name(workflow.getName())
            .category(workflow.getCategory())
            .status(workflow.getStatus())
            .runs(workflow.getRuns())
            .lastRun(workflow.getLastRun())
            .priority(workflow.getPriority())
            .steps(workflow.getSteps() == null ? List.of() : workflow.getSteps().stream()
                .map(s -> WorkflowDTO.WorkflowStepDTO.builder().type(s.getType()).text(s.getText()).build())
                .collect(Collectors.toList()))
            .createdAt(workflow.getCreatedAt())
            .updatedAt(workflow.getUpdatedAt())
            .build();
    }

    private Workflow fromDTO(WorkflowDTO dto) {
        return Workflow.builder()
            .name(dto.getName())
            .category(dto.getCategory())
            .status(dto.getStatus())
            .runs(dto.getRuns())
            .lastRun(dto.getLastRun())
            .priority(dto.getPriority())
            .steps(dto.getSteps() == null ? List.of() : dto.getSteps().stream()
                .map(s -> Workflow.WorkflowStep.builder().type(s.getType()).text(s.getText()).build())
                .collect(Collectors.toList()))
            .build();
    }
}
