package com.nexacrm.repository;

import com.nexacrm.model.Deal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface DealRepository extends JpaRepository<Deal, Long> {

    List<Deal> findByStageAndTenantIdAndDeletedFalse(Deal.DealStage stage, Long tenantId);

    @Query("""
        SELECT d FROM Deal d
        WHERE d.tenantId = :tenantId
          AND d.deleted = false
          AND (:stage IS NULL OR CAST(d.stage AS string) = :stage)
          AND (:ownerId IS NULL OR d.owner.id = :ownerId)
          AND (:pipelineId IS NULL OR d.pipelineId = :pipelineId)
    """)
    Page<Deal> findDeals(
        @Param("tenantId")   Long tenantId,
        @Param("stage")      String stage,
        @Param("ownerId")    Long ownerId,
        @Param("pipelineId") Long pipelineId,
        Pageable pageable
    );

    @Query("SELECT SUM(d.dealValue) FROM Deal d WHERE d.tenantId = :tenantId AND d.stage = 'WON' AND d.deleted = false")
    BigDecimal getTotalWonRevenue(@Param("tenantId") Long tenantId);

    @Query("SELECT d.stage, COUNT(d), SUM(d.dealValue) FROM Deal d WHERE d.tenantId = :tenantId AND d.deleted = false GROUP BY d.stage")
    List<Object[]> getPipelineSummary(@Param("tenantId") Long tenantId);

    @Query("SELECT COUNT(d) FROM Deal d WHERE d.owner.id = :userId AND d.stage = 'WON' AND d.deleted = false")
    long countWonByUser(@Param("userId") Long userId);
}
