package com.nexacrm.repository;

import com.nexacrm.model.CommunicationRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunicationRecordRepository extends JpaRepository<CommunicationRecord, Long> {

    List<CommunicationRecord> findTop500ByChannelIgnoreCaseAndContactIdentifierOrderByCreatedAtAsc(
        String channel,
        String contactIdentifier
    );

    @Query("select c from CommunicationRecord c where lower(c.channel) = lower(:channel) order by c.createdAt desc")
    List<CommunicationRecord> findRecentByChannel(@Param("channel") String channel, Pageable pageable);
}
