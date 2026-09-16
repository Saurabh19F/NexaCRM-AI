package com.nexacrm.service;

import com.nexacrm.dto.LeadActivityDTO;
import com.nexacrm.model.Lead;
import com.nexacrm.model.User;
import com.nexacrm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Server-side equivalent of the PipelineView jsPDF export. The WhatsApp
 * scheduler cannot use a PDF downloaded into a user's browser, so it needs
 * to build the same report from the tenant's current leads and activities.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PipelinePlaybookPdfService {

    private static final PDRectangle LANDSCAPE_A4 = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
    private static final float PAGE_WIDTH = LANDSCAPE_A4.getWidth();
    private static final float PAGE_HEIGHT = LANDSCAPE_A4.getHeight();
    private static final float LEFT = 40f;
    private static final float RIGHT = 40f;
    private static final float CONTENT_BOTTOM = PAGE_HEIGHT - 30f;
    private static final float TABLE_HEADER_HEIGHT = 24f;
    private static final float TABLE_ROW_HEIGHT = 20f;
    private static final DateTimeFormatter EXPORT_DATE_FORMAT =
        DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a", Locale.ENGLISH);

    private static final Color NAVY = new Color(15, 23, 42);
    private static final Color SLATE = new Color(71, 85, 105);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color GRID = new Color(190, 198, 207);
    private static final Color ROW = new Color(248, 250, 252);
    private static final Color PALE = new Color(241, 245, 249);
    private static final Color CYAN = new Color(14, 165, 233);
    private static final Color GREEN = new Color(34, 197, 94);
    private static final Color EMPTY_HEADER = new Color(148, 163, 184);

    private static final List<Stage> STAGES = List.of(
        new Stage("new", "Lead", "New"),
        new Stage("welcome_not_connected", "Welcome Call", "Not Connected"),
        new Stage("welcome_connected", "Welcome Call", "Connected"),
        new Stage("welcome_connected_not_interested", "Welcome Call", "Not Interested"),
        new Stage("welcome_connected_interested", "Welcome Call", "Interested"),
        new Stage("followup_follow_up", "Follow Up", "Follow Up"),
        new Stage("followup_meeting", "Follow Up", "Meeting"),
        new Stage("outcome_won", "Outcome", "Won"),
        new Stage("outcome_negotiation", "Outcome", "Negotiation"),
        new Stage("outcome_lost", "Outcome", "Lost")
    );

    private final LeadRepository leadRepository;
    private final LeadActivityService leadActivityService;

    @Transactional(readOnly = true)
    public byte[] generate() {
        List<Lead> leads = leadRepository.findByTenantIdAndDeletedFalse(currentTenantId());
        Map<String, List<LeadActivityDTO>> activities = loadActivities(leads);
        Map<String, List<Lead>> stageBuckets = new LinkedHashMap<>();
        STAGES.forEach(stage -> stageBuckets.put(stage.key(), new ArrayList<>()));

        for (Lead lead : leads) {
            Stage stage = STAGES.stream()
                .filter(candidate -> candidate.key().equals(stageFor(lead, activities.get(lead.getId()))))
                .findFirst()
                .orElse(STAGES.get(0));
            stageBuckets.get(stage.key()).add(lead);
        }

        try {
            return render(leads, stageBuckets);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate pipeline playbook PDF", ex);
        }
    }

    private Long currentTenantId() {
        return com.nexacrm.security.TenantContext.currentTenantId();
    }

    private Map<String, List<LeadActivityDTO>> loadActivities(List<Lead> leads) {
        Map<String, List<LeadActivityDTO>> result = new HashMap<>();
        List<String> ids = leads.stream()
            .map(Lead::getId)
            .filter(id -> id != null && !id.isBlank())
            .toList();
        for (int start = 0; start < ids.size(); start += 500) {
            int end = Math.min(start + 500, ids.size());
            result.putAll(leadActivityService.listVisibleLeadIds(ids.subList(start, end)));
        }
        return result;
    }

    private String stageFor(Lead lead, List<LeadActivityDTO> rows) {
        List<LeadActivityDTO> sorted = rows == null ? List.of() : rows.stream()
            .sorted(Comparator.comparing(this::activityTime, Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
            .toList();
        String latestStage = null;
        for (LeadActivityDTO row : sorted) {
            if (latestStage == null) latestStage = stageFromActivity(row);
        }
        if (latestStage != null && !"new".equals(latestStage)) return latestStage;
        if (lead.getStatus() == Lead.LeadStatus.WON) return "outcome_won";
        if (lead.getStatus() == Lead.LeadStatus.LOST) return "outcome_lost";
        if (lead.getStatus() == Lead.LeadStatus.NEGOTIATION) return "outcome_negotiation";
        return "new";
    }

    private LocalDateTime activityTime(LeadActivityDTO row) {
        return row.getSavedAt() != null ? row.getSavedAt() : row.getCreatedAt();
    }

    private String stageFromActivity(LeadActivityDTO row) {
        int index = row.getActivityIndex() == null ? -1 : row.getActivityIndex();
        Map<String, Object> values = row.getValues() == null ? Map.of() : row.getValues();
        String status = normalize(firstText(values, "status", "outcome", "remarkStatus", "connectionStatus", "callOutcome"));
        String interest = normalize(firstText(values, "interestStatus", "interest"));

        if (index == 2) {
            if (contains(status, "won", "win")) return "outcome_won";
            if (contains(status, "lost")) return "outcome_lost";
            return "outcome_negotiation";
        }
        if (index == 1) {
            if (contains(status, "allowed person", "meeting")) return "followup_meeting";
            return "followup_follow_up";
        }
        if (index == 0) {
            if (contains(status, "not connected", "non connected", "no answer", "callback")) return "welcome_not_connected";
            if (status.contains("connect")) {
                if (interest.contains("not interested")) return "welcome_connected_not_interested";
                if (interest.contains("interested")) return "welcome_connected_interested";
                return "welcome_connected";
            }
            return "welcome_not_connected";
        }
        return "new";
    }

    private String firstText(Map<String, Object> values, String... keys) {
        for (String key : keys) {
            Object value = values.get(key);
            if (value != null && !String.valueOf(value).isBlank()) return String.valueOf(value);
        }
        return "";
    }

    private String normalize(String value) {
        return String.valueOf(value == null ? "" : value)
            .trim().toLowerCase(Locale.ROOT).replace('-', ' ').replace('_', ' ').replaceAll("\\s+", " ");
    }

    private boolean contains(String value, String... fragments) {
        for (String fragment : fragments) if (value.contains(fragment)) return true;
        return false;
    }

    private byte[] render(List<Lead> leads, Map<String, List<Lead>> stageBuckets) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Fonts fonts = new Fonts(document);
            Renderer renderer = new Renderer(document, fonts);
            renderer.startPage();
            drawHeader(renderer, leads.size());
            renderer.top = 136f;

            List<List<String>> highlights = List.of(
                List.of("Total leads", String.format(Locale.ENGLISH, "%,d leads across the full pipeline.", leads.size())),
                List.of("Active stages", String.format(Locale.ENGLISH, "%d of %d stages currently have leads.", activeStageCount(stageBuckets), STAGES.size())),
                List.of("Busiest stage", busiestStageText(stageBuckets)),
                List.of("Fresh intake", String.format(Locale.ENGLISH, "%,d lead(s) are still in New and need first action.", stageBuckets.get("new").size()))
            );
            renderer.top = drawTable(renderer, renderer.top, List.of("Highlight", "What it means"), highlights,
                new float[] {120f, 610f}, CYAN, 8.5f, TABLE_ROW_HEIGHT + 4f);
            renderer.top += 22f;

            List<List<String>> stageSummary = new ArrayList<>();
            for (Stage stage : STAGES) {
                int count = stageBuckets.get(stage.key()).size();
                stageSummary.add(List.of(stage.group() + " - " + stage.label(), String.valueOf(count), stageNote(stage, count)));
            }
            renderer.top = drawTable(renderer, renderer.top, List.of("Pipeline Stage", "Leads", "Focus Note"), stageSummary,
                new float[] {200f, 62f, 500f}, NAVY, 8f, TABLE_ROW_HEIGHT);

            for (Stage stage : STAGES) {
                List<Lead> rows = stageBuckets.get(stage.key());
                float needed = 34f + TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT;
                if (renderer.top + needed > CONTENT_BOTTOM) renderer.newPage();
                float sectionTop = renderer.top;
                drawText(renderer.stream, renderer.fonts.bold(), stage.group() + " - " + stage.label(), LEFT,
                    sectionTop + 13f, 12f, NAVY, 300f);
                drawText(renderer.stream, renderer.fonts.normal(), String.format(Locale.ENGLISH, "%,d lead(s). %s", rows.size(), stageNote(stage, rows.size())), LEFT,
                    sectionTop + 27f, 8f, SLATE, PAGE_WIDTH - LEFT - RIGHT);

                List<List<String>> tableRows = rows.isEmpty()
                    ? List.of(List.of("No leads in this pipeline stage", "-", "-", "-", "-", "-", "-", "-"))
                    : rows.stream().map(this::leadRow).toList();
                renderer.top = drawTable(renderer, sectionTop + 36f,
                    List.of("Lead", "Company", "Phone", "Email", "Source", "Score", "Owner", "Created"),
                    tableRows,
                    new float[] {96f, 91f, 71f, 125f, 62f, 45f, 79f, 85f},
                    rows.isEmpty() ? EMPTY_HEADER : GREEN, 6.8f, TABLE_ROW_HEIGHT - 2f);
                renderer.top += 12f;
            }

            renderer.finishPage();
            document.save(output);
            return output.toByteArray();
        }
    }

    private void drawHeader(Renderer renderer, int leadCount) throws IOException {
        fillRect(renderer.stream, 0, 0, PAGE_WIDTH, 108f, NAVY);
        fillRect(renderer.stream, 40f, 28f, 119f, 23f, CYAN);
        drawText(renderer.stream, renderer.fonts.bold(), "LIVE PIPELINE", 54f, 44f, 7f, Color.WHITE, 100f);
        drawText(renderer.stream, renderer.fonts.bold(), "NexaCRM Pipeline Playbook", LEFT, 76f, 19f, Color.WHITE, 500f);
        drawText(renderer.stream, renderer.fonts.normal(), "Every lead, organized stage by stage - generated " +
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy, h:mm a", Locale.ENGLISH)).toLowerCase(Locale.ROOT),
            LEFT, 97f, 9f, new Color(203, 213, 225), 600f);
        drawCircle(renderer.stream, PAGE_WIDTH - 71f, 51f, 25f, GREEN);
        String count = String.valueOf(leadCount);
        drawText(renderer.stream, renderer.fonts.bold(), count, PAGE_WIDTH - 71f - (count.length() * 4f), 55f, 14f, Color.WHITE, 50f);
        drawText(renderer.stream, renderer.fonts.bold(), "LEADS", PAGE_WIDTH - 86f, 79f, 7f, Color.WHITE, 50f);
    }

    private List<String> leadRow(Lead lead) {
        return List.of(
            safe(lead.getName(), "-"),
            safe(lead.getCompany(), "-"),
            safe(lead.getPhone(), "-"),
            safe(lead.getEmail(), "-"),
            sourceLabel(lead.getSource()),
            lead.getScore() == null ? "-" : lead.getScore().name(),
            ownerName(lead),
            formatDate(lead.getCreatedAt())
        );
    }

    private String ownerName(Lead lead) {
        try {
            User owner = lead.getAssignedTo();
            return owner == null || owner.getName() == null || owner.getName().isBlank() ? "Unassigned" : owner.getName();
        } catch (RuntimeException ex) {
            log.debug("Unable to resolve lead owner for pipeline PDF", ex);
            return "Unassigned";
        }
    }

    private String sourceLabel(Lead.LeadSource source) {
        if (source == null) return "Other";
        if (source == Lead.LeadSource.GOOGLE_ADS) return "Google Ads";
        if (source == Lead.LeadSource.META_ADS) return "Meta Ads";
        String value = source.name().toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private String formatDate(LocalDateTime value) {
        return value == null ? "-" : EXPORT_DATE_FORMAT.format(value).replace("AM", "am").replace("PM", "pm");
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private int activeStageCount(Map<String, List<Lead>> stageBuckets) {
        return (int) STAGES.stream().filter(stage -> !stageBuckets.get(stage.key()).isEmpty()).count();
    }

    private String busiestStageText(Map<String, List<Lead>> stageBuckets) {
        Stage busiest = STAGES.get(0);
        for (Stage stage : STAGES) {
            if (stageBuckets.get(stage.key()).size() > stageBuckets.get(busiest.key()).size()) busiest = stage;
        }
        return String.format(Locale.ENGLISH, "%s - %s has %,d lead(s).", busiest.group(), busiest.label(), stageBuckets.get(busiest.key()).size());
    }

    private String stageNote(Stage stage, int count) {
        if (count == 0) return "No leads parked here right now.";
        if ("new".equals(stage.key())) return "Fresh intake - assign, call, and qualify quickly.";
        if (stage.key().contains("lost")) return "Review reasons and recycle useful learnings.";
        if (stage.key().contains("won")) return "Won pipeline - close handoff and customer onboarding.";
        if (stage.key().contains("meeting")) return "Meeting-ready leads - protect next actions and dates.";
        if (stage.key().contains("interested")) return "Interested leads - push to follow-up before interest cools.";
        return "Active working queue - keep ownership and next step clear.";
    }

    private float drawTable(Renderer renderer, float top, List<String> headers, List<List<String>> rows,
                            float[] widths, Color headerColor, float fontSize, float rowHeight) throws IOException {
        int rowIndex = 0;
        boolean empty = rows.isEmpty();
        while (rowIndex < rows.size() || (empty && rowIndex == 0)) {
            if (top + TABLE_HEADER_HEIGHT + rowHeight > CONTENT_BOTTOM) {
                renderer.newPage();
                top = renderer.top;
            }
            fillRect(renderer.stream, LEFT, top, sum(widths), TABLE_HEADER_HEIGHT, headerColor);
            float x = LEFT;
            for (int i = 0; i < headers.size(); i++) {
                drawText(renderer.stream, renderer.fonts.bold(), headers.get(i), x + 5f,
                    top + 16f, fontSize, Color.WHITE, widths[i] - 10f);
                x += widths[i];
            }
            top += TABLE_HEADER_HEIGHT;

            int capacity = Math.max(1, (int) ((CONTENT_BOTTOM - top) / rowHeight));
            int end = empty ? 1 : Math.min(rows.size(), rowIndex + capacity);
            for (int i = rowIndex; i < end; i++) {
                List<String> row = empty ? rows.get(0) : rows.get(i);
                if ((i - rowIndex) % 2 == 0) fillRect(renderer.stream, LEFT, top, sum(widths), rowHeight, ROW);
                drawTableGrid(renderer.stream, LEFT, top, sum(widths), rowHeight, widths);
                x = LEFT;
                for (int col = 0; col < widths.length; col++) {
                    String value = col < row.size() ? row.get(col) : "-";
                    Color textColor = col == 0 && !empty ? new Color(51, 65, 85) : SLATE;
                    drawText(renderer.stream, col == 0 && !empty ? renderer.fonts.bold() : renderer.fonts.normal(), value,
                        x + 5f, top + rowHeight / 2f + fontSize / 3f, fontSize, textColor, widths[col] - 10f);
                    x += widths[col];
                }
                top += rowHeight;
            }
            rowIndex = empty ? 1 : end;
            if (rowIndex < rows.size()) {
                renderer.newPage();
                top = renderer.top;
            }
        }
        return top;
    }

    private float sum(float[] values) {
        float result = 0f;
        for (float value : values) result += value;
        return result;
    }

    private void drawTableGrid(PDPageContentStream stream, float x, float top, float width, float height, float[] widths) throws IOException {
        if (height <= 0) return;
        stream.setStrokingColor(GRID);
        stream.setLineWidth(0.45f);
        stream.addRect(x, PAGE_HEIGHT - top - height, width, height);
        stream.stroke();
        float current = x;
        for (float columnWidth : widths) {
            current += columnWidth;
            if (current >= x + width - 0.1f) break;
            stream.moveTo(current, PAGE_HEIGHT - top);
            stream.lineTo(current, PAGE_HEIGHT - top - height);
            stream.stroke();
        }
    }

    private void fillRect(PDPageContentStream stream, float x, float top, float width, float height, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        stream.addRect(x, PAGE_HEIGHT - top - height, width, height);
        stream.fill();
    }

    private void drawCircle(PDPageContentStream stream, float centerX, float centerTop, float radius, Color color) throws IOException {
        float k = 0.5522848f * radius;
        float centerY = PAGE_HEIGHT - centerTop;
        stream.setNonStrokingColor(color);
        stream.moveTo(centerX + radius, centerY);
        stream.curveTo(centerX + radius, centerY + k, centerX + k, centerY + radius, centerX, centerY + radius);
        stream.curveTo(centerX - k, centerY + radius, centerX - radius, centerY + k, centerX - radius, centerY);
        stream.curveTo(centerX - radius, centerY - k, centerX - k, centerY - radius, centerX, centerY - radius);
        stream.curveTo(centerX + k, centerY - radius, centerX + radius, centerY - k, centerX + radius, centerY);
        stream.closePath();
        stream.fill();
    }

    private void drawText(PDPageContentStream stream, PDFont font, String value, float x, float baselineTop,
                          float fontSize, Color color, float maxWidth) throws IOException {
        String text = fitText(font, value, fontSize, maxWidth);
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.setNonStrokingColor(color);
        stream.newLineAtOffset(x, PAGE_HEIGHT - baselineTop);
        stream.showText(text);
        stream.endText();
    }

    private String fitText(PDFont font, String value, float fontSize, float maxWidth) throws IOException {
        String safe = sanitize(font, value == null ? "" : value);
        if (font.getStringWidth(safe) / 1000f * fontSize <= maxWidth) return safe;
        String suffix = "…";
        StringBuilder result = new StringBuilder();
        for (int offset = 0; offset < safe.length();) {
            int codePoint = safe.codePointAt(offset);
            String candidate = result + new String(Character.toChars(codePoint)) + suffix;
            if (font.getStringWidth(candidate) / 1000f * fontSize > maxWidth) break;
            result.appendCodePoint(codePoint);
            offset += Character.charCount(codePoint);
        }
        return result + suffix;
    }

    private String sanitize(PDFont font, String value) {
        StringBuilder safe = new StringBuilder(value.length());
        value.codePoints().forEach(codePoint -> {
            try {
                String glyph = new String(Character.toChars(codePoint));
                if (font.encode(glyph).length > 0) safe.appendCodePoint(codePoint);
                else safe.append('?');
            } catch (IOException | IllegalArgumentException ex) {
                safe.append('?');
            }
        });
        return safe.toString();
    }

    private static final class Stage {
        private final String key;
        private final String group;
        private final String label;

        private Stage(String key, String group, String label) {
            this.key = key;
            this.group = group;
            this.label = label;
        }

        private String key() { return key; }
        private String group() { return group; }
        private String label() { return label; }
    }

    private static final class Fonts {
        private final PDFont normal;
        private final PDFont bold;

        private Fonts(PDDocument document) {
            this.normal = load(document, "NotoSansDevanagari-Regular.ttf", PDType1Font.HELVETICA);
            this.bold = load(document, "NotoSansDevanagari-Bold.ttf", normal);
        }

        private PDFont normal() { return normal; }
        private PDFont bold() { return bold; }

        private static PDFont load(PDDocument document, String fileName, PDFont fallback) {
            List<Path> candidates = List.of(
                Path.of("/usr/share/fonts/truetype/noto", fileName),
                Path.of("/usr/share/fonts/opentype/noto", fileName),
                Path.of("/usr/local/share/fonts", fileName)
            );
            for (Path candidate : candidates) {
                if (!Files.isRegularFile(candidate)) continue;
                try {
                    return PDType0Font.load(document, candidate.toFile());
                } catch (IOException ignored) {
                    // Try the next system font location, then use the PDFBox fallback.
                }
            }
            return fallback;
        }
    }

    private final class Renderer {
        private final PDDocument document;
        private final Fonts fonts;
        private PDPage page;
        private PDPageContentStream stream;
        private float top;

        private Renderer(PDDocument document, Fonts fonts) {
            this.document = document;
            this.fonts = fonts;
        }

        private void startPage() throws IOException {
            page = new PDPage(LANDSCAPE_A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            top = 24f;
        }

        private void newPage() throws IOException {
            finishPage();
            startPage();
        }

        private void finishPage() throws IOException {
            drawText(stream, fonts.bold(), "NexaCRM pipeline export", LEFT, PAGE_HEIGHT - 12f, 7f, MUTED, 160f);
            drawText(stream, fonts.bold(), "Page " + document.getNumberOfPages(), PAGE_WIDTH - 68f, PAGE_HEIGHT - 12f, 7f, MUTED, 45f);
            stream.close();
        }
    }
}
