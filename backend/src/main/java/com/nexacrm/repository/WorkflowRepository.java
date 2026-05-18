package com.nexacrm.repository;

import com.nexacrm.model.Workflow;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;







public interface WorkflowRepository extends MongoRepository<Workflow, String> {
    List<Workflow> findByTenantIdAndDeletedFalse(Long tenantId);
}
