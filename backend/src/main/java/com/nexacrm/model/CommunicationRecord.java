package com.nexacrm.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "communications")
@Getter
@Setter
public class CommunicationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId = 1L;

    @Column(name = "lead_id")
    private Long leadId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(nullable = false)
    private String channel;

    @Column(nullable = false)
    private String direction;

    @Column
    private String subject;

    @Column(nullable = false)
    private String body;

    @Column(name = "sender_id")
    private Long senderId;

    @Column(name = "is_ai_reply")
    private Boolean isAiReply = false;

    @Column(name = "external_id")
    private String externalId;

    @Column
    private String status = "SENT";

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "contact_identifier")
    private String contactIdentifier;

    @Column(name = "provider")
    private String provider;

    @Column(name = "raw_payload")
    private String rawPayload;
}
