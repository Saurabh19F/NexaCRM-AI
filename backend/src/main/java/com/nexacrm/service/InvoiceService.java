package com.nexacrm.service;

import com.nexacrm.dto.InvoiceDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.exception.ResourceNotFoundException;
import com.nexacrm.model.Invoice;
import com.nexacrm.repository.CustomerRepository;
import com.nexacrm.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;

    private static final Long DEFAULT_TENANT = 1L;

    @Transactional(readOnly = true)
    public PageResponse<InvoiceDTO> findAll(String status, Long customerId, Pageable pageable) {
        Page<Invoice> page = invoiceRepository.findInvoices(DEFAULT_TENANT, status, customerId, pageable);
        return PageResponse.<InvoiceDTO>builder()
            .content(page.getContent().stream().map(this::toDTO).collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .total(page.getTotalElements()).totalPages(page.getTotalPages())
            .first(page.isFirst()).last(page.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public InvoiceDTO findById(Long id) {
        return invoiceRepository.findById(id)
            .filter(i -> !i.getDeleted())
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
    }

    public InvoiceDTO create(InvoiceDTO dto) {
        Invoice invoice = fromDTO(dto);
        invoice.setTenantId(DEFAULT_TENANT);

        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isBlank()) {
            invoice.setInvoiceNumber(generateInvoiceNumber());
        }

        calculateAmounts(invoice);
        Invoice saved = invoiceRepository.save(invoice);
        log.info("Invoice created: id={}, number={}", saved.getId(), saved.getInvoiceNumber());
        return toDTO(saved);
    }

    public InvoiceDTO update(Long id, InvoiceDTO dto) {
        Invoice invoice = invoiceRepository.findById(id)
            .filter(i -> !i.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));

        if (dto.getStatus() != null)      invoice.setStatus(dto.getStatus());
        if (dto.getIssueDate() != null)   invoice.setIssueDate(dto.getIssueDate());
        if (dto.getDueDate() != null)     invoice.setDueDate(dto.getDueDate());
        if (dto.getSubtotal() != null)    invoice.setSubtotal(dto.getSubtotal());
        if (dto.getGstRate() != null)     invoice.setGstRate(dto.getGstRate());
        invoice.setNotes(dto.getNotes());
        invoice.setTallyRef(dto.getTallyRef());

        calculateAmounts(invoice);
        return toDTO(invoiceRepository.save(invoice));
    }

    public InvoiceDTO markPaid(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
            .filter(i -> !i.getDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
        invoice.setStatus(Invoice.InvoiceStatus.PAID);
        invoice.setPaidDate(LocalDate.now());
        return toDTO(invoiceRepository.save(invoice));
    }

    public void delete(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
        invoice.setDeleted(true);
        invoiceRepository.save(invoice);
    }

    private void calculateAmounts(Invoice invoice) {
        if (invoice.getSubtotal() == null) return;
        BigDecimal rate = invoice.getGstRate() != null ? invoice.getGstRate() : BigDecimal.valueOf(18);
        BigDecimal gstAmount = invoice.getSubtotal()
            .multiply(rate)
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        invoice.setGstRate(rate);
        invoice.setGstAmount(gstAmount);
        invoice.setTotal(invoice.getSubtotal().add(gstAmount));
    }

    private String generateInvoiceNumber() {
        String prefix = "INV-" + DateTimeFormatter.ofPattern("yyyyMM").format(LocalDate.now()) + "-";
        long count = invoiceRepository.count() + 1;
        return prefix + String.format("%04d", count);
    }

    private InvoiceDTO toDTO(Invoice i) {
        return InvoiceDTO.builder()
            .id(i.getId())
            .invoiceNumber(i.getInvoiceNumber())
            .customerId(i.getCustomer() != null ? i.getCustomer().getId() : null)
            .customerName(i.getCustomer() != null ? i.getCustomer().getName() : null)
            .dealId(i.getDeal() != null ? i.getDeal().getId() : null)
            .status(i.getStatus())
            .issueDate(i.getIssueDate())
            .dueDate(i.getDueDate())
            .paidDate(i.getPaidDate())
            .subtotal(i.getSubtotal())
            .gstRate(i.getGstRate())
            .gstAmount(i.getGstAmount())
            .total(i.getTotal())
            .notes(i.getNotes())
            .tallyRef(i.getTallyRef())
            .createdAt(i.getCreatedAt())
            .updatedAt(i.getUpdatedAt())
            .build();
    }

    private Invoice fromDTO(InvoiceDTO dto) {
        Invoice.InvoiceBuilder builder = Invoice.builder()
            .invoiceNumber(dto.getInvoiceNumber())
            .status(dto.getStatus() != null ? dto.getStatus() : Invoice.InvoiceStatus.DRAFT)
            .issueDate(dto.getIssueDate())
            .dueDate(dto.getDueDate())
            .subtotal(dto.getSubtotal())
            .gstRate(dto.getGstRate())
            .notes(dto.getNotes())
            .tallyRef(dto.getTallyRef());

        if (dto.getCustomerId() != null) {
            customerRepository.findById(dto.getCustomerId()).ifPresent(builder::customer);
        }

        return builder.build();
    }
}
