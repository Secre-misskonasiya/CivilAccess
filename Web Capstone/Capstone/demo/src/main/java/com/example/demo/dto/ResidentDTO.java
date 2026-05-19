package com.example.demo.dto;

import java.time.LocalDate;
import java.util.UUID;

public record ResidentDTO(
    UUID id,
    String residentId,
    String firstName,
    String lastName,
    String gender,
    LocalDate birthDate,
    String mobileNumber,
    String email,
    String address,
    String status,
    String selfie,
    String validId,
    String barangayIndigency,
    String account_status,
    String avatar_url,
    String pwdImage,
    String seniorImage,
    boolean isPwd,
    boolean isSenior
) {}