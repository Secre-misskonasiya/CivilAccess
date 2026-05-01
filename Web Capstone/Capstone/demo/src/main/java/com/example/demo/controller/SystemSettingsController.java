package com.example.demo.controller;

import com.example.demo.model.AdminUser;
import com.example.demo.repository.AdminUserRepository;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ActivityLogService;
import com.example.demo.services.EmailService;
import com.example.demo.services.SystemSettingsService;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;
import org.springframework.stereotype.Controller;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@Controller
public class SystemSettingsController {

    @Autowired private SystemSettingsService settingsService;
    @Autowired private EmailService emailService;
    @Autowired private AdminUserServices adminUserService;
    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private ActivityLogService activityLogService;

    @GetMapping("/system-settings")
    public String settingsPage(Principal principal, Model model) {
        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        if (admin != null) {
            model.addAttribute("currentUser",    admin.getName());
            model.addAttribute("currentrole",    admin.getRole());
            model.addAttribute("currentstatus",  admin.getEmpstatus());
            model.addAttribute("currentusername", admin.getUsername());
        }

        String[] roles    = {"SECRETARY", "TREASURER", "BARANGAY-CAPTAIN"};
        String[] sections = {"Dashboard","Accounts","Blotter","Documents","Announcements",
                             "SoS_Monitoring","Safety_Reports","Program_Planner","System_Settings"};
        for (String role : roles) {
            for (String section : sections) {
                String key = "perm." + role + "." + section;
                if (settingsService.get(key, null) == null) {
                    settingsService.set(key, "true");
                }
            }
        }

        model.addAttribute("settings", settingsService.getAllAsMap());
        return "System-Settings";
    }

    @PostMapping("/api/settings/notifications")
    @ResponseBody
    public ResponseEntity<String> saveNotifications(
            @RequestBody Map<String, String> body,
            Principal principal,
            HttpServletRequest request) {

        settingsService.saveAll(body);

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        activityLogService.log(
            admin.getName(), admin.getRole(), "UPDATED", "System Settings",
            "Updated notification settings",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok("Saved");
    }

    @PostMapping("/api/settings/permissions")
    @ResponseBody
    public ResponseEntity<String> savePermissions(
            @RequestBody Map<String, String> body,
            Principal principal,
            HttpServletRequest request) {

        settingsService.saveAll(body);

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        activityLogService.log(
            admin.getName(), admin.getRole(), "UPDATED", "System Settings",
            "Updated role permissions",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok("Saved");
    }

    @PostMapping("/api/settings/test-alert")
    @ResponseBody
    public ResponseEntity<String> testAlert(
            Principal principal,
            HttpServletRequest request) {

        List<AdminUser> admins = adminUserRepository.findAll();
        int sent = 0;
        for (AdminUser admin : admins) {
            if (!"Archived".equalsIgnoreCase(admin.getEmpstatus()) && admin.getEmail() != null) {
                try {
                    emailService.sendTestAlert(admin.getEmail(), admin.getName());
                    sent++;
                } catch (Exception e) {
                    // continue
                }
            }
        }

        AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
        activityLogService.log(
            admin.getName(), admin.getRole(), "CREATED", "System Settings",
            "Sent test emergency alert to " + sent + " admin(s)",
            request.getRemoteAddr(), "Success"
        );

        return ResponseEntity.ok("Test alert sent to " + sent + " admin(s).");
    }

    @PostMapping("/api/settings/backup")
    public ResponseEntity<Resource> backupDatabase(
            @Value("${spring.datasource.url}") String dbUrl,
            @Value("${spring.datasource.username}") String dbUser,
            @Value("${spring.datasource.password}") String dbPass,
            Principal principal,
            HttpServletRequest request) {

        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename  = "barangay-backup-" + timestamp + ".sql";
            File backupFile  = File.createTempFile("backup_", ".sql");

            try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass);
                 PrintWriter pw  = new PrintWriter(new FileWriter(backupFile))) {

                pw.println("-- Barangay Database Backup (Supabase/PostgreSQL)");
                pw.println("-- Generated: " + LocalDateTime.now());
                pw.println();

                DatabaseMetaData meta   = conn.getMetaData();
                ResultSet tables        = meta.getTables(null, "public", "%", new String[]{"TABLE"});

                while (tables.next()) {
                    String tableName = tables.getString("TABLE_NAME");
                    pw.println("\n-- Table: " + tableName);

                    Statement stmt = conn.createStatement();
                    ResultSet rows = stmt.executeQuery("SELECT * FROM \"" + tableName + "\"");
                    ResultSetMetaData rsMeta = rows.getMetaData();
                    int colCount = rsMeta.getColumnCount();

                    StringBuilder cols = new StringBuilder();
                    for (int i = 1; i <= colCount; i++) {
                        cols.append("\"").append(rsMeta.getColumnName(i)).append("\"");
                        if (i < colCount) cols.append(", ");
                    }

                    while (rows.next()) {
                        StringBuilder insert = new StringBuilder(
                            "INSERT INTO \"" + tableName + "\" (" + cols + ") VALUES ("
                        );
                        for (int i = 1; i <= colCount; i++) {
                            String val = rows.getString(i);
                            if (val == null) insert.append("NULL");
                            else insert.append("'").append(val.replace("'", "''")).append("'");
                            if (i < colCount) insert.append(", ");
                        }
                        insert.append(") ON CONFLICT DO NOTHING;");
                        pw.println(insert);
                    }
                    pw.println();
                }
            }

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            activityLogService.log(
                admin.getName(), admin.getRole(), "CREATED", "System Settings",
                "Generated database backup: " + filename,
                request.getRemoteAddr(), "Success"
            );

            Resource resource = new FileSystemResource(backupFile);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/octet-stream"))
                .body(resource);

        } catch (Exception e) {
            e.printStackTrace();

            AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            activityLogService.log(
                admin != null ? admin.getName() : principal.getName(),
                admin != null ? admin.getRole() : "ADMIN",
                "CREATED", "System Settings",
                "Database backup failed: " + e.getMessage(),
                request.getRemoteAddr(), "Failed"
            );

            return ResponseEntity.status(500).build();
        }
    }
}