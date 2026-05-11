package com.nexacrm.repository;

import com.nexacrm.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailAndDeletedFalse(String email);
    Optional<User> findByEmail(String email);
    boolean existsByEmailAndTenantId(String email, Long tenantId);
}
