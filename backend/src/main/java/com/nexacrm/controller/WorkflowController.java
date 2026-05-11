package com.nexacrm.controller;

import com.nexacrm.dto.WorkflowDTO;
import com.nexacrm.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
@Tag(name = "Workflows", description = "Automation workflow endpoints")
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    @Operation(summary = "Get all workflows")
    public ResponseEntity<List<WorkflowDTO>> getAll() {
        return ResponseEntity.ok(workflowService.findAll());
    }

    @PostMapping
    @Operation(summary = "Create workflow")
    public ResponseEntity<WorkflowDTO> create(@RequestBody WorkflowDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workflowService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update workflow")
    public ResponseEntity<WorkflowDTO> update(@PathVariable String id, @RequestBody WorkflowDTO dto) {
        return ResponseEntity.ok(workflowService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete workflow")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        workflowService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle workflow active/paused status")
    public ResponseEntity<WorkflowDTO> toggle(@PathVariable String id) {
        return ResponseEntity.ok(workflowService.toggle(id));
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Get workflow logs")
    public ResponseEntity<List<Map<String, Object>>> logs(@PathVariable String id) {
        return ResponseEntity.ok(workflowService.logs(id));
    }
}
