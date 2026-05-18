package com.nexacrm.service;

import com.nexacrm.dto.UserDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.User;
import com.nexacrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public List<UserDTO> findAll() {
        return userRepository.findAll().stream()
            .filter(u -> !Boolean.FALSE.equals(u.getIsActive()) || u.getIsActive() == null)
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDTO findById(String id) {
        return userRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public UserDTO invite(UserDTO dto) {
        String email = normalizeEmail(dto.getEmail());
        if (email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (userRepository.existsByEmailAndTenantId(email, DEFAULT_TENANT)) {
            throw new IllegalArgumentException("User already exists with email: " + email);
        }
        String rawPassword = dto.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        User.Role requestedRole = dto.getRole() != null ? dto.getRole() : User.Role.SALES_EXEC;
        validateRoleAssignmentAllowed(requestedRole);

        User user = User.builder()
            .name(dto.getName())
            .email(email)
            .password(passwordEncoder.encode(rawPassword.trim()))
            .role(requestedRole)
            .phone(dto.getPhone())
            .avatarUrl(dto.getAvatarUrl())
            .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
            .build();
        user.setTenantId(DEFAULT_TENANT);
        User saved = userRepository.save(user);
        log.info("User invited: id={}, email={}", saved.getId(), saved.getEmail());
        return toDTO(saved);
    }

    public UserDTO update(String id, UserDTO dto) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        User.Role actorRole = getCurrentActorRole();
        if (actorRole == User.Role.MANAGER && user.getRole() == User.Role.ADMIN) {
            throw new IllegalArgumentException("Managers cannot edit admin users");
        }

        String nextEmail = normalizeEmail(dto.getEmail());
        if (!nextEmail.isBlank() && !nextEmail.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndTenantId(nextEmail, DEFAULT_TENANT)) {
                throw new IllegalArgumentException("User already exists with email: " + nextEmail);
            }
            user.setEmail(nextEmail);
        }

        user.setName(dto.getName());
        user.setPhone(dto.getPhone());
        user.setAvatarUrl(dto.getAvatarUrl());
        if (dto.getRole() != null) {
            if (actorRole != User.Role.ADMIN && dto.getRole() != user.getRole()) {
                throw new IllegalArgumentException("Only admin can change user role");
            }
            validateRoleAssignmentAllowed(dto.getRole());
            user.setRole(dto.getRole());
        }
        if (dto.getIsActive() != null) {
            if (actorRole != User.Role.ADMIN && !dto.getIsActive().equals(user.getIsActive())) {
                throw new IllegalArgumentException("Only admin can change user status");
            }
            user.setIsActive(dto.getIsActive());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword().trim()));
        }
        return toDTO(userRepository.save(user));
    }

    public void deactivate(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        user.setIsActive(false);
        userRepository.save(user);
    }

    private UserDTO toDTO(User u) {
        return UserDTO.builder()
            .id(u.getId())
            .name(u.getName())
            .email(u.getEmail())
            .role(u.getRole())
            .phone(u.getPhone())
            .avatarUrl(u.getAvatarUrl())
            .isActive(u.getIsActive())
            .tenantId(u.getTenantId())
            .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validateRoleAssignmentAllowed(User.Role targetRole) {
        User.Role actorRole = getCurrentActorRole();
        if (actorRole == User.Role.MANAGER && targetRole == User.Role.ADMIN) {
            throw new IllegalArgumentException("Managers can invite or assign only Manager or Sales Executive roles");
        }
    }

    private User.Role getCurrentActorRole() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmailAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
        return actor.getRole() != null ? actor.getRole() : User.Role.SALES_EXEC;
    }
}
