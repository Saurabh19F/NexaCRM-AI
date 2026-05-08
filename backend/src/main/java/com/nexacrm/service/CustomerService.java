package com.nexacrm.service;

import com.nexacrm.dto.CustomerDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Customer;
import com.nexacrm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerService {

    private final CustomerRepository customerRepository;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public PageResponse<CustomerDTO> findAll(String search, String status, Pageable pageable) {
        Page<Customer> page = customerRepository.searchCustomers(DEFAULT_TENANT, search, status, pageable);
        return PageResponse.<CustomerDTO>builder()
            .content(page.getContent().stream().map(this::toDTO).collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .total(page.getTotalElements()).totalPages(page.getTotalPages())
            .first(page.isFirst()).last(page.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public CustomerDTO findById(Long id) {
        return customerRepository.findById(id)
            .filter(c -> !c.getDeleted())
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
    }

    public CustomerDTO create(CustomerDTO dto) {
        Customer customer = fromDTO(dto);
        customer.setTenantId(DEFAULT_TENANT);
        Customer saved = customerRepository.save(customer);
        log.info("Customer created: id={}, name={}", saved.getId(), saved.getName());
        return toDTO(saved);
    }

    public CustomerDTO update(Long id, CustomerDTO dto) {
        Customer customer = customerRepository.findById(id)
            .filter(c -> !c.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));

        customer.setName(dto.getName());
        customer.setEmail(dto.getEmail());
        customer.setPhone(dto.getPhone());
        customer.setCompany(dto.getCompany());
        customer.setIndustry(dto.getIndustry());
        customer.setWebsite(dto.getWebsite());
        customer.setPrimaryContact(dto.getPrimaryContact());
        if (dto.getHealthScore() != null) customer.setHealthScore(dto.getHealthScore());
        if (dto.getStatus() != null)      customer.setStatus(dto.getStatus());
        customer.setGstin(dto.getGstin());
        customer.setNotes(dto.getNotes());
        customer.setAvatarUrl(dto.getAvatarUrl());

        return toDTO(customerRepository.save(customer));
    }

    public void delete(Long id) {
        Customer customer = customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
        customer.setDeleted(true);
        customerRepository.save(customer);
    }

    private CustomerDTO toDTO(Customer c) {
        return CustomerDTO.builder()
            .id(c.getId())
            .name(c.getName())
            .email(c.getEmail())
            .phone(c.getPhone())
            .company(c.getCompany())
            .industry(c.getIndustry())
            .website(c.getWebsite())
            .primaryContact(c.getPrimaryContact())
            .accountManagerId(c.getAccountManager() != null ? c.getAccountManager().getId() : null)
            .accountManagerName(c.getAccountManager() != null ? c.getAccountManager().getName() : null)
            .healthScore(c.getHealthScore())
            .status(c.getStatus())
            .gstin(c.getGstin())
            .notes(c.getNotes())
            .avatarUrl(c.getAvatarUrl())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .build();
    }

    private Customer fromDTO(CustomerDTO dto) {
        return Customer.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .company(dto.getCompany())
            .industry(dto.getIndustry())
            .website(dto.getWebsite())
            .primaryContact(dto.getPrimaryContact())
            .healthScore(dto.getHealthScore() != null ? dto.getHealthScore() : 100)
            .status(dto.getStatus() != null ? dto.getStatus() : Customer.CustomerStatus.ACTIVE)
            .gstin(dto.getGstin())
            .notes(dto.getNotes())
            .avatarUrl(dto.getAvatarUrl())
            .build();
    }
}
