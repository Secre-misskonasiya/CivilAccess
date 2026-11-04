package com.example.demo.dto;

import java.time.LocalDate;

public record AdminUserDTO(
    Long id,
    String username,
    String employeeId,
    String firstName,
    String lastName,
    String gender,
    LocalDate birthDate, 
    String phoneNumber,
    String role,
    String empstatus,
    String email,
    String address,
    String profilePicture
) {}