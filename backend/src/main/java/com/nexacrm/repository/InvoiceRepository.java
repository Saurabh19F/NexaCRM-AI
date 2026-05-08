package com.nexacrm.repository;

import com.nexacrm.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("""
        SELECT i FROM Invoice i
        WHERE i.tenantId = :tenantId
          AND i.deleted = false
          AND (:status IS NULL OR CAST(i.status AS string) = :status)
          AND (:customerId IS NULL OR i.customer.id = :customerId)
    """)
    Page<Invoice> findInvoices(
        @Param("tenantId")   Long tenantId,
        @Param("status")     String status,
        @Param("customerId") Long customerId,
        Pageable pageable
    );

    @Query("SELECT i FROM Invoice i WHERE i.status = 'SENT' AND i.dueDate < :today AND i.deleted = false")
    List<Invoice> findOverdue(@Param("today") LocalDate today);

    boolean existsByInvoiceNumberAndTenantId(String invoiceNumber, Long tenantId);
}
