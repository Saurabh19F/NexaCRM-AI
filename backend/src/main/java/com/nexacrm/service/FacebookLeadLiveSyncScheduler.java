package com.nexacrm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@RequiredArgsConstructor
@Slf4j
public class FacebookLeadLiveSyncScheduler {

    private final LeadService leadService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${nexacrm.facebook.live-sync.enabled:true}")
    private boolean enabled;

    @Value("${nexacrm.facebook.live-sync.include-archived:true}")
    private boolean includeArchived;

    @Value("${nexacrm.facebook.live-sync.lead-page-size:100}")
    private int leadPageSize;

    @Scheduled(fixedDelayString = "${nexacrm.facebook.live-sync.fixed-delay-ms:60000}")
    public void runLiveSync() {
        if (!enabled) return;
        if (!running.compareAndSet(false, true)) {
            log.debug("Facebook live sync skipped: previous run still in progress");
            return;
        }

        try {
            Map<String, String> options = Map.of(
                "includeArchived", String.valueOf(includeArchived),
                "leadPageSize", String.valueOf(leadPageSize)
            );
            Map<String, Object> result = leadService.syncFacebookLeadAds(options);
            log.info(
                "Facebook live sync completed: formsProcessed={}, fetched={}, imported={}, merged={}, skipped={}, errors={}",
                result.get("formsProcessed"),
                result.get("fetched"),
                result.get("imported"),
                result.get("merged"),
                result.get("skipped"),
                result.get("errors")
            );
        } catch (Exception ex) {
            log.warn("Facebook live sync failed: {}", ex.getMessage());
        } finally {
            running.set(false);
        }
    }
}
