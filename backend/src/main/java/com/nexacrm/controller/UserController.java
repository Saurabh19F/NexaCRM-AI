package com.nexacrm.controller;

import com.nexacrm.dto.UserDTO;
import com.nexacrm.model.User;
import com.nexacrm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping("/invite")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<UserDTO> invite(@RequestBody UserDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.invite(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<UserDTO> update(@PathVariable String id, @RequestBody UserDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable String id) {
        userService.deactivate(id);
        return ResponseEntity.ok(Map.of("message", "User deactivated", "id", id));
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Map<String, String>>> getRoles() {
        List<Map<String, String>> roles = Arrays.stream(User.Role.values())
            .map(r -> Map.of("value", r.name(), "label", formatRoleLabel(r)))
            .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }

    private String formatRoleLabel(User.Role role) {
        return switch (role) {
            case ADMIN -> "Admin";
            case MANAGER -> "Manager";
            case SALES_EXEC -> "Sales Executive";
        };
    }
}
