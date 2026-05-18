package com.nexacrm.controller;

import com.nexacrm.dto.AuthRequest;
import com.nexacrm.dto.AuthResponse;
import com.nexacrm.dto.UserDTO;
import com.nexacrm.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "JWT auth endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Login with email & password, returns JWT tokens")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate refresh token")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        authService.logout(authHeader);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    @Operation(summary = "Get new access token using refresh token")
    public ResponseEntity<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.refresh(body.get("refreshToken")));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current authenticated user")
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @PutMapping("/me")
    @PreAuthorize("hasAuthority('profile.update')")
    @Operation(summary = "Update current authenticated user's profile")
    public ResponseEntity<UserDTO> updateMe(@RequestBody UserDTO dto) {
        return ResponseEntity.ok(authService.updateCurrentUser(dto));
    }
}
