package com.nexacrm.controller;

import com.nexacrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final DealRepository dealRepository;
    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers     = userRepository.count();
        long activeUsers    = userRepository.findAll().stream().filter(u -> Boolean.TRUE.equals(u.getIsActive())).count();
        long totalLeads     = leadRepository.count();
        long totalDeals     = dealRepository.count();
        long totalCustomers = customerRepository.count();
        long totalInvoices  = invoiceRepository.count();

        return ResponseEntity.ok(Map.of(
            "totalUsers",     totalUsers,
            "activeUsers",    activeUsers,
            "totalLeads",     totalLeads,
            "totalDeals",     totalDeals,
            "totalCustomers", totalCustomers,
            "totalInvoices",  totalInvoices
        ));
    }
}
