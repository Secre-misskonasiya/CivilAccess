package com.example.demo.services;

import com.example.demo.dto.ResidentDTO;
import com.example.demo.model.ResidentUser;
import com.example.demo.repository.ResidentUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.lang.NonNull;

@Service
public class ResidentUserService {

    @Autowired
    private ResidentUserRepository repository;

    public ResidentUser getResidentById(@NonNull UUID id) {
        return repository.findById(id).orElse(null);
    }

    public ResidentUser saveResident(ResidentUser resident) {
        if (resident.getId() == null && (resident.getResidentId() == null ||
            resident.getResidentId().trim().isEmpty() ||
            resident.getResidentId().equals("Auto-generated"))) {
            resident.setResidentId(generateNextResidentId());
        }
        if (resident.getStatus() == null || resident.getStatus().trim().isEmpty()) {
            resident.setStatus("Active");
        }
        return repository.save(resident);
    }

    private String generateNextResidentId() {
        String year = String.valueOf(java.time.Year.now().getValue());
        String prefix = "RES-" + year;
        String maxId = repository.findMaxResidentIdByYear(prefix);
        int nextSeq = 1;
        if (maxId != null && maxId.contains("-")) {
            try {
                String[] parts = maxId.split("-");
                if (parts.length == 3) {
                    nextSeq = Integer.parseInt(parts[2]) + 1;
                }
            } catch (NumberFormatException e) {
                nextSeq = 1;
            }
        }
        return prefix + "-" + String.format("%04d", nextSeq);
    }

    public List<ResidentDTO> getAllResidentsDTO() {
        return repository.findAllSortedByNewest().stream()
            .map(resident -> new ResidentDTO(
                resident.getId(),
                resident.getResidentId(),
                resident.getFirstName(),
                resident.getLastName(),
                resident.getGender(),
                resident.getBirthDate(),
                resident.getMobileNumber(),
                resident.getEmail(),
                resident.getAddress(),
                resident.getStatus(),
                resident.getSelfie(),
                resident.getValidId(),
                resident.getBarangayIndigency(),
                resident.getAccount_status(),
                resident.getAvatarUrl()
            ))
            .collect(Collectors.toList());
    }

    public List<ResidentUser> getAllResidents() {
        return repository.findAllSortedByNewest();
    }

    public void deleteResident(@NonNull UUID id) {
        repository.deleteById(id);
    }

    public long countResidents() {
        return repository.countActiveResidents();
    }

    public List<ResidentUser> getResidentsByStatus(String status) {
        return repository.findByStatusSorted(status);
    }
}