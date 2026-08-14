package com.example.demo.controller;

import com.example.demo.model.ProgramCalendar;
import com.example.demo.model.ProgramBudget;
import com.example.demo.model.SuggestedProgram;
import com.example.demo.services.ProgramCalendarService;
import com.example.demo.services.ProgramBudgetService;
import com.example.demo.services.SuggestedProgramService;
import com.example.demo.services.ChatHistoryServiceAI;
import com.example.demo.services.GeminiService;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.CensusRecordService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.type.TypeReference;

@RestController
@RequestMapping("/api/calendar")
public class ProgramCalendarController {

    private final ProgramCalendarService calendarService;
    private final ProgramBudgetService budgetService;
    private final SuggestedProgramService suggestedProgramService;
    private final ChatHistoryServiceAI chatHistoryService;
    private final GeminiService geminiService;
    private final ActivityLogService activityLogService;
    private final CensusRecordService censusRecordService;

    public ProgramCalendarController(ProgramCalendarService calendarService,
                                    ProgramBudgetService budgetService,
                                    SuggestedProgramService suggestedProgramService,
                                    ChatHistoryServiceAI chatHistoryService,
                                    GeminiService geminiService,
                                    ActivityLogService activityLogService,
                                    CensusRecordService censusRecordService) {
        this.calendarService = calendarService;
        this.budgetService = budgetService;
        this.suggestedProgramService = suggestedProgramService;
        this.chatHistoryService = chatHistoryService;
        this.geminiService = geminiService;
        this.activityLogService = activityLogService;
        this.censusRecordService = censusRecordService;
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }

    // ── Budget Endpoints ──────────────────────────────────────────────────────

    @GetMapping("/budget/current")
    public ResponseEntity<Map<String, Object>> getCurrentBudget() {
        Double total = budgetService.getTotalBudget();
        Map<String, Object> response = new HashMap<>();
        response.put("totalBudget", total != null ? total : 0.0);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/poll")
    public ResponseEntity<Map<String, Object>> pollCalendar() {
        Map<String, Object> response = new HashMap<>();
        List<ProgramCalendar> allEvents = calendarService.getAllEvents();
        response.put("eventCount", allEvents.size());
        response.put("lastEventId", allEvents.isEmpty() ? 0 : allEvents.stream().mapToLong(ProgramCalendar::getId).max().orElse(0));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/budget/add")
    public ResponseEntity<?> addManualBudget(
            @RequestBody ProgramBudget budget,
            HttpServletRequest request) {

        ProgramBudget saved = budgetService.saveManualEntry(budget);
        Double total = budgetService.getTotalBudget();

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "CREATED", "Program Planner",
            "Added budget entry: " + saved.getBudgetItem() + " (₱" + saved.getAmount() + ")",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of(
            "id",          saved.getId(),
            "budgetItem",  saved.getBudgetItem(),
            "amount",      saved.getAmount(),
            "totalBudget", total
        ));
    }

    @PutMapping("/budget/update")
    public ResponseEntity<?> updateBudget(
            @RequestBody Map<String, Double> body,
            HttpServletRequest request) {

        Double amount = body.get("amount");
        if (amount == null || amount < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid amount"));
        }

        ProgramBudget updated = budgetService.updateFirstEntry(amount);

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "UPDATED", "Program Planner",
            "Updated budget to ₱" + amount,
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of(
            "id",          updated.getId(),
            "budgetItem",  updated.getBudgetItem(),
            "amount",      updated.getAmount(),
            "totalBudget", updated.getAmount()
        ));
    }

    // ── Upcoming / Month ──────────────────────────────────────────────────────

    @GetMapping("/upcoming")
    public ResponseEntity<List<Map<String, Object>>> getUpcomingPrograms(
            @RequestParam(defaultValue = "60") int minutes,
            @RequestParam(required = false) Long lastId) {

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDate untilDate = now.plusMinutes(minutes).toLocalDate();

        List<Map<String, Object>> upcoming = calendarService.getAllEvents()
            .stream()
            .filter(e -> e.getEventDate() != null)
            .filter(e -> !e.getEventDate().isBefore(today) && !e.getEventDate().isAfter(untilDate))
            .filter(e -> e.getStartTime() != null)                        // ignore events without start time
            .filter(e -> {
                // If event is today, only include if start time is still in the future
                if (e.getEventDate().isEqual(today)) {
                    return e.getStartTime().isAfter(now.toLocalTime());
                }
                return true;
            })
            .filter(e -> lastId == null || e.getId() > lastId)           // incremental fetching
            .sorted(Comparator.comparing(ProgramCalendar::getEventDate)
                    .thenComparing(ProgramCalendar::getStartTime))
            .map(e -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id",         e.getId());
                // Use notes as the program name (since there is no separate name field)
                item.put("programName", e.getNotes() != null ? e.getNotes() : "Community Program");
                item.put("eventDate",  e.getEventDate().toString());
                item.put("startTime",  e.getStartTime() != null ? e.getStartTime().toString() : null);
                item.put("location",   e.getLocation() != null ? e.getLocation() : "TBD");
                return item;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(upcoming);
    }

    @GetMapping("/month")
    public ResponseEntity<List<Map<String, Object>>> getEventsForMonth(
            @RequestParam int year,
            @RequestParam int month) {

        List<Map<String, Object>> events = calendarService.getAllEvents()
            .stream()
            .filter(e -> e.getEventDate() != null
                      && e.getEventDate().getYear() == year
                      && e.getEventDate().getMonthValue() == month)
            .map(e -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id",        e.getId());
                item.put("day",       e.getEventDate().getDayOfMonth());
                item.put("notes",     e.getNotes() != null ? e.getNotes() : "");
                item.put("startTime", e.getStartTime() != null ? e.getStartTime().toString() : null);
                return item;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(events);
    }

    // ── AI Chat Planner ───────────────────────────────────────────────────────

    @PostMapping("/chat-plan")
    public ResponseEntity<?> createFromChat(@RequestBody String userText, @RequestParam Long programId) {
        try {
            String username = getCurrentUsername();

            try {
                chatHistoryService.save("user", userText, username);
            } catch (Exception e) {
                System.err.println("Error saving user message: " + e.getMessage());
            }

            String conversationHistory = "";
            try {
                conversationHistory = chatHistoryService.getFormattedHistory(username, 10);
            } catch (Exception e) {
                System.err.println("Error getting conversation history: " + e.getMessage());
            }

            Double totalBudget = budgetService.getTotalBudget();
            if (totalBudget == null) totalBudget = 0.0;

            LocalDate today = LocalDate.now();
            String communityProfile;
            try {
                communityProfile = censusRecordService.getDemographicSummary();
            } catch (Exception e) {
                communityProfile = "Census data unavailable.";
            }

            String enrichedPrompt = String.format(
                "You are a barangay program planner for Barangay San Sebastian. Use this REAL census data to make data-driven suggestions:\n\n%s\n\nToday's date is %s (%s). The current available budget is ₱%.2f. Please include an estimated program_budget in your JSON response. Do NOT suggest or accept any dates that are before today. When suggesting programs, reference the specific numbers from the census data above.\n\nUser request: %s%s",
                communityProfile,
                today.toString(), today.format(DateTimeFormatter.ofPattern("MMMM d, yyyy")),
                totalBudget, userText, conversationHistory
            );

            String aiResponse = geminiService.getAiResponse(enrichedPrompt);
            String cleaned = aiResponse.replaceAll("```[a-zA-Z]*", "").replace("```", "").trim();

            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            // ── Detect JSON array (multi-program / annual plan) ────────────────
            int arrayStart = cleaned.lastIndexOf("[");
            int arrayEnd   = cleaned.lastIndexOf("]");

            if (arrayStart != -1 && arrayEnd != -1 && arrayEnd > arrayStart) {
                String arrayPart          = cleaned.substring(arrayStart, arrayEnd + 1);
                String conversationalText = cleaned.substring(0, arrayStart).trim();

                try {
                    List<ProgramCalendar> parsedEvents = mapper.readValue(
                        arrayPart, new TypeReference<List<ProgramCalendar>>() {});

                    if (!parsedEvents.isEmpty() && parsedEvents.get(0).getEventDate() != null) {
                        String aiMessage = conversationalText.isEmpty()
                            ? "Here are your suggested programs." : conversationalText;

                        try { chatHistoryService.save("ai", aiMessage, username); }
                        catch (Exception e) { System.err.println("Error saving AI response: " + e.getMessage()); }

                        List<Map<String, Object>> pendingList = new ArrayList<>();
                        for (ProgramCalendar ev : parsedEvents) {
                            Map<String, Object> item = new HashMap<>();
                            item.put("programName",    ev.getNotes() != null ? ev.getNotes() : "Community Program");
                            item.put("programDate",    ev.getEventDate() != null ? ev.getEventDate().toString() : "");
                            item.put("programTime",    ev.getStartTime() != null ? ev.getStartTime().toString() : "");
                            item.put("programendTime", ev.getEndTime() != null ? ev.getEndTime().toString() : "");
                            item.put("program_place",  ev.getLocation() != null ? ev.getLocation() : "TBD");
                            item.put("program_budget", ev.getProgramBudget() != null ? ev.getProgramBudget() : 0);
                            item.put("programId",      programId);
                            pendingList.add(item);
                        }

                        Map<String, Object> responseBody = new HashMap<>();
                        responseBody.put("message",     aiMessage);
                        responseBody.put("pendingList",  pendingList);
                        return ResponseEntity.ok(responseBody);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing event array JSON: " + e.getMessage());
                }
            }

            // ── Detect JSON object (single program) ───────────────────────────
            int jsonStart = cleaned.lastIndexOf("{");
            int jsonEnd   = cleaned.lastIndexOf("}");

            if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
                String jsonPart           = cleaned.substring(jsonStart, jsonEnd + 1);
                String conversationalText = cleaned.substring(0, jsonStart).trim();

                try {
                    if (jsonPart.contains("eventDate")) {
                        ProgramCalendar parsedEvent = mapper.readValue(jsonPart, ProgramCalendar.class);

                        String aiMessage = conversationalText.isEmpty() ? "Here is my program suggestion." : conversationalText;

                        try { chatHistoryService.save("ai", aiMessage, username); }
                        catch (Exception e) { System.err.println("Error saving AI response: " + e.getMessage()); }

                        Integer programBudget = parsedEvent.getProgramBudget() != null ? parsedEvent.getProgramBudget() : 0;

                        Map<String, Object> responseBody = new HashMap<>();
                        responseBody.put("message", aiMessage);
                        responseBody.put("pending", Map.of(
                            "programName",    parsedEvent.getNotes() != null ? parsedEvent.getNotes() : "Community Program",
                            "programDate",    parsedEvent.getEventDate() != null ? parsedEvent.getEventDate().toString() : "",
                            "programTime",    parsedEvent.getStartTime() != null ? parsedEvent.getStartTime().toString() : "",
                            "programendTime", parsedEvent.getEndTime() != null ? parsedEvent.getEndTime().toString() : "",
                            "program_place",  parsedEvent.getLocation() != null ? parsedEvent.getLocation() : "TBD",
                            "program_budget", programBudget,
                            "programId",      programId
                        ));
                        return ResponseEntity.ok(responseBody);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing event JSON: " + e.getMessage());
                    return ResponseEntity.internalServerError().body(Map.of("message", "Error parsing event: " + e.getMessage()));
                }
            }

            try { chatHistoryService.save("ai", cleaned, username); }
            catch (Exception e) { System.err.println("Error saving AI response: " + e.getMessage()); }

            return ResponseEntity.ok(Map.of("message", cleaned));

        } catch (Exception e) {
            System.err.println("FATAL ERROR in chat-plan endpoint: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "Server error: " + e.getMessage()));
        }
    }

    // ── Suggested Programs ────────────────────────────────────────────────────

    @GetMapping("/suggested")
    public List<SuggestedProgram> getSuggestedPrograms() {
        return suggestedProgramService.getAllSuggestedPrograms();
    }

    @GetMapping("/census-test")
    public ResponseEntity<String> testCensus() {
        try {
            long count = censusRecordService.getTotalCount();
            String summary = censusRecordService.getDemographicSummary();
            return ResponseEntity.ok("COUNT: " + count + "\n\n" + summary);
        } catch (Exception e) {
            return ResponseEntity.ok("ERROR: " + e.getClass().getName() + " - " + e.getMessage());
        }
    }

    @PostMapping("/suggested")
    public ResponseEntity<?> addSuggestedProgram(
            @RequestBody Map<String, Object> programData,
            HttpServletRequest request) {

        try {
            SuggestedProgram program = new SuggestedProgram();
            program.setProgramName((String) programData.getOrDefault("programName", "Community Program"));

            String programDateStr = (String) programData.get("programDate");
            if (programDateStr != null && !programDateStr.isEmpty()) {
                program.setProgramDate(programDateStr);
            }

            program.setProgram_place((String) programData.getOrDefault("program_place", "TBD"));

            String programTimeStr = (String) programData.get("programTime");
            if (programTimeStr != null && !programTimeStr.isEmpty()) {
                program.setProgramTime(LocalTime.parse(programTimeStr));
            }

            String programEndTimeStr = (String) programData.get("programendTime");
            if (programEndTimeStr != null && !programEndTimeStr.isEmpty()) {
                program.setProgramendTime(LocalTime.parse(programEndTimeStr));
            }

            Object budgetObj = programData.get("program_budget");
            if (budgetObj instanceof Integer)       program.setProgram_budget((Integer) budgetObj);
            else if (budgetObj instanceof Double)   program.setProgram_budget(((Double) budgetObj).intValue());
            else if (budgetObj instanceof String s) { try { program.setProgram_budget(Integer.parseInt(s)); } catch (NumberFormatException e) { program.setProgram_budget(0); } }
            else                                    program.setProgram_budget(0);

            if (program.getProgramId() == null) program.setProgramId(1L);

            SuggestedProgram saved = suggestedProgramService.saveManualEntry(program);

            activityLogService.log(
                getCurrentUsername(), "ADMIN", "CREATED", "Program Planner",
                "Added suggested program: " + saved.getProgramName(),
                request.getRemoteAddr(), "Success"
            );

            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to save program: " + e.getMessage()));
        }
    }

    @PostMapping("/suggested/bulk")
    public ResponseEntity<?> addSuggestedProgramsBulk(
            @RequestBody List<Map<String, Object>> programList,
            HttpServletRequest request) {

        List<SuggestedProgram> saved = new ArrayList<>();
        for (Map<String, Object> programData : programList) {
            try {
                SuggestedProgram program = new SuggestedProgram();
                program.setProgramName((String) programData.getOrDefault("programName", "Community Program"));

                String programDateStr = (String) programData.get("programDate");
                if (programDateStr != null && !programDateStr.isEmpty()) {
                    program.setProgramDate(programDateStr);
                }

                program.setProgram_place((String) programData.getOrDefault("program_place", "TBD"));

                String programTimeStr = (String) programData.get("programTime");
                if (programTimeStr != null && !programTimeStr.isEmpty()) {
                    program.setProgramTime(LocalTime.parse(programTimeStr));
                }

                String programEndTimeStr = (String) programData.get("programendTime");
                if (programEndTimeStr != null && !programEndTimeStr.isEmpty()) {
                    program.setProgramendTime(LocalTime.parse(programEndTimeStr));
                }

                Object budgetObj = programData.get("program_budget");
                if (budgetObj instanceof Integer)       program.setProgram_budget((Integer) budgetObj);
                else if (budgetObj instanceof Double)   program.setProgram_budget(((Double) budgetObj).intValue());
                else if (budgetObj instanceof String s) { try { program.setProgram_budget(Integer.parseInt(s)); } catch (NumberFormatException e) { program.setProgram_budget(0); } }
                else                                    program.setProgram_budget(0);

                if (program.getProgramId() == null) program.setProgramId(1L);

                saved.add(suggestedProgramService.saveManualEntry(program));
            } catch (Exception e) {
                System.err.println("Bulk save error for one program: " + e.getMessage());
            }
        }

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "CREATED", "Program Planner",
            "Bulk-added " + saved.size() + " suggested programs (annual plan)",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(Map.of("saved", saved.size()));
    }

    /**
     * Soft-delete: sets status = DELETED so the record disappears from
     * the suggestion list but remains visible in the Activity Log.
     */
    @DeleteMapping("/suggested/{id}")
    public ResponseEntity<Void> deleteSuggestedProgram(
            @PathVariable Long id,
            HttpServletRequest request) {

        suggestedProgramService.deleteSuggestedProgram(id);

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "DELETED", "Program Planner",
            "Deleted suggested program ID: " + id,
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.noContent().build();
    }

    /**
     * Marks a suggested program as ADDED after it has been sent to the calendar.
     * Called by the frontend immediately after a successful POST /api/calendar/add.
     */
    @PatchMapping("/suggested/{id}/mark-added")
    public ResponseEntity<Void> markSuggestedProgramAdded(
            @PathVariable Long id,
            HttpServletRequest request) {

        suggestedProgramService.markAsAdded(id);

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "UPDATED", "Program Planner",
            "Marked suggested program ID " + id + " as ADDED to calendar",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the activity log: all programs with status ADDED or DELETED,
     * sorted most-recent first. Powers the Activity Log modal.
     */
    @GetMapping("/suggested/log")
    public ResponseEntity<List<Map<String, Object>>> getSuggestedProgramLog() {
        List<Map<String, Object>> log = suggestedProgramService.getActivityLog()
            .stream()
            .map(p -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id",              p.getId());
                item.put("programName",     p.getProgramName());
                item.put("programDate",     p.getProgramDate()     != null ? p.getProgramDate()              : "");
                item.put("programTime",     p.getProgramTime()     != null ? p.getProgramTime().toString()   : "");
                item.put("program_place",   p.getProgram_place()   != null ? p.getProgram_place()            : "");
                item.put("program_budget",  p.getProgram_budget());
                item.put("status",          p.getStatus());
                item.put("statusUpdatedAt", p.getStatusUpdatedAt() != null ? p.getStatusUpdatedAt().toString() : "");
                return item;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(log);
    }

    @PostMapping("/suggested/approve")
    public ResponseEntity<?> approveSuggestedProgram(
            @RequestBody SuggestedProgram program,
            HttpServletRequest request) {

        if (program.getProgramName() == null || program.getProgramName().isEmpty()) {
            program.setProgramName("Community Program");
        }
        if (program.getProgramId() == null) program.setProgramId(1L);

        SuggestedProgram saved = suggestedProgramService.saveManualEntry(program);

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "UPDATED", "Program Planner",
            "Approved suggested program: " + saved.getProgramName(),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(saved);
    }

    // ── Calendar Events ───────────────────────────────────────────────────────

    @PostMapping("/add")
    public ResponseEntity<?> addToCalendar(
            @RequestBody ProgramCalendar event,
            HttpServletRequest request) {

        LocalDate today = LocalDate.now();
        if (event.getEventDate() != null && event.getEventDate().isBefore(today)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Cannot add events on past dates. Please select a future or today's date."
            ));
        }

        if (event.getProgramId() == null) event.setProgramId(1L);
        ProgramCalendar saved = calendarService.saveEvent(event);

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "CREATED", "Program Planner",
            "Added calendar event: " + (saved.getNotes() != null ? saved.getNotes() : "Unnamed") + " on " + saved.getEventDate(),
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/all")
    public List<ProgramCalendar> getAllEvents() {
        return calendarService.getAllEvents();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            HttpServletRequest request) {

        activityLogService.log(
            getCurrentUsername(), "ADMIN", "DELETED", "Program Planner",
            "Deleted calendar event ID: " + id,
            request.getRemoteAddr(), "Success"
        );

        calendarService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // ── Chat History ──────────────────────────────────────────────────────────

    @GetMapping("/chat-history")
    public ResponseEntity<?> getChatHistory() {
        try {
            return ResponseEntity.ok(chatHistoryService.getHistory(getCurrentUsername()));
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @DeleteMapping("/chat-history")
    public ResponseEntity<?> clearChatHistory(HttpServletRequest request) {
        try {
            chatHistoryService.clearHistory(getCurrentUsername());

            activityLogService.log(
                getCurrentUsername(), "ADMIN", "DELETED", "Program Planner",
                "Cleared AI chat history",
                request.getRemoteAddr(), "Success"
            );

            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to clear history"));
        }
    }


}