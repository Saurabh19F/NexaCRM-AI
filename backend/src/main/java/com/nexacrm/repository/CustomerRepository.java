package com.nexacrm.repository;

import com.nexacrm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("""
        SELECT c FROM Customer c
        WHERE c.tenantId = :tenantId
          AND c.deleted = false
          AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(c.company) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR CAST(c.status AS string) = :status)
    """)
    Page<Customer> searchCustomers(
        @Param("tenantId") Long tenantId,
        @Param("search")   String search,
        @Param("status")   String status,
        Pageable pageable
    );

    Optional<Customer> findByEmailAndTenantIdAndDeletedFalse(String email, Long tenantId);
}
