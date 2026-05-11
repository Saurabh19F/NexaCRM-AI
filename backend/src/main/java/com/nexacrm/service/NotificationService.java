package com.nexacrm.service;

import com.nexacrm.dto.NotificationDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Notification;
import com.nexacrm.model.User;
import com.nexacrm.repository.NotificationRepository;
import com.nexacrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<NotificationDTO> findForCurrentUser(int page, int size) {
        User user = currentUser();
        Page<Notification> result = notificationRepository
            .findByUser_IdAndDeletedFalseOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.<NotificationDTO>builder()
            .content(result.getContent().stream().map(this::toDTO).collect(Collectors.toList()))
            .page(result.getNumber()).size(result.getSize())
            .total(result.getTotalElements()).totalPages(result.getTotalPages())
            .first(result.isFirst()).last(result.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return notificationRepository.countByUser_IdAndIsReadFalseAndDeletedFalse(currentUser().getId());
    }

    public NotificationDTO markRead(String id) {
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        n.setIsRead(true);
        return toDTO(notificationRepository.save(n));
    }

    public int markAllRead() {
        var unread = notificationRepository.findByUser_IdAndIsReadFalseAndDeletedFalse(currentUser().getId());
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
        return unread.size();
    }

    public void delete(String id) {
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        n.setDeleted(true);
        notificationRepository.save(n);
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private NotificationDTO toDTO(Notification n) {
        return NotificationDTO.builder()
            .id(n.getId())
            .userId(n.getUser() != null ? n.getUser().getId() : null)
            .title(n.getTitle())
            .message(n.getMessage())
            .type(n.getType())
            .isRead(n.getIsRead())
            .actionUrl(n.getActionUrl())
            .entityType(n.getEntityType())
            .entityId(n.getEntityId())
            .createdAt(n.getCreatedAt())
            .build();
    }
}
