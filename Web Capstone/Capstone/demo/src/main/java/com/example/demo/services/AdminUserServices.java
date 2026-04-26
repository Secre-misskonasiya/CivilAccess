package com.example.demo.services;

import com.example.demo.dto.AdminUserDTO;
import com.example.demo.model.AdminUser;
import com.example.demo.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import org.springframework.lang.NonNull;

@Service
public class AdminUserServices {

    @Autowired
    private AdminUserRepository adminUserRepository;

    // 1. Fetch and Map to DTO for the Table
    public List<AdminUserDTO> getAllAdminsForTable() {
            return adminUserRepository.findAllAdminsOptimized();
    }

    // 2. Helper methods for Controller validation lists
    public List<String> extractEmails(List<AdminUserDTO> dtos) {
        return dtos.stream().map(AdminUserDTO::email).toList();
    }

    public List<String> extractUsernames(List<AdminUserDTO> dtos) {
        return dtos.stream().map(AdminUserDTO::username).toList();
    }

    public List<String> extractPhoneNumbers(List<AdminUserDTO> dtos) {
        return dtos.stream().map(AdminUserDTO::phoneNumber).toList();
    }

    // 3. Existing logic for saving and validation
    public AdminUser saveAdmin(AdminUser admin) {
        if (admin.getId() == null && (admin.getEmployeeId() == null || 
            admin.getEmployeeId().trim().isEmpty() || 
            admin.getEmployeeId().equals("Auto-generated"))) {
            admin.setEmployeeId(null);
        }   
        return adminUserRepository.save(admin);
    }

    public boolean existsByEmail(String email) {
        return adminUserRepository.existsByEmail(email);
    }

    public boolean existsByUsername(String username) {
        return adminUserRepository.existsByUsername(username);
    }

    // 4. Standard CRUD methods
    public AdminUser getAdminById(@NonNull Long id) { 
        return adminUserRepository.findById(id).orElse(null); 
    }
    
    public List<AdminUser> getAllAdmins() { 
        return adminUserRepository.findAll(); 
    }
    
    public void deleteAdmin(@NonNull Long id) { 
        adminUserRepository.deleteById(id); 
    }
    
    public AdminUser getAdminByEmail(String email) { 
        return adminUserRepository.findByEmail(email).orElse(null); 
    }
}