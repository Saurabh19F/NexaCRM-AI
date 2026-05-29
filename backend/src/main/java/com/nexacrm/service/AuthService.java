package com.nexacrm.service;

import com.nexacrm.dto.AuthRequest;
import com.nexacrm.dto.AuthResponse;
import com.nexacrm.dto.UserDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.User;
import com.nexacrm.repository.UserRepository;
import com.nexacrm.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final Long DEFAULT_TENANT = 1L;

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmailAndTenantIdAndDeletedFalse(request.getEmail(), DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String accessToken  = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("User logged in: {}", user.getEmail());

        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(86400000L)
            .user(toUserDTO(user))
            .build();
    }

    public void logout(String authHeader) {
        // In production: blacklist the token or delete refresh token from DB
        log.info("User logged out");
    }

    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("Refresh token is required");
        }
        String username = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByEmailAndTenantIdAndDeletedFalse(username, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new IllegalStateException("Invalid refresh token");
        }

        String newAccessToken = jwtService.generateToken(user);
        return AuthResponse.builder()
            .accessToken(newAccessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(86400000L)
            .user(toUserDTO(user))
            .build();
    }

    public Map<String, Object> getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmailAndTenantIdAndDeletedFalse(email, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return Map.of(
            "id",       user.getId(),
            "name",     user.getName(),
            "email",    user.getEmail(),
            "role",     user.getRole(),
            "tenantId", user.getTenantId(),
            "isActive", user.getIsActive()
        );
    }

    public UserDTO updateCurrentUser(UserDTO dto) {
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmailAndTenantIdAndDeletedFalse(currentEmail, DEFAULT_TENANT)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String nextEmail = normalizeEmail(dto.getEmail());
        if (!nextEmail.isBlank() && !nextEmail.equalsIgnoreCase(user.getEmail())) {
            User conflict = userRepository.findByEmail(nextEmail).orElse(null);
            if (conflict != null && !conflict.getId().equals(user.getId())) {
                throw new IllegalArgumentException("User already exists with email: " + nextEmail);
            }
            user.setEmail(nextEmail);
        }

        if (dto.getName() != null) {
            String name = dto.getName().trim();
            if (name.isBlank()) {
                throw new IllegalArgumentException("Name is required");
            }
            user.setName(name);
        }

        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone().trim());
        }

        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl().trim());
        }

        User saved = userRepository.save(user);
        log.info("User profile updated: id={}, email={}", saved.getId(), saved.getEmail());
        return toUserDTO(saved);
    }

    private UserDTO toUserDTO(User user) {
        return UserDTO.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole())
            .phone(user.getPhone())
            .avatarUrl(user.getAvatarUrl())
            .isActive(user.getIsActive())
            .tenantId(user.getTenantId())
            .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
