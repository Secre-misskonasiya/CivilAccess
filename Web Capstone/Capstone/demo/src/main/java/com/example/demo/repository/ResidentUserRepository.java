package com.example.demo.repository;

import com.example.demo.model.ResidentUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResidentUserRepository extends JpaRepository<ResidentUser, UUID> {

    Optional<ResidentUser> findByResidentId(String residentId);

    @Query("SELECT MAX(r.residentId) FROM ResidentUser r WHERE r.residentId LIKE :yearPrefix%")
    String findMaxResidentIdByYear(@Param("yearPrefix") String yearPrefix);

    Optional<ResidentUser> findByEmail(String email);

    // Repository — replace the existing query
    @Query("SELECT COUNT(r) FROM ResidentUser r WHERE r.status IS NULL OR r.status != 'DEACTIVATED'")
    long countActiveResidents();

    // ✅ Add this
    List<ResidentUser> findByStatus(String status);
}