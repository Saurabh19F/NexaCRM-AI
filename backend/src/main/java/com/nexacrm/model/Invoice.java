package com.nexacrm.model;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Document(collection = "invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice extends BaseEntity {

    @Indexed(unique = true)
    @Field("invoice_number")
    private String invoiceNumber;

    @DBRef(lazy = true)
    @Field("customer")
    private Customer customer;

    @DBRef(lazy = true)
    @Field("deal")
    private Deal deal;

    @Field("status")
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Field("issue_date")
    private LocalDate issueDate;

    @Field("due_date")
    private LocalDate dueDate;

    @Field("paid_date")
    private LocalDate paidDate;

    // Amounts
    @Field("subtotal")
    private BigDecimal subtotal;

    @Field("gst_rate")
    private BigDecimal gstRate = BigDecimal.valueOf(18);

    @Field("gst_amount")
    private BigDecimal gstAmount;

    @Field("total")
    private BigDecimal total;

    @Field("notes")
    private String notes;

    @Field("tally_ref")
    private String tallyRef;

    public enum InvoiceStatus { DRAFT, SENT, PENDING, PAID, OVERDUE, CANCELLED }
}
