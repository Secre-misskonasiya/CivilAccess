package com.example.demo.interceptor;

import com.example.demo.model.AdminUser;
import com.example.demo.repository.AdminUserRepository;
import com.example.demo.services.SystemSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.security.Principal;
import java.util.Map;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    @Autowired private SystemSettingsService settingsService;
    @Autowired private AdminUserRepository adminUserRepository;

    // Maps URL path → section name (must match your saved keys)
    private static final Map<String, String> PATH_TO_SECTION = Map.of(
        "/home",             "Dashboard",
        "/accounts",         "Accounts",
        "/blotter",          "Blotter",
        "/documents",        "Documents",
        "/announcements",    "Announcements",
        "/sos-monitoring",   "SoS_Monitoring",
        "/safety-reports",   "Safety_Reports",
        "/program-planner",  "Program_Planner",
        "/system-settings",  "System_Settings"
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Principal principal = request.getUserPrincipal();
        if (principal == null) return true; // not logged in, let Spring Security handle it

        String path = request.getRequestURI();
        String section = PATH_TO_SECTION.get(path);
        if (section == null) return true; // not a restricted page

        AdminUser admin = adminUserRepository.findByEmail(principal.getName()).orElse(null);
        if (admin == null) return true;

        String role = admin.getRole(); // e.g. "SECRETARY", "TREASURER", "BARANGAY-CAPTAIN"

        // ADMIN always has full access
        if ("ADMIN".equalsIgnoreCase(role)) return true;

        String key = "perm." + role + "." + section;
        String allowed = settingsService.get(key, "true");

        if (!"true".equals(allowed)) {
            response.sendRedirect("/home"); // or "/home"
            return false;
        }

        return true;
    }
}