package com.example.demo.services;

import com.example.demo.model.Rental;
import com.example.demo.repository.RentalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class RentalService {

    @Autowired
    private RentalRepository rentalRepository;
    
    @Autowired
    private AdminUserServices adminUserService;

    public List<Rental> getIncomingRentals() {
        return rentalRepository.findByStatusOrderByRentalDateDesc("INCOMING");
    }

    public List<Rental> getActiveRentals() {
        updateOverdueStatus();
        return rentalRepository.findByStatusOrderByRentalDateDesc("ACTIVE");
    }
    
    public List<Rental> getOverdueRentals() {
        updateOverdueStatus();
        return rentalRepository.findByStatusOrderByRentalDateDesc("OVERDUE");
    }

    public List<Rental> getReturnedRentals() {
        return rentalRepository.findByStatusOrderByRentalDateDesc("RETURNED");
    }

    public List<Rental> getArchivedRentals() {
        return rentalRepository.findByStatusOrderByRentalDateDesc("ARCHIVE");
    }

    public Optional<Rental> getRentalById(Long id) {
        return rentalRepository.findById(id);
    }
    
    @Transactional
    public void updateOverdueStatus() {
        rentalRepository.updateOverdueStatus();
    }

    @Transactional
    public Rental createRental(Rental rental) {
        if (rental.getRenterName() == null || rental.getRenterName().trim().isEmpty())
            throw new IllegalArgumentException("Renter name is required");
        if (rental.getExpectedReturnDate() == null)
            throw new IllegalArgumentException("Expected return date is required");
        if (rental.getExpectedReturnDate().isBefore(LocalDate.now()))
            throw new IllegalArgumentException("Expected return date cannot be in the past");
        
        rental.calculateTotalPrice();
        if (rental.getStatus() == null) {
            rental.setStatus("INCOMING");
        }
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental updateStatus(Long id, String status) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        rental.setStatus(status);
        if (status.equals("ARCHIVE")) {
            rental.setArchivedDate(LocalDate.now());
        }
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental approveRental(Long id) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        rental.setStatus("ACTIVE");
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental returnRental(Long id, String processedBy) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        rental.setActualReturnDate(LocalDate.now());
        rental.setStatus("RETURNED");
        rental.setProcessedBy(processedBy);
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental archiveRental(Long id, String processedBy) {
        Rental rental = rentalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rental not found"));
        rental.setStatus("ARCHIVE");
        rental.setArchivedDate(LocalDate.now());
        rental.setProcessedBy(processedBy);
        return rentalRepository.save(rental);
    }

    public List<Rental> searchRentals(String keyword) {
        return rentalRepository.findByRenterNameContainingIgnoreCaseOrEquipmentTypeContainingIgnoreCase(keyword, keyword);
    }
    
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void scheduledOverdueUpdate() {
        rentalRepository.updateOverdueStatus();
    }
    
    private String getCurrentUserName(Principal principal) {
        if (principal != null) {
            com.example.demo.model.AdminUser admin = adminUserService.getAdminByEmail(principal.getName());
            if (admin != null) return admin.getName();
            return principal.getName();
        }
        return "System";
    }
}