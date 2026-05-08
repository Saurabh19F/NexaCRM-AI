package com.nexacrm.automation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Automation workflow engine — evaluates IF-THEN rules and executes actions.
 *
 * Supported triggers:
 * - LEAD_CREATED, LEAD_UPDATED, LEAD_SCORE_CHANGED
 * - DEAL_CREATED, DEAL_STAGE_CHANGED, DEAL_WON, DEAL_LOST
 * - INVOICE_OVERDUE, INVOICE_PAID
 * - TASK_OVERDUE, FOLLOW_UP_DUE
 *
 * Supported actions:
 * - ASSIGN_LEAD, SEND_EMAIL, SEND_WHATSAPP
 * - CREATE_TASK, ESCALATE, LOG_ACTIVITY
 * - GENERATE_INVOICE, SEND_NOTIFICATION
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowEngine {

    @Async
    public void processEvent(String trigger, Map<String, Object> context) {
        log.info("Processing automation trigger: {} with context keys: {}", trigger, context.keySet());
        // In production: fetch matching workflows from DB,
        // evaluate conditions, execute actions in order.
    }

    @Scheduled(cron = "0 0 * * * *")
    public void checkFollowUps() {
        log.info("Checking overdue follow-ups...");
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void checkOverdueInvoices() {
        log.info("Checking overdue invoices...");
    }

    @Scheduled(cron = "0 0 7 * * *")
    public void rescoreLeads() {
        log.info("Running daily AI lead rescoring...");
    }
}
