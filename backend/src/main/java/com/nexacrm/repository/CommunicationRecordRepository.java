package com.nexacrm.repository;

import com.nexacrm.model.CommunicationRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CommunicationRecordRepository extends MongoRepository<CommunicationRecord, String> {

    List<CommunicationRecord> findTop500ByChannelIgnoreCaseAndContactIdentifierOrderByCreatedAtAsc(
        String channel,
        String contactIdentifier
    );

    List<CommunicationRecord> findByChannelIgnoreCaseOrderByCreatedAtDesc(String channel, Pageable pageable);
}
