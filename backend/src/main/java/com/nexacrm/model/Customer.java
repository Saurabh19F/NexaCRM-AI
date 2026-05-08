package com.nexacrm.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String phone;
    private String company;
    private String industry;
    private String website;

    @Column(name = "primary_contact")
    private String primaryContact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_manager_id")
    private User accountManager;

    @Column(name = "health_score")
    private Integer healthScore;

    @Enumerated(EnumType.STRING)
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Column(name = "gstin")
    private String gstin;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "avatar_url")
    private String avatarUrl;

    public enum CustomerStatus { ACTIVE, INACTIVE, AT_RISK, CHURNED }
}
