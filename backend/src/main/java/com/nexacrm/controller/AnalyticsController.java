package com.nexacrm.controller;

import com.nexacrm.dto.dashboard.DashboardOverviewDTO;
import com.nexacrm.dto.dashboard.DashboardWidgetSnapshotDTO;
import com.nexacrm.service.dashboard.DashboardAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Aggregated dashboard analytics")
public class AnalyticsController {

    private final DashboardAnalyticsService dashboardAnalyticsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Aggregated dashboard overview")
    public ResponseEntity<DashboardOverviewDTO> getDashboard() {
        return ResponseEntity.ok(dashboardAnalyticsService.overview());
    }

    @GetMapping("/dashboard/widgets")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Operational dashboard widget data")
    public ResponseEntity<DashboardWidgetSnapshotDTO> getDashboardWidgets() {
        return ResponseEntity.ok(dashboardAnalyticsService.widgets());
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Revenue trend by month")
    public ResponseEntity<Map<String, Object>> getRevenue() {
        DashboardWidgetSnapshotDTO widgets = dashboardAnalyticsService.widgets();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("series", widgets.monthlyRevenue());
        response.put("generatedAt", widgets.generatedAt());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversion")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Lead conversion summary")
    public ResponseEntity<Map<String, Object>> getConversion() {
        DashboardWidgetSnapshotDTO widgets = dashboardAnalyticsService.widgets();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("funnel", widgets.funnelData());
        response.put("agingCounts", widgets.agingCounts());
        response.put("slaSummary", widgets.slaSummary());
        response.put("generatedAt", widgets.generatedAt());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/team")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Team performance analytics")
    public ResponseEntity<Map<String, Object>> getTeam() {
        DashboardWidgetSnapshotDTO widgets = dashboardAnalyticsService.widgets();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("series", widgets.employeePerformance());
        response.put("generatedAt", widgets.generatedAt());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/campaigns")
    @PreAuthorize("hasAuthority('reports.read')")
    @Operation(summary = "Lead source and campaign performance")
    public ResponseEntity<Map<String, Object>> getCampaigns() {
        DashboardWidgetSnapshotDTO widgets = dashboardAnalyticsService.widgets();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("series", widgets.leadSources());
        response.put("generatedAt", widgets.generatedAt());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('reports.export')")
    @Operation(summary = "Export live analytics data")
    public ResponseEntity<byte[]> exportReport(
        @RequestParam(required = false, defaultValue = "csv") String format
    ) {
        DashboardOverviewDTO overview = dashboardAnalyticsService.overview();
        DashboardWidgetSnapshotDTO widgets = dashboardAnalyticsService.widgets();

        String normalized = format == null ? "csv" : format.trim().toLowerCase(Locale.ROOT);
        if ("xlsx".equals(normalized)) {
            byte[] body = exportLeadFunnelWorkbook(widgets);
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=nexacrm-lead-funnel-report.xlsx")
                .body(body);
        }

        StringBuilder csv = new StringBuilder();
        csv.append("section,metric,value\n");

        appendMetric(csv, "overview", "leads", overview.leads() != null ? overview.leads().size() : 0);
        appendMetric(csv, "overview", "deals", overview.deals() != null ? overview.deals().size() : 0);
        appendMetric(csv, "overview", "insights", overview.insights() != null ? overview.insights().size() : 0);
        appendMetric(csv, "overview", "recentActivity", overview.recentActivity() != null ? overview.recentActivity().size() : 0);
        appendMetric(csv, "overview", "recentCallSnapshots", overview.recentCallSnapshots() != null ? overview.recentCallSnapshots().size() : 0);

        appendMetric(csv, "widgets", "freshLeads", widgets.agingCounts() != null ? widgets.agingCounts().fresh() : 0);
        appendMetric(csv, "widgets", "warningLeads", widgets.agingCounts() != null ? widgets.agingCounts().warning() : 0);
        appendMetric(csv, "widgets", "criticalLeads", widgets.agingCounts() != null ? widgets.agingCounts().critical() : 0);
        appendMetric(csv, "widgets", "slaTotal", widgets.slaSummary() != null ? widgets.slaSummary().total() : 0);
        appendMetric(csv, "widgets", "slaAvgResponseMinutes", widgets.slaSummary() != null && widgets.slaSummary().avgResponseMinutes() != null ? widgets.slaSummary().avgResponseMinutes() : "");

        appendRows(csv, "lead_source", widgets.leadSources() != null ? widgets.leadSources().stream().map(source -> List.of(
            safeCsv("lead_sources"),
            safeCsv(source.name()),
            safeCsv(source.value())
        )).toList() : List.<List<String>>of());
        appendRows(csv, "funnel", widgets.funnelData() != null ? widgets.funnelData().stream().map(stage -> List.of(
            safeCsv("funnel"),
            safeCsv(stage.stage()),
            safeCsv(stage.count())
        )).toList() : List.<List<String>>of());
        appendRows(csv, "revenue", widgets.monthlyRevenue() != null ? widgets.monthlyRevenue().stream().map(bucket -> List.of(
            safeCsv("revenue"),
            safeCsv(bucket.month()),
            safeCsv(bucket.revenue())
        )).toList() : List.<List<String>>of());
        appendRows(csv, "team", widgets.employeePerformance() != null ? widgets.employeePerformance().stream().map(person -> List.of(
            safeCsv("team"),
            safeCsv(person.owner()),
            safeCsv(person.total())
        )).toList() : List.<List<String>>of());

        byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=nexacrm-analytics.csv")
            .body(body);
    }

    private byte[] exportLeadFunnelWorkbook(DashboardWidgetSnapshotDTO widgets) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            List<DashboardWidgetSnapshotDTO.FunnelStage> funnel = widgets.funnelData() != null ? widgets.funnelData() : List.of();
            long totalLeads = widgets.slaSummary() != null
                ? widgets.slaSummary().total()
                : funnel.stream().mapToLong(DashboardWidgetSnapshotDTO.FunnelStage::count).sum();

            Sheet summary = workbook.createSheet("Summary");
            writeHeader(summary, headerStyle, "Metric", "Value", "Meaning");
            long activeStages = funnel.stream().filter(stage -> stage.count() > 0).count();
            DashboardWidgetSnapshotDTO.FunnelStage bottleneck = funnel.stream()
                .filter(stage -> stage.count() > 0 && !stage.stage().toLowerCase(Locale.ROOT).contains("lost"))
                .max((left, right) -> Long.compare(left.count(), right.count()))
                .orElse(null);
            long qualifiedPipeline = funnel.stream()
                .filter(stage -> stage.stage().toLowerCase(Locale.ROOT).matches(".*(qualified|proposal|converted).*"))
                .mapToLong(DashboardWidgetSnapshotDTO.FunnelStage::count)
                .sum();
            long lateSignals = (widgets.agingCounts() != null ? widgets.agingCounts().warning() + widgets.agingCounts().critical() : 0)
                + (widgets.slaSummary() != null ? widgets.slaSummary().breached() : 0);

            writeRow(summary, 1, "Total Leads", totalLeads, "All visible leads included in the funnel snapshot");
            writeRow(summary, 2, "Active Stages", activeStages, "Stages that currently contain leads");
            writeRow(summary, 3, "Largest Queue", bottleneck != null ? bottleneck.stage() : "None", bottleneck != null ? bottleneck.count() + " lead(s)" : "No active queue");
            writeRow(summary, 4, "Qualified Pipeline", percent(qualifiedPipeline, totalLeads), "Share of leads in qualified, proposal, or converted stages");
            writeRow(summary, 5, "Attention Needed", lateSignals, "Warning, critical, and breached SLA signals");
            writeRow(summary, 6, "Generated At", widgets.generatedAt(), "Analytics snapshot timestamp");
            setWidths(summary, 24, 24, 76);

            Sheet funnelSheet = workbook.createSheet("Funnel Detail");
            writeHeader(funnelSheet, headerStyle, "Stage", "Leads", "Share", "Previous Stage", "Change", "Report Note");
            for (int i = 0; i < funnel.size(); i++) {
                DashboardWidgetSnapshotDTO.FunnelStage stage = funnel.get(i);
                Long previous = i > 0 ? funnel.get(i - 1).count() : null;
                String previousRate = previous == null || previous == 0 ? "Entry stage" : percent(stage.count(), previous);
                String change = previous == null ? "" : String.valueOf(stage.count() - previous);
                writeRow(
                    funnelSheet,
                    i + 1,
                    stage.stage(),
                    stage.count(),
                    percent(stage.count(), totalLeads),
                    previousRate,
                    change,
                    stageNarrative(stage, i, funnel)
                );
            }
            setWidths(funnelSheet, 24, 14, 14, 18, 14, 88);

            Sheet health = workbook.createSheet("Lead Health");
            writeHeader(health, headerStyle, "Signal", "Count", "Meaning");
            DashboardWidgetSnapshotDTO.AgingCounts aging = widgets.agingCounts();
            DashboardWidgetSnapshotDTO.LeadSlaSummary sla = widgets.slaSummary();
            writeRow(health, 1, "Fresh", aging != null ? aging.fresh() : 0, "Leads still inside the fresh response window");
            writeRow(health, 2, "Warning", aging != null ? aging.warning() : 0, "Leads approaching response risk");
            writeRow(health, 3, "Critical", aging != null ? aging.critical() : 0, "Leads needing urgent attention");
            writeRow(health, 4, "SLA Pending", sla != null ? sla.pending() : 0, "Leads awaiting SLA outcome");
            writeRow(health, 5, "SLA Met", sla != null ? sla.met() : 0, "Leads handled within SLA");
            writeRow(health, 6, "SLA Breached", sla != null ? sla.breached() : 0, "Leads handled outside SLA");
            writeRow(health, 7, "Average Response Minutes", sla != null && sla.avgResponseMinutes() != null ? sla.avgResponseMinutes() : "", "Average response time across measured leads");
            setWidths(health, 28, 14, 76);

            Sheet sources = workbook.createSheet("Source Mix");
            writeHeader(sources, headerStyle, "Source", "Share", "Meaning");
            List<DashboardWidgetSnapshotDTO.LeadSourceShare> leadSources = widgets.leadSources() != null ? widgets.leadSources() : List.of();
            for (int i = 0; i < leadSources.size(); i++) {
                DashboardWidgetSnapshotDTO.LeadSourceShare source = leadSources.get(i);
                writeRow(sources, i + 1, source.name(), formatPercent(source.value()), "Share of visible leads attributed to this source");
            }
            setWidths(sources, 28, 14, 76);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to export lead funnel report as XLSX", e);
        }
    }

    private void writeHeader(Sheet sheet, CellStyle headerStyle, String... headers) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            row.createCell(i).setCellValue(headers[i]);
            row.getCell(i).setCellStyle(headerStyle);
        }
    }

    private void writeRow(Sheet sheet, int rowIndex, Object... values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.length; i++) {
            Object value = values[i];
            if (value instanceof Number number) {
                row.createCell(i).setCellValue(number.doubleValue());
            } else {
                row.createCell(i).setCellValue(value == null ? "" : String.valueOf(value));
            }
        }
    }

    private void setWidths(Sheet sheet, int... widths) {
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private String stageNarrative(DashboardWidgetSnapshotDTO.FunnelStage stage, int index, List<DashboardWidgetSnapshotDTO.FunnelStage> rows) {
        if (stage.count() == 0) {
            return "No leads are currently parked here; keep monitoring imports and hand-offs into this step.";
        }
        if (index == 0) {
            return "This is the intake pool. A high count here means new leads need quick qualification and ownership.";
        }
        String stageName = stage.stage().toLowerCase(Locale.ROOT);
        if (stageName.contains("lost")) {
            return "Lost leads should be reviewed for reason patterns, source quality, and follow-up timing.";
        }
        if (stageName.contains("converted")) {
            return "Converted leads show completed movement through the funnel and should be compared with source and owner quality.";
        }
        DashboardWidgetSnapshotDTO.FunnelStage previous = rows.get(index - 1);
        if (previous.count() > 0 && stage.count() < previous.count() * 0.5) {
            return "This stage receives much less volume than the previous step, so the transition deserves close review.";
        }
        return "This stage has active volume and should be checked for aging, owner workload, and next action discipline.";
    }

    private String percent(long value, long total) {
        if (total <= 0) {
            return "0.0%";
        }
        return formatPercent((value * 100.0) / total);
    }

    private String formatPercent(double value) {
        return String.format(Locale.ROOT, "%.1f%%", value);
    }

    private void appendMetric(StringBuilder csv, String section, String metric, Object value) {
        csv.append(safeCsv(section)).append(',')
            .append(safeCsv(metric)).append(',')
            .append(safeCsv(value))
            .append('\n');
    }

    private void appendRows(StringBuilder csv, String section, List<List<String>> rows) {
        for (List<String> row : rows) {
            csv.append(String.join(",", row)).append('\n');
        }
    }

    private String safeCsv(Object value) {
        if (value == null) {
            return "\"\"";
        }
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
    }
}
