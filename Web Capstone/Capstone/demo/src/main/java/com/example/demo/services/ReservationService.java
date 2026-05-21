package com.example.demo.services;

import com.example.demo.model.Reservation;
import com.example.demo.repository.ReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepository;

    // New status-based methods for the tabs
    public List<Reservation> getIncomingReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtDesc("INCOMING");
    }

    public List<Reservation> getApprovedReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtDesc("APPROVED");
    }

    public List<Reservation> getInProgressReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtDesc("IN_PROGRESS");
    }

    public List<Reservation> getResolvedReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtDesc("RESOLVED");
    }

    public List<Reservation> getArchivedReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtDesc("ARCHIVED");
    }

    // Legacy methods for backward compatibility
    public List<Reservation> getPendingReservations() {
        return getIncomingReservations();
    }

    public List<Reservation> getConfirmedReservations() {
        return getApprovedReservations();
    }

    public List<Reservation> getCancelledReservations() {
        return getArchivedReservations();
    }

    public Optional<Reservation> getReservationById(Long id) {
        return reservationRepository.findById(id);
    }

    @Transactional
    public Reservation createReservation(Reservation reservation) {
        // Validation
        if (reservation.getFullName() == null || reservation.getFullName().trim().isEmpty()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (reservation.getCourt() == null || reservation.getCourt().trim().isEmpty()) {
            throw new IllegalArgumentException("Court selection is required");
        }
        if (reservation.getDate() == null) {
            throw new IllegalArgumentException("Reservation date is required");
        }
        if (reservation.getDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Cannot reserve a past date");
        }
        if (reservation.getTimeFrom() == null || reservation.getTimeFrom().trim().isEmpty()) {
            throw new IllegalArgumentException("Start time is required");
        }
        if (reservation.getTimeTo() == null || reservation.getTimeTo().trim().isEmpty()) {
            throw new IllegalArgumentException("End time is required");
        }
        // Check for conflicts
        if (reservationRepository.existsConflict(reservation.getCourt(), reservation.getDate(), reservation.getTimeFrom(), reservation.getTimeTo())) {
            throw new IllegalStateException("This time slot is already booked for the selected court. Please choose another time.");
        }

        // Set default status if not set
        if (reservation.getStatus() == null) {
            reservation.setStatus("INCOMING");
        }
        
        return reservationRepository.save(reservation);
    }

    @Transactional
    public Reservation updateStatus(Long id, String status, String processedBy) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        reservation.setStatus(status);
        if (status.equals("RESOLVED") || status.equals("ARCHIVED")) {
            reservation.setProcessedBy(processedBy);
        }
        return reservationRepository.save(reservation);
    }

    @Transactional
    public Reservation confirmReservation(Long id, String processedBy) {
        return updateStatus(id, "APPROVED", processedBy);
    }

    @Transactional
    public Reservation cancelReservation(Long id, String processedBy) {
        return updateStatus(id, "ARCHIVED", processedBy);
    }
}