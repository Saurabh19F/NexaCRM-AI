package com.nexacrm.dto;

import com.nexacrm.model.User;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserDTO {
    private Long id;
    private String name;
    private String email;
    private User.Role role;
    private String phone;
    private String avatarUrl;
    private Boolean isActive;
    private Long tenantId;
}
