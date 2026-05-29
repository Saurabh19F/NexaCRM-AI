package com.nexacrm.repository;

import com.nexacrm.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailAndDeletedFalse(String email);
    Optional<User> findByEmailAndTenantIdAndDeletedFalse(String email, Long tenantId);
    Optional<User> findByEmail(String email);
    Optional<User> findByIdAndTenantIdAndDeletedFalse(String id, Long tenantId);
    List<User> findByTenantIdAndDeletedFalse(Long tenantId);
    boolean existsByEmailAndTenantId(String email, Long tenantId);
}
