package com.nexacrm.model;

import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Collection;
import java.util.List;

@Document(collection = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User extends BaseEntity implements UserDetails {

    @Field("name")
    private String name;

    @Indexed
    @Field("email")
    private String email;

    @Field("password")
    private String password;

    @Field("role")
    private Role role;

    @Field("phone")
    private String phone;

    @Field("avatar_url")
    private String avatarUrl;

    @Field("is_active")
    private Boolean isActive = true;

    @Field("two_fa_enabled")
    private Boolean twoFaEnabled = false;

    @Field("two_fa_secret")
    private String twoFaSecret;

    // ── UserDetails implementation ───────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;  // email is the unique login identifier
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return Boolean.TRUE.equals(isActive);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(isActive);
    }

    public enum Role { ADMIN, MANAGER, SALES_EXEC }
}
