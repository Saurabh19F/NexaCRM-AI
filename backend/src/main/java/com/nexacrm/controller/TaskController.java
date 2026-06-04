package com.nexacrm.controller;

import com.nexacrm.dto.TaskDTO;
import com.nexacrm.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Task and follow-up management endpoints")
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "List tasks and follow-ups")
    public ResponseEntity<List<TaskDTO>> getAll(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String assignedTo,
        @RequestParam(required = false) String due,
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(taskService.findAll(status, assignedTo, due, search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "Get task by ID")
    public ResponseEntity<TaskDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(taskService.findById(id));
    }

    @GetMapping("/due-today")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "List tasks due today")
    public ResponseEntity<List<TaskDTO>> dueToday() {
        return ResponseEntity.ok(taskService.dueToday());
    }

    @GetMapping("/due-tomorrow")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "List tasks due tomorrow")
    public ResponseEntity<List<TaskDTO>> dueTomorrow() {
        return ResponseEntity.ok(taskService.dueTomorrow());
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "List overdue tasks")
    public ResponseEntity<List<TaskDTO>> overdue() {
        return ResponseEntity.ok(taskService.overdue());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "Create task")
    public ResponseEntity<TaskDTO> create(@Valid @RequestBody TaskDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "Update task")
    public ResponseEntity<TaskDTO> update(@PathVariable String id, @RequestBody TaskDTO dto) {
        return ResponseEntity.ok(taskService.update(id, dto));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "Mark task as completed")
    public ResponseEntity<TaskDTO> complete(@PathVariable String id) {
        return ResponseEntity.ok(taskService.complete(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dashboard.view')")
    @Operation(summary = "Delete task")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
