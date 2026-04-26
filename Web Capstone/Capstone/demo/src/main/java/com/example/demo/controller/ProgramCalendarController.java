package com.example.demo.controller;

import com.example.demo.model.ProgramCalendar;
import com.example.demo.model.ProgramBudget;
import com.example.demo.model.SuggestedProgram;
import com.example.demo.services.ProgramCalendarService;
import com.example.demo.services.ProgramBudgetService;
import com.example.demo.services.SuggestedProgramService;
import com.example.demo.services.ChatHistoryServiceAI;
import com.example.demo.services.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/calendar")
public class ProgramCalendarController {

    private final ProgramCalendarService calendarService;
    private final ProgramBudgetService budgetService;
    private final SuggestedProgramService suggestedProgramService;
    private final ChatHistoryServiceAI chatHistoryService;
    private final GeminiService geminiService;

    public ProgramCalendarController(ProgramCalendarService calendarService,
                                     ProgramBudgetService budgetService,
                                     SuggestedProgramService suggestedProgramService,
                                     ChatHistoryServiceAI chatHistoryService,
                                     GeminiService geminiService) {
        this.calendarService = calendarService;
        this.budgetService = budgetService;
        this.suggestedProgramService = suggestedProgramService;
        this.chatHistoryService = chatHistoryService;
        this.geminiService = geminiService;
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }

    //Budget Endpoints 
    
    @GetMapping("/budget/current")
    public ResponseEntity<Map<String, Object>> getCurrentBudget() {
        Double total = budgetService.getTotalBudget();
        Map<String, Object> response = new HashMap<>();
        response.put("totalBudget", total != null ? total : 0.0);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/budget/add")
    public ResponseEntity<?> addManualBudget(@RequestBody ProgramBudget budget) {
        ProgramBudget saved = budgetService.saveManualEntry(budget);
        Double total = budgetService.getTotalBudget();

        return ResponseEntity.ok(Map.of(
            "id",          saved.getId(),
            "budgetItem",  saved.getBudgetItem(),
            "amount",      saved.getAmount(),
            "totalBudget", total
        ));
    }

    @PutMapping("/budget/update")
    public ResponseEntity<?> updateBudget(@RequestBody Map<String, Double> body) {
        Double amount = body.get("amount");
        if (amount == null || amount < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid amount"));
        }
        ProgramBudget updated = budgetService.updateFirstEntry(amount);
        return ResponseEntity.ok(Map.of(
            "id",          updated.getId(),
            "budgetItem",  updated.getBudgetItem(),
            "amount",      updated.getAmount(),
            "totalBudget", updated.getAmount()
        ));
    }

    // Upcoming programs 
    @GetMapping("/upcoming")
    public ResponseEntity<List<Map<String, Object>>> getUpcomingPrograms() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> upcoming = calendarService.getAllEvents()
            .stream()
            .filter(e -> e.getEventDate() != null && !e.getEventDate().isBefore(today))
            .sorted((a, b) -> a.getEventDate().compareTo(b.getEventDate()))
            .limit(5)
            .map(e -> {
                Map<String, Object> item = new HashMap<>();
                item.put("id",        e.getId());
                item.put("notes",     e.getNotes() != null ? e.getNotes() : "Unnamed Program");
                item.put("eventDate", e.getEventDate().toString());
                item.put("day",       e.getEventDate().getDayOfMonth());
                item.put("month",     e.getEventDate().getMonthValue());
                item.put("year",      e.getEventDate().getYear());
                item.put("startTime", e.getStartTime() != null ? e.getStartTime().toString() : null);
                item.put("endTime",   e.getEndTime() != null ? e.getEndTime().toString() : null);
                item.put("location",  e.getLocation() != null ? e.getLocation() : "");
                return item;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(upcoming);
    }

    //Events for a specific month 
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

    //  AI Chat Planner with Conversation Memory
    @PostMapping("/chat-plan")
    public ResponseEntity<?> createFromChat(@RequestBody String userText, @RequestParam Long programId) {
        try {
            String username = getCurrentUsername();
            System.out.println("=== Chat Request ===");
            System.out.println("Username: " + username);
            System.out.println("User text: " + userText);
            System.out.println("ProgramId: " + programId);
            
            try {
                chatHistoryService.save("user", userText, username);
                System.out.println("User message saved to history");
            } catch (Exception e) {
                System.err.println("Error saving user message: " + e.getMessage());
            }
            
            String conversationHistory = "";
            try {
                conversationHistory = chatHistoryService.getFormattedHistory(username, 10);
                System.out.println("Conversation history retrieved, length: " + conversationHistory.length());
            } catch (Exception e) {
                System.err.println("Error getting conversation history: " + e.getMessage());
            }
            
            Double totalBudget = budgetService.getTotalBudget();
            if (totalBudget == null) {
                totalBudget = 0.0;
            }
            
            LocalDate today = LocalDate.now();
            String formattedToday = today.toString(); // YYYY-MM-DD format
            String formattedTodayReadable = today.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
            
            String enrichedPrompt = String.format(
                "Today's date is %s (%s). The current available budget is ₱%.2f. Please include an estimated program_budget in your JSON response. Do NOT suggest or accept any dates that are before today.\n\nUser request: %s%s",
                formattedToday, formattedTodayReadable, totalBudget, userText, conversationHistory
            );
            
            System.out.println("Sending to Gemini with today's date: " + formattedToday);
            String aiResponse = geminiService.getAiResponse(enrichedPrompt);
            System.out.println("Received response from Gemini, length: " + aiResponse.length());
            
            String cleaned = aiResponse.replaceAll("```[a-zA-Z]*", "").replace("```", "").trim();

            int jsonStart = cleaned.lastIndexOf("{");
            int jsonEnd   = cleaned.lastIndexOf("}");

            if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
                String jsonPart = cleaned.substring(jsonStart, jsonEnd + 1);
                String conversationalText = cleaned.substring(0, jsonStart).trim();
                System.out.println("JSON part: " + jsonPart);

                try {
                    if (jsonPart.contains("eventDate")) {
                        ObjectMapper mapper = new ObjectMapper();
                        mapper.registerModule(new JavaTimeModule());
                       
                        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
                        ProgramCalendar parsedEvent = mapper.readValue(jsonPart, ProgramCalendar.class);
                        
                        System.out.println("Parsed event - Notes: " + parsedEvent.getNotes());
                        System.out.println("Parsed event - Budget: " + parsedEvent.getProgramBudget());
                        System.out.println("Parsed event - Date: " + parsedEvent.getEventDate());
                        System.out.println("Parsed event - Start Time: " + parsedEvent.getStartTime());
                        System.out.println("Parsed event - End Time: " + parsedEvent.getEndTime());
                        System.out.println("Parsed event - Location: " + parsedEvent.getLocation());

                        String aiMessage = conversationalText.isEmpty() ? "Here is my program suggestion." : conversationalText;
                        
                        try {
                            chatHistoryService.save("ai", aiMessage, username);
                            System.out.println("AI response saved to history");
                        } catch (Exception e) {
                            System.err.println("Error saving AI response: " + e.getMessage());
                        }

                        Integer programBudget = parsedEvent.getProgramBudget();
                        if (programBudget == null) {
                            programBudget = 0;
                        }

                        Map<String, Object> responseBody = new HashMap<>();
                        responseBody.put("message", aiMessage);
                        responseBody.put("pending", Map.of(
                            "programName",     parsedEvent.getNotes() != null ? parsedEvent.getNotes() : "Community Program",
                            "programDate",     parsedEvent.getEventDate() != null ? parsedEvent.getEventDate().toString() : "",
                            "programTime",     parsedEvent.getStartTime() != null ? parsedEvent.getStartTime().toString() : "",
                            "programendTime",  parsedEvent.getEndTime() != null ? parsedEvent.getEndTime().toString() : "",
                            "program_place",   parsedEvent.getLocation() != null ? parsedEvent.getLocation() : "TBD",
                            "program_budget",  programBudget,
                            "programId",       programId
                        ));
                        System.out.println("Returning success response with budget: " + programBudget);
                        return ResponseEntity.ok(responseBody);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing event JSON: " + e.getMessage());
                    e.printStackTrace();
                    return ResponseEntity.internalServerError().body(Map.of("message", "Error parsing event: " + e.getMessage()));
                }
            }

            try {
                chatHistoryService.save("ai", cleaned, username);
                System.out.println("Regular AI response saved to history");
            } catch (Exception e) {
                System.err.println("Error saving AI response: " + e.getMessage());
            }
            
            System.out.println("Returning regular response");
            return ResponseEntity.ok(Map.of("message", cleaned));
            
        } catch (Exception e) {
            System.err.println("FATAL ERROR in chat-plan endpoint: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "Server error: " + e.getMessage()));
        }
    }

    // Suggested Programs Endpoints 
    
    @GetMapping("/suggested")
    public List<SuggestedProgram> getSuggestedPrograms() {
        return suggestedProgramService.getAllSuggestedPrograms();
    }

    @PostMapping("/suggested")
    public ResponseEntity<?> addSuggestedProgram(@RequestBody Map<String, Object> programData) {
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
            if (budgetObj != null) {
                if (budgetObj instanceof Integer) {
                    program.setProgram_budget((Integer) budgetObj);
                } else if (budgetObj instanceof String) {
                    try {
                        program.setProgram_budget(Integer.parseInt((String) budgetObj));
                    } catch (NumberFormatException e) {
                        program.setProgram_budget(0);
                    }
                } else if (budgetObj instanceof Double) {
                    program.setProgram_budget(((Double) budgetObj).intValue());
                } else {
                    program.setProgram_budget(0);
                }
            } else {
                program.setProgram_budget(0);
            }
            if (program.getProgramId() == null) {
                program.setProgramId(1L);
            }
            
            SuggestedProgram saved = suggestedProgramService.saveManualEntry(program);
            System.out.println("Saved program with budget: " + saved.getProgram_budget());
            return ResponseEntity.ok(saved);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to save program: " + e.getMessage()));
        }
    }

    @PostMapping("/suggested/add")
    public ResponseEntity<?> addSuggestedProgramAlt(@RequestBody Map<String, Object> programData) {
        return addSuggestedProgram(programData);
    }

    @DeleteMapping("/suggested/{id}")
    public ResponseEntity<Void> deleteSuggestedProgram(@PathVariable Long id) {
        suggestedProgramService.deleteSuggestedProgram(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/suggested/approve")
    public ResponseEntity<?> approveSuggestedProgram(@RequestBody SuggestedProgram program) {
        if (program.getProgramName() == null || program.getProgramName().isEmpty()) {
            program.setProgramName("Community Program");
        }
        if (program.getProgramId() == null) {
            program.setProgramId(1L);
        }
        return ResponseEntity.ok(suggestedProgramService.saveManualEntry(program));
    }

    //Calendar Event Endpoints 

    @PostMapping("/add")
    public ResponseEntity<?> addToCalendar(@RequestBody ProgramCalendar event) {
        System.out.println("=== Adding to Calendar ===");
        System.out.println("Event Notes: " + event.getNotes());
        System.out.println("Event Date: " + event.getEventDate());
        System.out.println("Event Start Time: " + event.getStartTime());
        System.out.println("Event End Time: " + event.getEndTime());
        System.out.println("Event Location: " + event.getLocation());
        System.out.println("Event Program Budget: " + event.getProgramBudget());
        System.out.println("Event Program ID: " + event.getProgramId());
        
        LocalDate today = LocalDate.now();
        if (event.getEventDate() != null && event.getEventDate().isBefore(today)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Cannot add events on past dates. Please select a future or today's date."
            ));
        }
        
        if (event.getProgramId() == null) event.setProgramId(1L);
        ProgramCalendar saved = calendarService.saveEvent(event);
        
        System.out.println("Saved Event ID: " + saved.getId());
        System.out.println("Saved Event Budget: " + saved.getProgramBudget());
        
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/all")
    public List<ProgramCalendar> getAllEvents() {
        return calendarService.getAllEvents();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        calendarService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // Chat History Endpoints
    
    @GetMapping("/chat-history")
    public ResponseEntity<?> getChatHistory() {
        try {
            return ResponseEntity.ok(chatHistoryService.getHistory(getCurrentUsername()));
        } catch (Exception e) {
            System.err.println("Error getting chat history: " + e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @DeleteMapping("/chat-history")
    public ResponseEntity<?> clearChatHistory() {
        try {
            chatHistoryService.clearHistory(getCurrentUsername());
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.err.println("Error clearing chat history: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to clear history"));
        }
    }
}