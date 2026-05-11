package com.nexacrm.controller;

import com.nexacrm.dto.InvoiceDTO;
import com.nexacrm.dto.PageResponse;
import com.nexacrm.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Invoice management endpoints")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @Operation(summary = "Get all invoices with pagination and filters")
    public ResponseEntity<PageResponse<InvoiceDTO>> getInvoices(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customerId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(invoiceService.findAll(status, customerId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice by ID")
    public ResponseEntity<InvoiceDTO> getInvoiceById(@PathVariable String id) {
        return ResponseEntity.ok(invoiceService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new invoice")
    public ResponseEntity<InvoiceDTO> createInvoice(@Valid @RequestBody InvoiceDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update invoice")
    public ResponseEntity<InvoiceDTO> updateInvoice(@PathVariable String id, @RequestBody InvoiceDTO dto) {
        return ResponseEntity.ok(invoiceService.update(id, dto));
    }

    @PatchMapping("/{id}/mark-paid")
    @Operation(summary = "Mark invoice as paid")
    public ResponseEntity<InvoiceDTO> markPaid(@PathVariable String id) {
        return ResponseEntity.ok(invoiceService.markPaid(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete invoice")
    public ResponseEntity<Void> deleteInvoice(@PathVariable String id) {
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    @Operation(summary = "Download invoice as PDF (placeholder)")
    public ResponseEntity<Map<String, String>> downloadPdf(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("message", "PDF generation not yet implemented", "invoiceId", String.valueOf(id)));
    }

    @PostMapping("/{id}/reminder")
    @Operation(summary = "Send payment reminder (placeholder)")
    public ResponseEntity<Map<String, String>> sendReminder(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("message", "Reminder sent", "invoiceId", String.valueOf(id)));
    }
}
