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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
        return censusRepo.findAllActiveOptimized().stream()
            .filter(dto -> status.equalsIgnoreCase(dto.getCensusStatus()))
            .collect(Collectors.toList());
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

    public List<CensusRecordDTO> getHouseholdMembers(String householdId) {
        if (householdId == null || householdId.isBlank()) return List.of();
        return censusRepo.findByHouseholdId(householdId);
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

    public String generateNewHouseholdId() {
        String max = censusRepo.findMaxHouseholdId();
        if (max == null) return "HH-0001";
        int num = Integer.parseInt(max.substring(3)) + 1;
        return String.format("HH-%04d", num);
    }

    // ── Write ─────────────────────────────────────────────────────

    // CensusRecordService.save() — generate it before saving
    @Transactional
    public CensusRecord save(@NonNull CensusRecord record) {
        if (record.getId() == null) {                        // new record only
            record.setRecordId("2026-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        if (record.getHouseholdId() == null || record.getHouseholdId().isBlank()) {
            record.setHouseholdId(generateNewHouseholdId());
        }
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
        if ("flagged".equalsIgnoreCase(r.getAccountStatus()))    return "FLAGGED";
        if ("unverified".equalsIgnoreCase(r.getAccountStatus())) return "INCOMPLETE";

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
    
    public String getDemographicSummary() {
    try {
        List<CensusRecord> all = censusRepo.findAll();
        
        long totalResidents = all.size();
        
        if (totalResidents == 0) {
            return "CENSUS STATUS: No census records collected yet. " +
                   "The barangay needs a census to gather demographic data. " +
                   "Suggest a Community Census Drive as the first program.";
        }
        
        long male = all.stream().filter(r -> r != null && "Male".equalsIgnoreCase(r.getGender())).count();
        long female = all.stream().filter(r -> r != null && "Female".equalsIgnoreCase(r.getGender())).count();
        long seniors = all.stream().filter(r -> r != null && r.isSeniorCitizen() != null && r.isSeniorCitizen()).count();
        long pwd = all.stream().filter(r -> r != null && r.isPwd() != null && r.isPwd()).count();
        long soloParents = all.stream().filter(r -> r != null && r.isSoloParent() != null && r.isSoloParent()).count();
        long students = all.stream()
            .filter(r -> r != null && r.getOccupation() != null && r.getOccupation().toLowerCase().contains("student"))
            .count();
        long unemployed = all.stream()
            .filter(r -> r != null && "Unemployed".equalsIgnoreCase(r.getEmploymentStatus()))
            .count();
        long fourPs = all.stream().filter(r -> r != null && r.is4psBeneficiary() != null && r.is4psBeneficiary()).count();
        long withMedicalHistory = all.stream()
            .filter(r -> r != null && r.getMedicalHistory() != null && !r.getMedicalHistory().isEmpty())
            .count();
        
        StringBuilder sb = new StringBuilder();
        sb.append("BARANGAY SAN SEBASTIAN COMMUNITY PROFILE (REAL DATA - ").append(totalResidents).append(" residents):\n");
        sb.append("- Total Residents: ").append(totalResidents).append("\n");
        sb.append("- Male: ").append(male).append(" | Female: ").append(female).append("\n");
        sb.append("- Senior Citizens: ").append(seniors).append("\n");
        sb.append("- PWDs: ").append(pwd).append("\n");
        sb.append("- Solo Parents: ").append(soloParents).append("\n");
        sb.append("- Students: ").append(students).append("\n");
        sb.append("- Unemployed: ").append(unemployed).append("\n");
        sb.append("- 4Ps Beneficiaries: ").append(fourPs).append("\n");
        sb.append("- Residents with Medical History: ").append(withMedicalHistory).append("\n");
        
        return sb.toString();
        
    } catch (Exception e) {
        System.err.println("ERROR in getDemographicSummary: " + e.getMessage());
        e.printStackTrace();
        return "Census data is currently being processed. General community programs are recommended.";
    }
}

        public long getTotalCount() {
            return censusRepo.count();
        }
    /**
     * Returns full demographics as a Map
     */
        public Map<String, Object> getCommunityDemographics() {
            List<CensusRecord> all = censusRepo.findAll();
            Map<String, Object> stats = new LinkedHashMap<>();
            
            long totalResidents = all.size();
            stats.put("totalResidents", totalResidents);
            stats.put("hasData", totalResidents > 0);
            
            if (totalResidents == 0) {
                stats.put("male", 0);
                stats.put("female", 0);
                stats.put("seniors", 0);
                stats.put("pwd", 0);
                stats.put("soloParents", 0);
                stats.put("students", 0);
                stats.put("unemployed", 0);
                stats.put("fourPs", 0);
                stats.put("withMedicalHistory", 0);
                return stats;
            }
            
            stats.put("male", all.stream().filter(r -> "Male".equalsIgnoreCase(r.getGender())).count());
            stats.put("female", all.stream().filter(r -> "Female".equalsIgnoreCase(r.getGender())).count());
            stats.put("seniors", all.stream().filter(CensusRecord::isSeniorCitizen).count());
            stats.put("pwd", all.stream().filter(CensusRecord::isPwd).count());
            stats.put("soloParents", all.stream().filter(CensusRecord::isSoloParent).count());
            stats.put("students", all.stream().filter(r -> r.getOccupation() != null && r.getOccupation().toLowerCase().contains("student")).count());
            stats.put("unemployed", all.stream().filter(r -> "Unemployed".equalsIgnoreCase(r.getEmploymentStatus())).count());
            stats.put("fourPs", all.stream().filter(CensusRecord::is4psBeneficiary).count());
            stats.put("withMedicalHistory", all.stream().filter(r -> r.getMedicalHistory() != null && !r.getMedicalHistory().isEmpty()).count());
            
            return stats;
        }
}