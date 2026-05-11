package com.example.demo.services;

import com.example.demo.dto.CensusRecordDTO;
import com.example.demo.dto.CensusView;
import com.example.demo.model.CensusRecord;
import com.example.demo.repository.CensusRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CensusRecordService {

    @Autowired
    private CensusRecordRepository censusRepo;

    // ── Read ──────────────────────────────────────────────────────

    public List<CensusRecordDTO> getAllActiveForTable() {
        return censusRepo.findAllActiveOptimized();
    }

    public List<CensusRecordDTO> getAllArchivedForTable() {
        return censusRepo.findAllArchivedOptimized();
    }

    public CensusRecord getById(@NonNull Long id) {
        return censusRepo.findById(id).orElse(null);
    }

    /** Returns CensusView projections — no full entity load. */
    public List<CensusView> search(String query) {
        return censusRepo.searchActive(query == null ? "" : query.trim());
    }

    public List<CensusRecordDTO> filterByStatus(String status) {
        return censusRepo.findByStatus(status.toUpperCase());
    }

    // ── Validation helpers ────────────────────────────────────────

    public List<String> getAllMobileNumbers() {
        return censusRepo.findAllMobileNumbers();
    }

    public List<String> extractMobileNumbers(List<CensusRecordDTO> dtos) {
        return dtos.stream()
            .map(CensusRecordDTO::getMobile)
            .filter(m -> m != null && !m.isBlank())
            .collect(Collectors.toList());
    }

    /**
     * Serializes active + archived DTOs to JSON for the Thymeleaf
     * censusJson model attribute (client-side seed).
     * Dates are written as ISO strings ("2003-03-02"), not arrays.
     */
    public String buildCensusJson(List<CensusRecordDTO> active,
                                  List<CensusRecordDTO> archived) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
            List<CensusRecordDTO> all = new ArrayList<>(active);
            all.addAll(archived);
            return mapper.writeValueAsString(all);
        } catch (Exception e) {
            return "[]";
        }
    }

    // ── Write ─────────────────────────────────────────────────────

    @Transactional
    public CensusRecord save(@NonNull CensusRecord record) {
        record.setCensusStatus(deriveStatus(record));
        return censusRepo.save(record);
    }

    @Transactional
    public void archive(@NonNull Long id) {
        censusRepo.archiveById(id);
    }

    @Transactional
    public void restore(@NonNull Long id) {
        censusRepo.restoreById(id);
    }

    // ── Business logic ────────────────────────────────────────────

    private String deriveStatus(CensusRecord r) {
        if ("flagged".equalsIgnoreCase(r.getAccountStatus())) return "FLAGGED";

        boolean s1 = r.getFirstName()   != null && !r.getFirstName().isBlank()
                  && r.getLastName()    != null && !r.getLastName().isBlank()
                  && r.getDateOfBirth() != null
                  && r.getAddress()     != null && !r.getAddress().isBlank();

        boolean s2 = r.getHouseholdRelation() != null && !r.getHouseholdRelation().isBlank()
                  && r.getHomeOwnership()      != null && !r.getHomeOwnership().isBlank();

        boolean s3 = r.getEmergencyContactName()    != null && !r.getEmergencyContactName().isBlank()
                  && r.getEmergencyContactNumber()  != null && !r.getEmergencyContactNumber().isBlank();

        if (s1 && s2 && s3) return "COMPLETE";
        if (s1)             return "INCOMPLETE";
        return "PENDING";
    }

    public int sectionsComplete(@NonNull CensusRecord r) {
        boolean s1 = r.getFirstName() != null && r.getDateOfBirth() != null && r.getAddress() != null;
        boolean s2 = r.getHouseholdRelation() != null && r.getHomeOwnership() != null;
        boolean s3 = r.getEmergencyContactName() != null && r.getEmergencyContactNumber() != null;
        if (s1 && s2 && s3) return 3;
        if (s1 && s2)       return 2;
        if (s1)             return 1;
        return 0;
    }
}