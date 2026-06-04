package com.nexacrm.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "tenants")
@CompoundIndexes({
    @CompoundIndex(name = "tenant_slug_idx", def = "{'slug': 1}", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant extends BaseEntity {

    @Field("name")
    private String name;

    @Field("slug")
    private String slug;

    @Field("plan")
    private String plan;

    @Field("is_active")
    private Boolean isActive = true;

    @Field("max_users")
    private Integer maxUsers = 5;

    @Field("logo_url")
    private String logoUrl;
}
