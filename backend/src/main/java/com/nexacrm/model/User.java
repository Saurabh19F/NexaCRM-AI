package com.nexacrm.model;

import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Document(collection = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User extends BaseEntity implements UserDetails {
    private static final List<String> ALL_PERMISSIONS = List.of(
        "dashboard.view",
        "leads.read", "leads.create", "leads.update", "leads.delete", "leads.import", "leads.export",
        "deals.read", "deals.create", "deals.update", "deals.move_stage", "deals.delete",
        "customers.read", "customers.create", "customers.update", "customers.delete",
        "communications.read", "communications.send",
        "ai.use",
        "workflows.view", "workflows.manage",
        "invoices.read", "invoices.create", "invoices.update", "invoices.delete", "invoices.mark_paid", "invoices.reminder",
        "analytics.view", "analytics.export",
        "team.view", "team.invite", "team.update", "team.deactivate",
        "settings.view", "settings.update",
        "integrations.view", "integrations.manage",
        "profile.update",
        "notifications.read"
    );

    private static final Map<Role, List<String>> ROLE_PERMISSIONS = new EnumMap<>(Role.class);

    static {
        ROLE_PERMISSIONS.put(Role.ADMIN, ALL_PERMISSIONS);
        ROLE_PERMISSIONS.put(Role.MANAGER, List.of(
            "dashboard.view",
            "leads.read", "leads.create", "leads.update", "leads.import", "leads.export",
            "deals.read", "deals.create", "deals.update", "deals.move_stage",
            "customers.read", "customers.create", "customers.update",
            "communications.read", "communications.send",
            "ai.use",
            "workflows.view", "workflows.manage",
            "invoices.read", "invoices.create", "invoices.update", "invoices.mark_paid", "invoices.reminder",
            "analytics.view", "analytics.export",
            "team.view", "team.invite", "team.update",
            "settings.view",
            "integrations.view", "integrations.manage",
            "profile.update",
            "notifications.read"
        ));
        ROLE_PERMISSIONS.put(Role.SALES_EXEC, List.of(
            "dashboard.view",
            "leads.read", "leads.create", "leads.update",
            "deals.read", "deals.create", "deals.update", "deals.move_stage",
            "customers.read",
            "communications.read", "communications.send",
            "ai.use",
            "invoices.read",
            "profile.update",
            "notifications.read"
        ));
    }

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
        Role effectiveRole = role != null ? role : Role.SALES_EXEC;
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + effectiveRole.name()));
        getPermissionsForRole(effectiveRole).forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
        return authorities;
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

    public static List<String> getPermissionsForRole(Role role) {
        Role effectiveRole = role != null ? role : Role.SALES_EXEC;
        return ROLE_PERMISSIONS.getOrDefault(effectiveRole, ROLE_PERMISSIONS.get(Role.SALES_EXEC));
    }

    public enum Role { ADMIN, MANAGER, SALES_EXEC }
}
