package com.nexacrm.model;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "customers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer extends BaseEntity {

    @Field("name")
    private String name;

    @Field("email")
    private String email;

    @Field("phone")
    private String phone;
    @Field("company")
    private String company;
    @Field("industry")
    private String industry;
    @Field("website")
    private String website;

    @Field("primary_contact")
    private String primaryContact;

    @DBRef(lazy = true)
    @Field("account_manager")
    private User accountManager;

    @Field("health_score")
    private Integer healthScore;

    @Field("status")
    private CustomerStatus status = CustomerStatus.ACTIVE;

    @Field("gstin")
    private String gstin;

    @Field("notes")
    private String notes;

    @Field("avatar_url")
    private String avatarUrl;

    public enum CustomerStatus { ACTIVE, INACTIVE, AT_RISK, CHURNED }
}
