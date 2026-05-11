package com.nexacrm.repository;

import com.nexacrm.model.Customer;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CustomerRepository extends MongoRepository<Customer, String> {

    Optional<Customer> findByEmailAndTenantIdAndDeletedFalse(String email, Long tenantId);

    long countByTenantIdAndDeletedFalse(Long tenantId);
}
