package com.nexacrm.config;

import com.nexacrm.model.User;
import com.nexacrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DemoUserSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${nexacrm.bootstrap-demo-users.enabled:false}")
    private boolean enabled;

    @Value("${nexacrm.bootstrap-demo-users.password:demo1234}")
    private String demoPassword;

    @Value("${nexacrm.bootstrap-demo-users.reset-passwords:true}")
    private boolean resetPasswords;

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }

        String encodedPassword = passwordEncoder.encode(demoPassword);

        upsertUser("Saurabh Kumar", "saurabhke4@gmail.com", User.Role.ADMIN, "+91-98765-00001", true, encodedPassword);
        upsertUser("Priya Sharma", "priya@nexacrm.com", User.Role.MANAGER, "+91-98765-00002", true, encodedPassword);
        upsertUser("Rahul Mehta", "rahul@nexacrm.com", User.Role.SALES_EXEC, "+91-98765-00003", true, encodedPassword);
        upsertUser("Amit Kumar", "amit@nexacrm.com", User.Role.SALES_EXEC, "+91-98765-00004", true, encodedPassword);
        upsertUser("Neha Singh", "neha@nexacrm.com", User.Role.SALES_EXEC, "+91-98765-00005", false, encodedPassword);

        log.warn("Demo users bootstrapped with default password. Change passwords after first login.");
    }

    private void upsertUser(String name, String email, User.Role role, String phone, boolean active, String encodedPassword) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        Optional<User> existing = userRepository.findByEmail(normalizedEmail);

        User user = existing.orElseGet(() -> User.builder()
            .email(normalizedEmail)
            .build());

        user.setName(name);
        user.setRole(role);
        user.setPhone(phone);
        user.setIsActive(active);
        user.setTenantId(1L);
        user.setDeleted(false);

        if (resetPasswords || existing.isEmpty()) {
            user.setPassword(encodedPassword);
        }

        userRepository.save(user);

        if (existing.isPresent()) {
            log.info("Demo user updated: {}", normalizedEmail);
        } else {
            log.info("Demo user created: {}", normalizedEmail);
        }
    }
}
