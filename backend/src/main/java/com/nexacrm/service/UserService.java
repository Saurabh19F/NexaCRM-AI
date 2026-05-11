package com.nexacrm.service;

import com.nexacrm.dto.UserDTO;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.User;
import com.nexacrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
        if (userRepository.existsByEmailAndTenantId(dto.getEmail(), DEFAULT_TENANT)) {
            throw new IllegalArgumentException("User already exists with email: " + dto.getEmail());
        }
        User user = User.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .password(passwordEncoder.encode("Welcome@123"))
            .role(dto.getRole() != null ? dto.getRole() : User.Role.SALES_EXEC)
            .phone(dto.getPhone())
            .avatarUrl(dto.getAvatarUrl())
            .isActive(true)
            .build();
        user.setTenantId(DEFAULT_TENANT);
        User saved = userRepository.save(user);
        log.info("User invited: id={}, email={}", saved.getId(), saved.getEmail());
        return toDTO(saved);
    }

    public UserDTO update(String id, UserDTO dto) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        user.setName(dto.getName());
        user.setPhone(dto.getPhone());
        user.setAvatarUrl(dto.getAvatarUrl());
        if (dto.getRole() != null)     user.setRole(dto.getRole());
        if (dto.getIsActive() != null) user.setIsActive(dto.getIsActive());
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
}
