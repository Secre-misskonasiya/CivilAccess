package com.example.demo.services;

import java.time.LocalDate;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.stereotype.Service;

@Service
public class GeminiService {

    private static final List<String> ALLOWED_LOCATIONS = List.of(
        "Barangay Hall", "Covered Court", "Comelec Village", "Parksville",
        "Lancaster Village 1", "Rosedale", "Veraneo"
    );

    // Only these two exact search-query URL shapes are ever allowed through.
    // Anything else (a specific listing, item ID, seller page) is treated as
    // a hallucinated link and stripped before the response leaves this service.
    private static final Pattern ALLOWED_LINK = Pattern.compile(
        "https://shopee\\.ph/search\\?keyword=[^\\s\"]*" +
        "|https://www\\.lazada\\.com\\.ph/catalog/\\?q=[^\\s\"]*"
    );

    // Trailing characters that are almost always closing punctuation from
    // surrounding prose (e.g. "[Shopee: https://...keyword=x]") rather than
    // part of the URL itself. Stripped before validating against ALLOWED_LINK
    // so a bracket or period doesn't get glued onto an otherwise-valid link.
    private static final Pattern ANY_URL = Pattern.compile("https?://\\S+");
    private static final Pattern TRAILING_PUNCTUATION = Pattern.compile("[\\]\\)\\.,;:!?\"']+$");

    // Matches "location":"..." inside the trailing JSON payload the model emits.
    private static final Pattern LOCATION_FIELD = Pattern.compile(
        "\"location\"\\s*:\\s*\"([^\"]*)\""
    );

    // Matches "eventDate":"YYYY-MM-DD"
    private static final Pattern DATE_FIELD = Pattern.compile(
        "\"eventDate\"\\s*:\\s*\"(\\d{4}-\\d{2}-\\d{2})\""
    );

    private final ChatClient chatClient;

    public GeminiService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
            .defaultAdvisors(new SimpleLoggerAdvisor())
            .build();
    }

    public String getAiResponse(String userPrompt) {
        String raw = chatClient.prompt()
                .system("""
                    You are a helpful Barangay Program Planning Assistant.
                    The user's message will include the barangay's current available budget and TODAY'S DATE at the top.
                    Always read and consider the budget and today's date before responding.

                    LOCATION RULES:
                    - When suggesting or confirming a program location, the ONLY valid values are
                      exactly (character-for-character) one of:
                    • Barangay Hall
                    • Covered Court
                    • Comelec Village
                    • Parksville
                    • Lancaster Village 1
                    • Rosedale
                    • Veraneo
                    - Do not paraphrase, abbreviate, translate, or invent a nearby-sounding location.
                      If a user names a place not on this list (even a real, well-known place), it is
                      still invalid for this system — explain that only the listed barangay venues
                      are available and ask them to pick one from the list.
                    - Never put a location in the final "location" JSON field unless it is one of the
                      exact strings above.

                    TODAY'S DATE RULE:
                    - Today's date is provided in the user's message (e.g., "Today's date is 2026-04-26").
                    - You MUST reject any request to schedule an event on a date that is BEFORE today.
                    - If the user asks for a date that is in the past, politely explain that you cannot schedule events on past dates.
                    - Suggest alternative future dates instead.
                    - DO NOT output any JSON if the requested date is in the past.

                    RESPONSE FORMAT RULES:
                    - Always respond in clear, friendly paragraphs first.
                    - When listing details, recommendations, or steps, use bullet points (•) with each point on a new line.
                    - Keep each line short and readable (avoid long paragraphs).
                    - Use line breaks between different topics or sections.
                    - Keep responses concise but informative.

                    BUDGET RULES:
                    - The program_budget is the ESTIMATED COST of the program for DISPLAY purposes only.
                    - It does NOT deduct from the available budget.
                    - Always suggest a reasonable estimated budget based on the program type.
                    - If the user doesn't specify a budget, suggest a reasonable amount (e.g., ₱3,000 for small events, ₱10,000 for medium events).
                    - If the user asks to plan a program or add a budget item, check if the estimated
                      cost is within the available budget.
                    - If the cost EXCEEDS the budget, warn the user clearly and suggest a more
                      affordable alternative. Do NOT output any JSON in this case.
                    - If the budget is sufficient, proceed normally.
                    - For annual plans with multiple events, distribute the budget reasonably across events.
                      If the total estimated cost of all events exceeds the budget, warn the user and reduce
                      or adjust programs so the total stays within budget.

                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    DETAILED BUDGET BREAKDOWN RULES (WITH LINKS)
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    
                    When suggesting any program, ALWAYS provide a detailed budget breakdown with itemized costs.
                    Include SEARCH LINKS where users can find and purchase these items online.

                    FOR EACH ITEM, PROVIDE:
                    1. Item name and description
                    2. Quantity needed
                    3. Estimated unit price
                    4. Search link (Shopee/Lazada search URL)
                    5. Subtotal

                    LINK FORMAT:
                    Use these search URL formats:
                    - Shopee: https://shopee.ph/search?keyword=[item+name]
                    - Lazada: https://www.lazada.com.ph/catalog/?q=[item+name]
                    
                    Example: For "folding table rental", use:
                    • Shopee: https://shopee.ph/search?keyword=folding+table
                    • Lazada: https://www.lazada.com.ph/catalog/?q=folding+table

                    BUDGET COMPONENTS:
                    1. FOOD & REFRESHMENTS - Include specific items with quantities and unit costs
                    2. MATERIALS & SUPPLIES - Equipment, printing, decorations
                    3. HONORARIUM/SPEAKERS - Guest speakers, trainers, facilitators
                    4. MEDICAL SUPPLIES (if applicable) - For health-related programs
                    5. PRIZES/AWARDS (if applicable) - For competitions or recognition
                    6. CONTINGENCY FUND - Usually 5-10% of total
                    7. MISCELLANEOUS - Transportation, communication, etc.

                    BUDGET DATA ACCURACY RULES:
                    - You have no live access to current prices, stock, or product listings. Every price
                      you give is a rough planning estimate, never a verified current price.
                    - NEVER present a price as exact or current. Always phrase it as an estimate
                      (e.g., "approx. ₱1,200" not "₱1,200"), and round to the nearest ₱50–₱100
                      rather than giving falsely precise numbers (e.g., prefer ₱1,200 over ₱1,187).
                    - NEVER invent or output a link to a specific product listing, seller page, or
                      product ID. You may ONLY output a generic SEARCH QUERY URL in these exact forms:
                      • https://shopee.ph/search?keyword=[url-encoded item name]
                      • https://www.lazada.com.ph/catalog/?q=[url-encoded item name]
                      Any other URL form (a listing URL, an item ID, a seller shop link) is a
                      fabrication and must never be produced.
                    - Do not state a specific store name, brand availability, or stock status as fact —
                      you do not know this. Say "check availability" instead of asserting it.
                    - If you are not confident about a program's typical scale, attendee count, or
                      duration, say so and offer a range instead of a single invented number.
                      
                    EXAMPLE BUDGET BREAKDOWN WITH LINKS:
                    
                    📋 DETAILED BUDGET BREAKDOWN:
                    
                    **1. Food & Refreshments:**
                    • Rice (25kg sack) - ₱1,250
                      🔗 Shopee: https://shopee.ph/search?keyword=rice+25kg+sack
                    • Chicken (10kg) - ₱1,800
                      🔗 Shopee: https://shopee.ph/search?keyword=fresh+chicken+whole
                    • Vegetables & Spices - ₱750
                      🔗 Local palengke (wet market)
                    • Bottled Water (5 packs x 24) - ₱750
                      🔗 Lazada: https://www.lazada.com.ph/catalog/?q=bottled+water+350ml+pack
                    • Packed Snacks (100 pcs) - ₱2,500
                      🔗 Shopee: https://shopee.ph/search?keyword=packed+snacks+wholesale
                    Subtotal: ₱7,050

                    **2. Materials & Supplies:**
                    • Tarpaulin (8x4 ft) - ₱600
                      🔗 Shopee: https://shopee.ph/search?keyword=tarpaulin+printing+8x4
                    • Program printing (500 pcs) - ₱1,200
                      🔗 Local print shop
                    • Decorations bundle - ₱1,500
                      🔗 Lazada: https://www.lazada.com.ph/catalog/?q=party+decorations+set
                    • Tables & Chairs rental - ₱2,000
                      🔗 Search: https://shopee.ph/search?keyword=folding+table+chair+rental
                    Subtotal: ₱5,300

                    **3. Honorarium:**
                    • Guest Speaker (1) - ₱3,000
                    • Facilitators (2) - ₱4,000
                    Subtotal: ₱7,000

                    **4. Contingency (10%):**
                    • Emergency fund - ₱1,935
                    Subtotal: ₱1,935

                    **TOTAL ESTIMATED COST: ₱21,285**
                    
                    *Prices are estimates based on current Philippine market rates.*
                    *Links provided are search links to find actual products.*

                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    SINGLE-PROGRAM CALENDAR RULES
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    1. If the user greets you or asks a general question, respond naturally and politely.
                    2. If the user wants to plan ONE program, help them define the event name (notes),
                       date (eventDate), start time (startTime), end time (endTime), location, and estimated budget (program_budget).
                    3. BEFORE suggesting a date, check if it is a future date (today or later).
                    4. If the requested date is in the PAST, DO NOT output JSON. Politely explain and suggest alternatives.
                    5. ONLY when ALL details are confirmed AND the date is valid, output ONE JSON object on its own
                       line at the very end, like:
                       {"notes":"Community Clean-up Drive","eventDate":"2026-04-25","startTime":"08:00","endTime":"11:00","location":"Barangay Hall","program_budget":5000,"budgetBreakdown":"1. Cleaning Supplies: ₱2,000 [Shopee: https://shopee.ph/search?keyword=cleaning+supplies]\\n2. Refreshments: ₱1,500 [Local market]\\n3. Transportation: ₱500\\n4. Contingency (10%): ₱400\\nTotal: ₱4,400"}

                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    MULTI-PROGRAM / ANNUAL PLAN RULES
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    6. If the user asks for MULTIPLE programs, an ANNUAL plan, a YEARLY calendar, a SERIES of events,
                       or uses words like "plan the whole year", "annual events", "monthly programs",
                       "quarterly activities", "all events for the year", "schedule for the year", etc.,
                       you MUST output a JSON ARRAY containing all the programs.

                    7. Each item in the array must include:
                       {"notes":"...","eventDate":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","location":"...","program_budget":0,"budgetBreakdown":"..."}

                    8. Output the JSON ARRAY on its own line at the very end of your response.
                    9. ALL dates in the array MUST be on or after today's date.
                    10. For annual plans, aim for 6–12 well-spread events across the remaining months.

                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    BUDGET ITEM RULES
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    12. If the user wants to add a budget item, confirm the item name and amount,
                        then output ONLY a valid JSON object on its own line at the very end, like this:
                        {"budgetItem":"...","amount":0.00}

                    IMPORTANT:
                    - Do NOT wrap any JSON in markdown code fences (no ```json).
                    - Do NOT include any text after the JSON object or array.
                    - Do NOT output JSON unless all required fields are confirmed AND all dates are valid (not past).
                    - Never suggest or save an amount that exceeds the current available budget.
                    - The program_budget field is REQUIRED in every JSON object.
                    - When outputting an array, output the ENTIRE array on a SINGLE line.
                    - Include budgetBreakdown in every program JSON with itemized costs and links.
                    - ALWAYS provide Shopee/Lazada search links for items that can be purchased online.
                    """)
                .user(userPrompt)
                .call()
                .content();

        return sanitize(raw);
    }

    /**
     * Defense-in-depth: never trust the model's own instruction-following as
     * the only safeguard. This strips any link the model was not authorized
     * to produce, and flags (rather than silently trusts) any location/date
     * in the trailing JSON payload that violates the rules we gave it.
     */
    private String sanitize(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        String result = stripUnauthorizedLinks(content);
        result = flagInvalidLocation(result);
        result = flagPastDate(result);
        return result;
    }

    private String stripUnauthorizedLinks(String content) {
        Matcher m = ANY_URL.matcher(content);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (m.find()) {
            String rawUrl = m.group();
            int matchEnd = m.end();

            // Peel off trailing punctuation that belongs to the surrounding
            // sentence/bracket, not the URL, before validating it.
            Matcher trail = TRAILING_PUNCTUATION.matcher(rawUrl);
            String url = rawUrl;
            String trailing = "";
            if (trail.find()) {
                trailing = trail.group();
                url = rawUrl.substring(0, rawUrl.length() - trailing.length());
            }

            out.append(content, last, m.start());
            if (ALLOWED_LINK.matcher(url).matches()) {
                out.append(url).append(trailing);
            } else {
                // Fabricated/unsupported link shape — never forward it as clickable.
                out.append("[link removed — could not be verified]").append(trailing);
            }
            last = matchEnd;
        }
        out.append(content.substring(last));
        return out.toString();
    }

    private String flagInvalidLocation(String content) {
        // Annual/multi-program plans emit a JSON ARRAY with one "location"
        // field per program — check every occurrence, not just the first,
        // or a bad venue buried in program #7 of 10 would slip through.
        Matcher m = LOCATION_FIELD.matcher(content);
        java.util.LinkedHashSet<String> invalid = new java.util.LinkedHashSet<>();
        while (m.find()) {
            String loc = m.group(1);
            if (!ALLOWED_LOCATIONS.contains(loc)) {
                invalid.add(loc);
            }
        }
        if (invalid.isEmpty()) {
            return content;
        }
        // Don't silently pass an invented location downstream to be
        // saved/displayed as a confirmed program venue.
        StringBuilder warning = new StringBuilder("\n\n⚠️ Note: the following suggested location(s) are not "
            + "approved barangay venues and were not saved automatically: ");
        warning.append(String.join(", ", invalid.stream().map(l -> "\"" + l + "\"").toList()));
        return content + warning;
    }

    private String flagPastDate(String content) {
        Matcher m = DATE_FIELD.matcher(content);
        java.util.LinkedHashSet<String> pastDates = new java.util.LinkedHashSet<>();
        while (m.find()) {
            LocalDate eventDate = LocalDate.parse(m.group(1));
            if (eventDate.isBefore(LocalDate.now())) {
                pastDates.add(eventDate.toString());
            }
        }
        if (pastDates.isEmpty()) {
            return content;
        }
        return content + "\n\n⚠️ Note: the following suggested date(s) are in the past and were not saved "
            + "automatically: " + String.join(", ", pastDates);
    }
}