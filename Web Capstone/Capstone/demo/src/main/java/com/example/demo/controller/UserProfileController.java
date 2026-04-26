package com.example.demo.controller;

import com.example.demo.dto.AdminUserDTO;
import com.example.demo.model.AdminUser;
import com.example.demo.services.AdminUserServices;
import com.example.demo.services.ActivityLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.security.Principal;
import java.util.List;

@Controller
public class UserProfileController {

    @Autowired
    private AdminUserServices adminUserService;
    
    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping("/user-profile")
    public String UserProfilePage(Principal principal, Model model) {
        AdminUser currentAdmin = adminUserService.getAdminByEmail(principal.getName());
        
        List<AdminUserDTO> allAdmins = adminUserService.getAllAdminsForTable();

        List<String> emails = new java.util.ArrayList<>();
        List<String> usernames = new java.util.ArrayList<>();
        List<String> phones = new java.util.ArrayList<>();
        
        for (AdminUserDTO a : allAdmins) {
            if (a.email() != null && !a.email().equalsIgnoreCase(currentAdmin.getEmail())) {
                emails.add(a.email());
            }
            if (a.username() != null && !a.username().equalsIgnoreCase(currentAdmin.getUsername())) {
                usernames.add(a.username());
            }
            if (a.phoneNumber() != null && !a.phoneNumber().equals(currentAdmin.getPhoneNumber())) {
                phones.add(a.phoneNumber());
            }
        }

        String firstName = currentAdmin.getFirstName() != null ? currentAdmin.getFirstName() : "";
        String lastName = currentAdmin.getLastName() != null ? currentAdmin.getLastName() : "";
        String fullname = (firstName + " " + lastName).trim();
        if (fullname.isEmpty()) {
            fullname = currentAdmin.getUsername();
        }

        String birthDateStr = "";
        if (currentAdmin.getBirthDate() != null) {
            birthDateStr = currentAdmin.getBirthDate().toString();
        }

        model.addAttribute("emailList", emails);
        model.addAttribute("usernameList", usernames);
        model.addAttribute("phoneList", phones);
        model.addAttribute("newAdmin", new AdminUser());
        model.addAttribute("admins", allAdmins);
        model.addAttribute("currentrole", currentAdmin.getRole());
        
        model.addAttribute("currentUser", fullname);
        model.addAttribute("currentAdminFirstName", currentAdmin.getFirstName());
        model.addAttribute("currentAdminLastName", currentAdmin.getLastName());
        model.addAttribute("currentAdminUsername", currentAdmin.getUsername());
        model.addAttribute("currentAdminEmail", currentAdmin.getEmail());
        model.addAttribute("currentAdminAddress", currentAdmin.getAddress());
        model.addAttribute("currentAdminGender", currentAdmin.getGender());
        model.addAttribute("currentAdminBirthDate", birthDateStr);
        model.addAttribute("currentAdminPhone", currentAdmin.getPhoneNumber());
        model.addAttribute("currentAdminID", currentAdmin.getEmployeeId());
        model.addAttribute("currentAdminRole", currentAdmin.getRole());
        model.addAttribute("currentAdminNumericId", currentAdmin.getId());
        model.addAttribute("currentAdminStatus", currentAdmin.getEmpstatus());
        
        String profilePicUrl = currentAdmin.getProfilePicture();
        if (profilePicUrl != null && !profilePicUrl.isBlank()) {
            model.addAttribute("currentAdminProfilePicture", profilePicUrl);
        }

        return "UserProfile";
    }
}