package com.example.demo.model;

import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.type.descriptor.jdbc.VarbinaryJdbcType;

@Entity
@Table(name = "admin_users")
public class AdminUser { 

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

   
    private String role;
    private String firstName;
    private String lastName;
    private String gender;
    
    @Column(name = "profile_picture")
    private String profilePicture;


    @Column(name = "birth_date")
    private java.time.LocalDate birthDate;

    private String address;
    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "employee_id", unique = true, insertable = false, updatable = true)
    private String employeeId;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String username;

    private String password;

    @Column(name = "auth_id")
    private UUID authId;

    public String getProfilePicture() { return profilePicture; }
    public void setProfilePicture(String profilePicture) {
        if (profilePicture != null && profilePicture.isBlank()) {
            this.profilePicture = null;
        } else {
            this.profilePicture = profilePicture;
        }
    }

    @Column(name = "employeeAccStats")
    private String empstatus;


    public String getName() { 
        String fullName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        return fullName.isEmpty() ? "Administrator" : fullName; 
    }

    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public UUID getAuthId() { return authId; }
    public void setAuthId(UUID authId) { this.authId = authId; }
    public java.time.LocalDate getBirthDate() {return birthDate;}
    public void setBirthDate(java.time.LocalDate birthDate) { this.birthDate = birthDate;}
    public String getAddress() { return address;}
    public void setAddress(String address) {this.address = address;}
    public String getPhoneNumber() {return phoneNumber;}
    public void setPhoneNumber(String phoneNumber) {this.phoneNumber = phoneNumber;}
    public String getFirstName() { return firstName;}
    public void setFirstName(String firstName) {this.firstName = firstName;}
    public String getLastName() { return lastName;}
    public void setLastName(String lastName) {this.lastName = lastName;}
    public String getGender() {return gender;}
    public void setGender(String gender) {this.gender = gender;}
    public String getEmployeeId() {return employeeId;}
    public void setEmployeeId(String employeeId) {this.employeeId = employeeId;}
    public String getEmpstatus(){return empstatus;}
    public void setEmpstatus(String empstatus) {this.empstatus = empstatus;}
}