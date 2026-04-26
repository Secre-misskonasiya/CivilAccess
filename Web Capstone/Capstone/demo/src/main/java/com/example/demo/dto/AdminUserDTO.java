package com.example.demo.dto;

import java.time.LocalDate;

public record AdminUserDTO(
    Long id,
    String username,
    String employeeId,
    String firstName,
    String lastName,
    String gender,
    LocalDate birthDate, // Ensure this is LocalDate
    String phoneNumber,
    String role,
    String empstatus,
    String email,
    String address       // Must be the 12th argument
) {}