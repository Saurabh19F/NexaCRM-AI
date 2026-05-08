package com.nexacrm.repository;

import com.nexacrm.model.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long>, JpaSpecificationExecutor<Lead> {

    @Query("""
        SELECT l FROM Lead l
        WHERE l.tenantId = :tenantId
          AND l.deleted = false
          AND (:search IS NULL OR LOWER(l.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.company) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR CAST(l.status AS string) = :status)
          AND (:score IS NULL OR CAST(l.score AS string) = :score)
          AND (:source IS NULL OR CAST(l.source AS string) = :source)
    """)
    Page<Lead> searchLeads(
        @Param("tenantId") Long tenantId,
        @Param("search")  String search,
        @Param("status")  String status,
        @Param("score")   String score,
        @Param("source")  String source,
        Pageable pageable
    );

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.tenantId = :tenantId AND l.score = :score AND l.deleted = false")
    long countByScore(@Param("tenantId") Long tenantId, @Param("score") Lead.LeadScore score);

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.tenantId = :tenantId AND l.status = :status AND l.deleted = false")
    long countByStatus(@Param("tenantId") Long tenantId, @Param("status") Lead.LeadStatus status);

    Optional<Lead> findByEmailAndTenantIdAndDeletedFalse(String email, Long tenantId);

    Optional<Lead> findByFacebookLeadIdAndDeletedFalse(String facebookLeadId);

    List<Lead> findByAssignedToIdAndDeletedFalse(Long userId);

    @Query("SELECT l.source, COUNT(l) FROM Lead l WHERE l.tenantId = :tenantId AND l.deleted = false GROUP BY l.source")
    List<Object[]> countBySource(@Param("tenantId") Long tenantId);
}
