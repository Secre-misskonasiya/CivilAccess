package com.example.demo.controller;

import com.example.demo.model.BarangayIncome;
import com.example.demo.model.BarangayExpense;
import com.example.demo.model.ProgramBudget;
import com.example.demo.model.AdminUser;
import com.example.demo.model.BudgetAdjustmentLog;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.BarangayIncomeService;
import com.example.demo.services.BarangayExpenseService;
import com.example.demo.services.ProgramBudgetService;
import com.example.demo.services.BudgetAdjustmentLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;
import java.security.Principal;
import java.time.LocalDate;
import java.util.*;

@Controller
@RequestMapping("/finance")
public class FinancialController {

    @Autowired
    private AdminUserServices adminUserService;

    @Autowired
    private BarangayIncomeService incomeService;

    @Autowired
    private BarangayExpenseService expenseService;

    @Autowired
    private ProgramBudgetService budgetService;

    @Autowired
    private BudgetAdjustmentLogService budgetAdjustmentLogService;

    // ========== HELPER METHODS ==========

    private LocalDate getAllTimeStartDate() {
        return LocalDate.of(2020, 1, 1);
    }

    private LocalDate validateDate(LocalDate date) {
        if (date == null) {
            return LocalDate.now();
        }
        if (date.getYear() < 1900 || date.getYear() > 2100) {
            System.err.println("WARNING: Invalid date detected: " + date + " - Replacing with current date");
            return LocalDate.now();
        }
        return date;
    }

    private String generateNextOrNumber() {
        try {
            int currentYear = LocalDate.now().getYear();
            List<BarangayIncome> allIncome = incomeService.getAllIncome();
            int maxNumber = 0;
            for (BarangayIncome inc : allIncome) {
                String or = inc.getOrNumber();
                if (or != null) {
                    String digits = or.replaceAll(".*?(\\d{1,10})$", "$1");
                    try {
                        int num = Integer.parseInt(digits);
                        if (num > maxNumber) maxNumber = num;
                    } catch (NumberFormatException ignored) {}
                }
            }
            return String.format("OR-%d-%05d", currentYear, maxNumber + 1);
        } catch (Exception e) {
            return "OR-" + LocalDate.now().getYear() + "-" + System.currentTimeMillis();
        }
    }

    // ========== MAIN PAGE ==========

    @GetMapping
    public String financePage(Model model, Principal principal, HttpSession session) {
        AdminUser admin = (principal != null) ? adminUserService.getAdminByEmail(principal.getName()) : null;

        String role = "GUEST";
        String username = "User";
        Long adminId = 0L;

        if (admin != null) {
            role = admin.getRole() != null ? admin.getRole() : "GUEST";
            username = admin.getName() != null ? admin.getName() : admin.getUsername();
            adminId = admin.getId() != null ? admin.getId() : 0L;
        }

        model.addAttribute("currentAdminNumericId", adminId);
        model.addAttribute("currentrole", role);
        model.addAttribute("currentUser", username);

        LocalDate startDate = LocalDate.now().withDayOfMonth(1);
        LocalDate endDate = LocalDate.now();
        LocalDate allTimeStart = getAllTimeStartDate();
        LocalDate allTimeEnd = LocalDate.now();

        Double monthIncome    = getMonthIncome();
        Double todayIncome    = getTodayIncome();
        Double monthExpenses  = getTotalExpensesThisMonth(startDate, endDate);
        Double todayExpenses  = getTodayExpenses();
        Double totalBudget    = getTotalBudget();
        Double documentFeeIncome = getDocumentFeeIncome(startDate, endDate);
        Double rentalIncome   = getRentalIncome(startDate, endDate);

        // remainingBudget is now maintained live by the income/expense integration
        // (TOTAL_BUDGET.remainingBudget = amount - actualSpent).
        Double remainingBudget = getTotalRemainingBudget();

        model.addAttribute("monthIncome", monthIncome);
        model.addAttribute("todayIncome", todayIncome);
        model.addAttribute("monthExpenses", monthExpenses);
        model.addAttribute("todayExpenses", todayExpenses);
        model.addAttribute("netSavings", monthIncome - monthExpenses);
        model.addAttribute("totalBudget", totalBudget);
        model.addAttribute("remainingBudget", remainingBudget);
        model.addAttribute("documentFeeIncome", documentFeeIncome);
        model.addAttribute("rentalIncome", rentalIncome);

        model.addAttribute("incomeByType",  getIncomeByType(startDate, endDate));
        model.addAttribute("expenseByType", getExpenseByType(startDate, endDate));

        model.addAttribute("incomeList",         getIncomeList());
        model.addAttribute("expenseList",         getExpenseList());
        model.addAttribute("pendingExpensesList", getPendingExpensesList());
        model.addAttribute("budgetList",          getBudgetList());

        model.addAttribute("archivedIncomeList",   getArchivedIncomeList());
        model.addAttribute("archivedExpenseList",  getArchivedExpenseList());

        model.addAttribute("totalIncomeAll",   getTotalIncomeAll(allTimeStart, allTimeEnd));
        model.addAttribute("totalExpensesAll", getTotalExpensesAll(allTimeStart, allTimeEnd));

        model.addAttribute("budgetLogs", getBudgetLogs());

        return "Finance";
    }

    // ========== SAFE GETTER METHODS ==========

    private Double getMonthIncome() {
        try { return incomeService.getCurrentMonthIncome(); } catch (Exception e) { return 0.0; }
    }
    private Double getTodayIncome() {
        try { return incomeService.getTodayIncome(); } catch (Exception e) { return 0.0; }
    }
    private Double getTodayExpenses() {
        try { return expenseService.getTodayExpenses(); } catch (Exception e) { return 0.0; }
    }
    private Double getTotalBudget() {
        try { return budgetService.getTotalBudget(); } catch (Exception e) { return 0.0; }
    }
    private Double getTotalRemainingBudget() {
        try { return budgetService.getTotalRemainingBudget(); } catch (Exception e) { return 0.0; }
    }
    private Double getTotalExpensesThisMonth(LocalDate start, LocalDate end) {
        try { return expenseService.getTotalExpenses(start, end); } catch (Exception e) { return 0.0; }
    }
    private Double getDocumentFeeIncome(LocalDate start, LocalDate end) {
        try { return incomeService.getTotalDocumentFeeIncome(start, end); } catch (Exception e) { return 0.0; }
    }
    private Double getRentalIncome(LocalDate start, LocalDate end) {
        try { return incomeService.getTotalRentalIncome(start, end); } catch (Exception e) { return 0.0; }
    }
    private Map<String, Double> getIncomeByType(LocalDate start, LocalDate end) {
        try {
            Map<String, Double> r = incomeService.getIncomeSummary(start, end);
            return r != null ? r : Collections.emptyMap();
        } catch (Exception e) { return Collections.emptyMap(); }
    }
    private Map<String, Double> getExpenseByType(LocalDate start, LocalDate end) {
        try {
            Map<String, Double> r = expenseService.getExpenseSummaryByType(start, end);
            return r != null ? r : Collections.emptyMap();
        } catch (Exception e) { return Collections.emptyMap(); }
    }
    private List<BarangayIncome>  getIncomeList()         { try { return incomeService.getActiveIncome(); }         catch (Exception e) { return Collections.emptyList(); } }
    private List<BarangayExpense> getExpenseList()        { try { return expenseService.getActiveExpenses(); }       catch (Exception e) { return Collections.emptyList(); } }
    private List<BarangayExpense> getPendingExpensesList(){ try { return expenseService.getPendingExpenses(); }  catch (Exception e) { return Collections.emptyList(); } }
    private List<ProgramBudget>   getBudgetList()         { try { return budgetService.getAllBudgets(); }         catch (Exception e) { return Collections.emptyList(); } }
    private List<BarangayIncome>  getArchivedIncomeList()   { try { return incomeService.getArchivedIncome(); }   catch (Exception e) { return Collections.emptyList(); } }
    private List<BarangayExpense> getArchivedExpenseList()  { try { return expenseService.getArchivedExpenses(); } catch (Exception e) { return Collections.emptyList(); } }
    private Double getTotalIncomeAll(LocalDate s, LocalDate e)   { try { return incomeService.getTotalIncome(s, e); }   catch (Exception ex) { return 0.0; } }
    private Double getTotalExpensesAll(LocalDate s, LocalDate e) { try { return expenseService.getTotalExpenses(s, e); } catch (Exception ex) { return 0.0; } }
    private List<BudgetAdjustmentLog> getBudgetLogs() {
        try { return budgetAdjustmentLogService.getRecentLogs(); } catch (Exception e) { return Collections.emptyList(); }
    }

    // ========== INCOME MANAGEMENT ==========

    @PostMapping("/income/save")
    public String saveIncome(@ModelAttribute BarangayIncome income,
                             RedirectAttributes redirectAttributes) {
        try {
            income.setIncomeDate(validateDate(income.getIncomeDate()));

            if (income.getAmount() == null || income.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Amount must be greater than 0");
                return "redirect:/finance#income";
            }
            if (income.getSourceName() == null || income.getSourceName().trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "Source name is required");
                return "redirect:/finance#income";
            }

            income.setOrNumber(generateNextOrNumber());

            // createIncome automatically calls applyIncomeToBudget — budget grows here.
            incomeService.createIncome(income);
            redirectAttributes.addFlashAttribute("success",
                "Income recorded successfully! OR #: " + income.getOrNumber());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error saving income: " + e.getMessage());
        }
        return "redirect:/finance#income";
    }

    @PostMapping("/income/update")
    public String updateIncome(@ModelAttribute BarangayIncome income,
                               RedirectAttributes redirectAttributes) {
        try {
            income.setIncomeDate(validateDate(income.getIncomeDate()));

            if (income.getAmount() == null || income.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Amount must be greater than 0");
                return "redirect:/finance#income";
            }
            // updateIncome handles budget rebalancing internally.
            incomeService.updateIncome(income.getId(), income);
            redirectAttributes.addFlashAttribute("success", "Income updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error updating income: " + e.getMessage());
        }
        return "redirect:/finance#income";
    }

    @GetMapping("/income/delete/{id}")
    public String deleteIncome(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            // deleteIncome reverses the amount from the budget pool automatically.
            incomeService.deleteIncome(id);
            redirectAttributes.addFlashAttribute("success", "Income deleted successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error deleting income: " + e.getMessage());
        }
        return "redirect:/finance#income";
    }

    // ========== EXPENSE MANAGEMENT ==========

    @PostMapping("/expenses/save")
    public String saveExpense(@ModelAttribute BarangayExpense expense,
                              RedirectAttributes redirectAttributes) {
        try {
            expense.setExpenseDate(validateDate(expense.getExpenseDate()));

            if (expense.getAmount() == null || expense.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Amount must be greater than 0");
                return "redirect:/finance#expenses";
            }
            if (expense.getDescription() == null || expense.getDescription().trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "Description is required");
                return "redirect:/finance#expenses";
            }
            expenseService.createExpense(expense);
            redirectAttributes.addFlashAttribute("success", "Expense recorded successfully! Status: PENDING");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error saving expense: " + e.getMessage());
        }
        return "redirect:/finance#expenses";
    }

    @PostMapping("/expenses/update")
    public String updateExpense(@ModelAttribute BarangayExpense expense,
                                RedirectAttributes redirectAttributes) {
        try {
            expense.setExpenseDate(validateDate(expense.getExpenseDate()));

            if (expense.getAmount() == null || expense.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Amount must be greater than 0");
                return "redirect:/finance#expenses";
            }
            // updateExpense rebalances budget if already APPROVED.
            expenseService.updateExpense(expense.getId(), expense);
            redirectAttributes.addFlashAttribute("success", "Expense updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error updating expense: " + e.getMessage());
        }
        return "redirect:/finance#expenses";
    }

    @GetMapping("/expenses/delete/{id}")
    public String deleteExpense(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            // deleteExpense reverses budget if expense was APPROVED.
            expenseService.deleteExpense(id);
            redirectAttributes.addFlashAttribute("success", "Expense deleted successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error deleting expense: " + e.getMessage());
        }
        return "redirect:/finance#expenses";
    }

    /**
     * Approve an expense.
     * Budget deduction now happens inside approveExpense() — no separate disburse step.
     */
    @GetMapping("/expenses/approve/{id}")
    public String approveExpense(@PathVariable Long id,
                                 @RequestParam Long approvedBy,
                                 RedirectAttributes redirectAttributes) {
        try {
            expenseService.approveExpense(id, approvedBy);
            redirectAttributes.addFlashAttribute("success",
                "Expense approved! Budget has been updated.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error approving expense: " + e.getMessage());
        }
        return "redirect:/finance#expenses";
    }

    // ========== ARCHIVE / UNARCHIVE — TREASURER ONLY ==========

    private boolean isTreasurer(Principal principal) {
        if (principal == null) return false;
        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        return admin != null && "TREASURER".equalsIgnoreCase(admin.getRole());
    }

    @GetMapping("/income/archive/{id}")
    public String archiveIncome(@PathVariable Long id,
                                Principal principal,
                                RedirectAttributes redirectAttributes) {
        if (!isTreasurer(principal)) {
            redirectAttributes.addFlashAttribute("error", "Only the Treasurer can archive records.");
            return "redirect:/finance#income";
        }
        try {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            incomeService.archiveIncome(id, admin.getId());
            redirectAttributes.addFlashAttribute("success", "Income record archived successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error archiving income: " + e.getMessage());
        }
        return "redirect:/finance#income";
    }

    @GetMapping("/income/unarchive/{id}")
    public String unarchiveIncome(@PathVariable Long id,
                                  Principal principal,
                                  RedirectAttributes redirectAttributes) {
        if (!isTreasurer(principal)) {
            redirectAttributes.addFlashAttribute("error", "Only the Treasurer can restore archived records.");
            return "redirect:/finance#archive";
        }
        try {
            incomeService.unarchiveIncome(id);
            redirectAttributes.addFlashAttribute("success", "Income record restored successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error restoring income: " + e.getMessage());
        }
        return "redirect:/finance#archive";
    }

    @GetMapping("/expenses/archive/{id}")
    public String archiveExpense(@PathVariable Long id,
                                 Principal principal,
                                 RedirectAttributes redirectAttributes) {
        if (!isTreasurer(principal)) {
            redirectAttributes.addFlashAttribute("error", "Only the Treasurer can archive records.");
            return "redirect:/finance#expenses";
        }
        try {
            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            expenseService.archiveExpense(id, admin.getId());
            redirectAttributes.addFlashAttribute("success", "Expense record archived successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error archiving expense: " + e.getMessage());
        }
        return "redirect:/finance#expenses";
    }

    @GetMapping("/expenses/unarchive/{id}")
    public String unarchiveExpense(@PathVariable Long id,
                                   Principal principal,
                                   RedirectAttributes redirectAttributes) {
        if (!isTreasurer(principal)) {
            redirectAttributes.addFlashAttribute("error", "Only the Treasurer can restore archived records.");
            return "redirect:/finance#archive";
        }
        try {
            expenseService.unarchiveExpense(id);
            redirectAttributes.addFlashAttribute("success", "Expense record restored successfully.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error restoring expense: " + e.getMessage());
        }
        return "redirect:/finance#archive";
    }

    // ========== BUDGET MANAGEMENT ==========

    @PostMapping("/budget/save")
    public String saveBudget(@ModelAttribute ProgramBudget budget,
                             RedirectAttributes redirectAttributes) {
        try {
            if (budget.getAmount() == null || budget.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Budget amount must be greater than 0");
                return "redirect:/finance#budget";
            }
            if (budget.getBudgetItem() == null || budget.getBudgetItem().trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "Budget item name is required");
                return "redirect:/finance#budget";
            }
            budgetService.saveManualEntry(budget);
            redirectAttributes.addFlashAttribute("success", "Budget item saved successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error saving budget: " + e.getMessage());
        }
        return "redirect:/finance#budget";
    }

    @PostMapping("/budget/update")
    public String updateBudget(@ModelAttribute ProgramBudget budget,
                               RedirectAttributes redirectAttributes) {
        try {
            if (budget.getAmount() == null || budget.getAmount() <= 0) {
                redirectAttributes.addFlashAttribute("error", "Budget amount must be greater than 0");
                return "redirect:/finance#budget";
            }
            budgetService.updateBudgetItem(budget.getId(), budget);
            redirectAttributes.addFlashAttribute("success", "Budget updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error updating budget: " + e.getMessage());
        }
        return "redirect:/finance#budget";
    }

    @GetMapping("/budget/delete/{id}")
    public String deleteBudget(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            budgetService.deleteBudget(id);
            redirectAttributes.addFlashAttribute("success", "Budget deleted successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error deleting budget: " + e.getMessage());
        }
        return "redirect:/finance#budget";
    }

    // ========== BUDGET TOTAL UPDATE ==========

    @PostMapping("/budget/update-total")
    public String updateTotalBudget(@RequestParam Double amount,
                                    @RequestParam Double adjustmentAmount,
                                    @RequestParam String adjustmentType,
                                    @RequestParam String reason,
                                    Principal principal,
                                    RedirectAttributes redirectAttributes) {
        try {
            if (amount == null || amount < 0) {
                redirectAttributes.addFlashAttribute("error", "Invalid budget amount.");
                return "redirect:/finance#budget";
            }
            if (reason == null || reason.trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "A reason is required for budget adjustments.");
                return "redirect:/finance#budget";
            }

            List<ProgramBudget> all = budgetService.getAllBudgets();
            ProgramBudget totalBudgetRecord = all.stream()
                .filter(b -> "TOTAL_BUDGET".equals(b.getBudgetItem()))
                .findFirst()
                .orElse(null);

            if (totalBudgetRecord != null) {
                totalBudgetRecord.setAmount(amount);
                budgetService.updateBudgetItem(totalBudgetRecord.getId(), totalBudgetRecord);
            } else {
                ProgramBudget newBudget = new ProgramBudget();
                newBudget.setProgramId(0L);
                newBudget.setBudgetItem("TOTAL_BUDGET");
                newBudget.setAmount(amount);
                budgetService.saveManualEntry(newBudget);
            }

            AdminUser admin = (principal != null) ? adminUserService.getAdminByEmail(principal.getName()) : null;
            BudgetAdjustmentLog.AdjustmentType type = "increase".equalsIgnoreCase(adjustmentType)
                ? BudgetAdjustmentLog.AdjustmentType.INCREASE
                : BudgetAdjustmentLog.AdjustmentType.DECREASE;

            budgetAdjustmentLogService.logAdjustment(
                type,
                adjustmentAmount,
                reason.trim(),
                admin != null ? admin.getId() : 0L,
                admin != null ? (admin.getName() != null ? admin.getName() : admin.getUsername()) : "Unknown"
            );

            redirectAttributes.addFlashAttribute("success", "Budget updated successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Error updating budget: " + e.getMessage());
        }
        return "redirect:/finance#budget";
    }

    // ========== CSV EXPORT ENDPOINTS ==========

    @GetMapping("/export/income")
    public void exportIncomeCsv(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {

        startDate = validateDate(startDate);
        endDate   = validateDate(endDate);

        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"income_" + startDate + "_to_" + endDate + ".csv\"");

        java.io.PrintWriter writer = response.getWriter();
        writer.println("Date,OR Number,Source / Payer,Type,Amount");

        try {
            List<BarangayIncome> list = incomeService.getIncomeByDateRange(startDate, endDate);
            for (BarangayIncome inc : list) {
                String date   = inc.getIncomeDate()  != null ? inc.getIncomeDate().toString()         : "";
                String or     = inc.getOrNumber()    != null ? inc.getOrNumber()                      : "";
                String source = inc.getSourceName()  != null ? "\"" + inc.getSourceName().replace("\"","\"\"") + "\"" : "";
                String type   = inc.getIncomeType()  != null ? inc.getIncomeType().toString()         : "";
                String amount = inc.getAmount()      != null ? String.format("%.2f", inc.getAmount()) : "0.00";
                writer.println(date + "," + or + "," + source + "," + type + "," + amount);
            }
        } catch (Exception e) {
            writer.println("Error generating report: " + e.getMessage());
        }
        writer.flush();
    }

    @GetMapping("/export/expenses")
    public void exportExpensesCsv(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {

        startDate = validateDate(startDate);
        endDate   = validateDate(endDate);

        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition",
            "attachment; filename=\"expenses_" + startDate + "_to_" + endDate + ".csv\"");

        java.io.PrintWriter writer = response.getWriter();
        writer.println("Date,Description,Type,Fund Source,Payee,Receipt #,Amount,Status");

        try {
            List<BarangayExpense> list = expenseService.getExpensesByDateRange(startDate, endDate);
            for (BarangayExpense exp : list) {
                String date    = exp.getExpenseDate()   != null ? exp.getExpenseDate().toString()           : "";
                String desc    = exp.getDescription()   != null ? "\"" + exp.getDescription().replace("\"","\"\"") + "\"" : "";
                String type    = exp.getExpenseType()   != null ? exp.getExpenseType().toString()           : "";
                String fund    = exp.getFundSource()    != null ? exp.getFundSource().toString()            : "";
                String payee   = exp.getPayee()         != null ? "\"" + exp.getPayee().replace("\"","\"\"") + "\"" : "";
                String receipt = exp.getReceiptNumber() != null ? exp.getReceiptNumber()                    : "";
                String amount  = exp.getAmount()        != null ? String.format("%.2f", exp.getAmount())    : "0.00";
                String status  = exp.getStatus()        != null ? exp.getStatus().toString()                : "";
                writer.println(date + "," + desc + "," + type + "," + fund + "," + payee + "," + receipt + "," + amount + "," + status);
            }
        } catch (Exception e) {
            writer.println("Error generating report: " + e.getMessage());
        }
        writer.flush();
    }

    // ========== PDF DATA API ENDPOINT ==========

    @GetMapping("/reports/pdf-data")
    @ResponseBody
    public Map<String, Object> getReportPdfData(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Map<String, Object> response = new HashMap<>();

        try {
            startDate = validateDate(startDate);
            endDate   = validateDate(endDate);
            if (startDate.isAfter(endDate)) {
                LocalDate temp = startDate; startDate = endDate; endDate = temp;
            }

            List<BarangayIncome>  incomeList  = incomeService.getIncomeByDateRange(startDate, endDate);
            List<BarangayExpense> expenseList = expenseService.getExpensesByDateRange(startDate, endDate);
            List<ProgramBudget>   budgetList  = budgetService.getAllBudgets();

            Double totalIncome   = incomeService.getTotalIncome(startDate, endDate);
            Double totalExpenses = expenseService.getTotalExpenses(startDate, endDate);
            Double totalBudget   = budgetService.getTotalBudget();
            Double remaining     = budgetService.getTotalRemainingBudget();

            totalIncome   = totalIncome   != null ? totalIncome   : 0.0;
            totalExpenses = totalExpenses != null ? totalExpenses : 0.0;
            totalBudget   = totalBudget   != null ? totalBudget   : 0.0;
            remaining     = remaining     != null ? remaining     : 0.0;

            List<Map<String, Object>> incomeData = new ArrayList<>();
            for (BarangayIncome inc : incomeList) {
                Map<String, Object> item = new HashMap<>();
                item.put("incomeDate",  inc.getIncomeDate()  != null ? inc.getIncomeDate().toString()  : "");
                item.put("orNumber",    inc.getOrNumber()    != null ? inc.getOrNumber()               : "N/A");
                item.put("sourceName",  inc.getSourceName()  != null ? inc.getSourceName()             : "");
                item.put("incomeType",  inc.getIncomeType()  != null ? inc.getIncomeType().toString()  : "DOCUMENT_FEE");
                item.put("amount",      inc.getAmount()      != null ? inc.getAmount()                 : 0);
                incomeData.add(item);
            }

            List<Map<String, Object>> expenseData = new ArrayList<>();
            for (BarangayExpense exp : expenseList) {
                Map<String, Object> item = new HashMap<>();
                item.put("expenseDate",  exp.getExpenseDate()  != null ? exp.getExpenseDate().toString()  : "");
                item.put("description",  exp.getDescription()  != null ? exp.getDescription()             : "");
                item.put("expenseType",  exp.getExpenseType()  != null ? exp.getExpenseType().toString()  : "OTHER");
                item.put("amount",       exp.getAmount()       != null ? exp.getAmount()                  : 0);
                item.put("status",       exp.getStatus()       != null ? exp.getStatus().toString()       : "PENDING");
                expenseData.add(item);
            }

            List<Map<String, Object>> budgetData = new ArrayList<>();
            for (ProgramBudget bud : budgetList) {
                Map<String, Object> item = new HashMap<>();
                item.put("programId",       bud.getProgramId()       != null ? bud.getProgramId()       : 0);
                item.put("budgetItem",      bud.getBudgetItem()      != null ? bud.getBudgetItem()      : "");
                item.put("amount",          bud.getAmount()          != null ? bud.getAmount()          : 0);
                item.put("actualSpent",     bud.getActualSpent()     != null ? bud.getActualSpent()     : 0);
                item.put("remainingBudget", bud.getRemainingBudget() != null ? bud.getRemainingBudget() : 0);
                budgetData.add(item);
            }

            response.put("success",         true);
            response.put("startDate",        startDate.toString());
            response.put("endDate",          endDate.toString());
            response.put("totalIncome",      totalIncome);
            response.put("totalExpenses",    totalExpenses);
            response.put("totalBudget",      totalBudget);
            response.put("remainingBudget",  remaining);
            response.put("netSavings",       totalIncome - totalExpenses);
            response.put("incomeList",       incomeData);
            response.put("expenseList",      expenseData);
            response.put("budgetList",       budgetData);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("error",   e.getMessage());
        }

        return response;
    }
}