package com.example.demo.repository;

import com.example.demo.model.Rental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RentalRepository extends JpaRepository<Rental, Long> {
    
    List<Rental> findByStatusOrderByRentalDateDesc(String status);
    
    List<Rental> findByRenterNameContainingIgnoreCaseOrEquipmentTypeContainingIgnoreCase(String name, String type);
    
    @Query("SELECT r FROM Rental r WHERE r.status = 'ACTIVE' AND r.expectedReturnDate < CURRENT_DATE")
    List<Rental> findOverdueRentals();
    
    @Modifying
    @Transactional
    @Query("UPDATE Rental r SET r.status = 'OVERDUE' WHERE r.status = 'ACTIVE' AND r.expectedReturnDate < CURRENT_DATE")
    void updateOverdueStatus();
    
    @Modifying
    @Transactional
    @Query("UPDATE Rental r SET r.status = 'ARCHIVE', r.archivedDate = CURRENT_DATE WHERE r.id = :id")
    void archiveRental(@Param("id") Long id);
}