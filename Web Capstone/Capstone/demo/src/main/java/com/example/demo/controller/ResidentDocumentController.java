package com.example.demo.controller;

import com.example.demo.model.DocumentRequest;
import com.example.demo.model.Reservation;
import com.example.demo.model.Rental;
import com.example.demo.model.ResidentUser;
import com.example.demo.repository.DocumentRequestRepository;
import com.example.demo.repository.ReservationRepository;
import com.example.demo.repository.RentalRepository;
import com.example.demo.repository.ResidentUserRepository;
import com.example.demo.services.DocumentRequestService;
import com.example.demo.services.ReservationService;
import com.example.demo.services.RentalService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident")
public class ResidentDocumentController {

    @Autowired
    private DocumentRequestRepository documentRequestRepository;

    @Autowired
    private DocumentRequestService documentRequestService;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private RentalRepository rentalRepository;

    @Autowired
    private RentalService rentalService;

    @Autowired
    private ResidentUserRepository residentUserRepository;

    // ==================== HELPER ====================

    private String getUserId(Long userId, HttpSession session) {
        if (userId != null) return userId.toString();
        Object residentId = session.getAttribute("residentId");
        Object adminId = session.getAttribute("adminAsResidentId");
        if (residentId != null) return residentId.toString();
        if (adminId != null) return adminId.toString();
        return null;
    }

    // ==================== DOCUMENT REQUESTS ====================

    @GetMapping("/documents/new")
    public String showDocumentForm(@RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            resident.ifPresent(r -> {
                model.addAttribute("fullName", r.getFirstName() + " " + r.getLastName());
                model.addAttribute("contactNumber", r.getMobileNumber());
                model.addAttribute("address", r.getAddress());
                model.addAttribute("birthdate", r.getBirthDate());
                model.addAttribute("gender", r.getGender());
            });
        } catch (IllegalArgumentException e) {
            return "redirect:/resident-login";
        }

        model.addAttribute("documentTypes", new String[]{
            "Barangay Clearance", "Barangay Indigency", "Barangay ID"
        });

        return "ResidentDocumentRequest";
    }

    @PostMapping("/documents/submit")
    @ResponseBody
    public String submitDocument(
            @RequestParam("documentType") String documentType,
            @RequestParam("purpose") String purpose,
            @RequestParam(value = "validId", required = false) MultipartFile validId,
            @RequestParam(value = "proofResidency", required = false) MultipartFile proofResidency,
            @RequestParam(value = "twox2Image", required = false) MultipartFile twox2Image,
            @RequestParam(value = "emergencyName", required = false) String emergencyName,
            @RequestParam(value = "emergencyAddress", required = false) String emergencyAddress,
            @RequestParam(value = "emergencyContact", required = false) String emergencyContact,
            @RequestParam(value = "userId", required = false) Long userId,
            HttpSession session) {

        String uid = getUserId(userId, session);
        if (uid == null) return "error: not logged in";

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            if (resident.isEmpty()) return "error: resident not found";

            var r = resident.get();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

            DocumentRequest request = new DocumentRequest();
            request.setResidentId(uid);
            request.setFullName(r.getFirstName() + " " + r.getLastName());
            request.setContactNumber(r.getMobileNumber());
            request.setAddress(r.getAddress());
            request.setDocumentType(documentType);
            request.setPurposeOfRequest(purpose);
            request.setRequestType("Document Request");
            request.setStatus("INCOMING");
            request.setDateSubmitted(now);
            request.setCreatedAt(now);
            request.setDateProcessed(now);

            if (r.getGender() != null) request.setDocGender(r.getGender());
            if (r.getBirthDate() != null) request.setBirthdate(r.getBirthDate().toString());

            if ("Barangay ID".equals(documentType)) {
                request.setEmergencyName(emergencyName);
                request.setEmergencyAddress(emergencyAddress);
                request.setEmergencyContact(emergencyContact);
            }

            if (validId != null && !validId.isEmpty())
                request.setValidIdUrl("uploaded/valid_id_" + System.currentTimeMillis());
            if (proofResidency != null && !proofResidency.isEmpty())
                request.setResidencyProofUrl("uploaded/proof_" + System.currentTimeMillis());
            if (twox2Image != null && !twox2Image.isEmpty())
                request.setPhoto2x2Url("uploaded/2x2_" + System.currentTimeMillis());

            documentRequestRepository.save(request);
            return "success";

        } catch (IllegalArgumentException e) {
            return "error: invalid user id";
        }
    }

    @GetMapping("/my-requests")
public String showMyRequests(@RequestParam(required = false) Long userId, HttpSession session, Model model) {
    String uid = getUserId(userId, session);
    if (uid == null) return "redirect:/resident-login";

    try {
        var documents = documentRequestRepository.findByResidentIdOrderByDateSubmittedDesc(uid);

        var resident = residentUserRepository.findById(UUID.fromString(uid));
        String residentName = resident.map(r -> r.getFirstName() + " " + r.getLastName()).orElse("");
        final String residentFullName = residentName;

        var reservations = reservationRepository.findAll().stream()
                .filter(r -> r.getFullName() != null && r.getFullName().equalsIgnoreCase(residentFullName))
                .collect(Collectors.toList());

        var rentals = rentalRepository.findAll().stream()
                .filter(r -> r.getRenterName() != null && r.getRenterName().equalsIgnoreCase(residentFullName))
                .collect(Collectors.toList());

        long pendingCount = documentRequestService.countPending();

        model.addAttribute("documents", documents);
        model.addAttribute("reservations", reservations);
        model.addAttribute("rentals", rentals);
        model.addAttribute("pendingCount", pendingCount);

    } catch (IllegalArgumentException e) {
        return "redirect:/resident-login";
    }

    return "ResidentDocument"; // <-- fixed
}

    @GetMapping("/documents/{id}")
    public String viewDocumentDetails(@PathVariable Long id, @RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        try {
            DocumentRequest request = documentRequestService.getById(id);
            if (request.getResidentId() == null || !request.getResidentId().equals(uid)) {
                return "redirect:/resident/my-requests";
            }
            model.addAttribute("request", request);
            model.addAttribute("type", "document");
            return "resident/request-details";
        } catch (RuntimeException e) {
            return "redirect:/resident/my-requests";
        }
    }

    // ==================== RESERVATIONS ====================

    @GetMapping("/reservations/new")
    public String showReservationForm(@RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            resident.ifPresent(r -> model.addAttribute("fullName", r.getFirstName() + " " + r.getLastName()));
        } catch (IllegalArgumentException e) {
            return "redirect:/resident-login";
        }

        model.addAttribute("courts", new String[]{
            "Barangay Covered Court", "Multi-Purpose Hall",
            "Open Basketball Court", "Barangay Session Hall"
        });
        model.addAttribute("timeSlots", new String[]{
            "06:00-08:00", "08:00-10:00", "10:00-12:00",
            "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00"
        });

        return "ResidentReservationRequest";
    }

    @PostMapping("/reservations/submit")
    @ResponseBody
    public String submitReservation(
            @RequestParam("fullName") String fullName,
            @RequestParam("court") String court,
            @RequestParam("date") String date,
            @RequestParam("timeSlot") String timeSlot,
            @RequestParam("purpose") String purpose,
            HttpSession session) {

        try {
            Reservation reservation = new Reservation();
            reservation.setFullName(fullName);
            reservation.setCourt(court);
            reservation.setDate(LocalDate.parse(date));
            reservation.setTimeSlot(timeSlot);
            reservation.setPurpose(purpose);
            reservationService.createReservation(reservation);
            return "success";
        } catch (IllegalStateException e) {
            return "error: " + e.getMessage();
        } catch (Exception e) {
            return "error: Failed to create reservation";
        }
    }

    @GetMapping("/reservations/{id}")
    public String viewReservationDetails(@PathVariable Long id, @RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        var reservationOpt = reservationService.getReservationById(id);
        if (reservationOpt.isEmpty()) return "redirect:/resident/my-requests";

        Reservation reservation = reservationOpt.get();

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            if (resident.isPresent()) {
                String residentFullName = resident.get().getFirstName() + " " + resident.get().getLastName();
                if (reservation.getFullName() == null || !reservation.getFullName().equalsIgnoreCase(residentFullName)) {
                    return "redirect:/resident/my-requests";
                }
            }
        } catch (IllegalArgumentException e) {
            return "redirect:/resident-login";
        }

        model.addAttribute("request", reservation);
        model.addAttribute("type", "reservation");
        return "resident/request-details";
    }

    // ==================== RENTALS ====================

    @GetMapping("/rentals/new")
    public String showRentalForm(@RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            resident.ifPresent(r -> model.addAttribute("renterName", r.getFirstName() + " " + r.getLastName()));
        } catch (IllegalArgumentException e) {
            return "redirect:/resident-login";
        }

        model.addAttribute("equipment", new String[]{"Chair", "Canopy Tent", "Sound System", "Table"});
        model.addAttribute("equipmentPrices", new int[]{15, 250, 500, 25});

        return "ResidentRentalRequest";
    }

    @PostMapping("/rentals/submit")
    @ResponseBody
    public String submitRental(
            @RequestParam("renterName") String renterName,
            @RequestParam("equipmentType") String equipmentType,
            @RequestParam("quantity") int quantity,
            @RequestParam("rentalDate") String rentalDate,
            @RequestParam("expectedReturnDate") String expectedReturnDate,
            @RequestParam("totalPrice") double totalPrice,
            HttpSession session) {

        try {
            Rental rental = new Rental();
            rental.setRenterName(renterName);
            rental.setEquipmentType(equipmentType);
            rental.setQuantity(quantity);
            rental.setRentalDate(LocalDate.parse(rentalDate));
            rental.setExpectedReturnDate(LocalDate.parse(expectedReturnDate));
            rental.setTotalPrice(totalPrice);
            rentalService.createRental(rental);
            return "success";
        } catch (IllegalArgumentException e) {
            return "error: " + e.getMessage();
        } catch (Exception e) {
            return "error: Failed to create rental request";
        }
    }

    @GetMapping("/rentals/{id}")
    public String viewRentalDetails(@PathVariable Long id, @RequestParam(required = false) Long userId, HttpSession session, Model model) {
        String uid = getUserId(userId, session);
        if (uid == null) return "redirect:/resident-login";

        var rentalOpt = rentalService.getRentalById(id);
        if (rentalOpt.isEmpty()) return "redirect:/resident/my-requests";

        Rental rental = rentalOpt.get();

        try {
            var resident = residentUserRepository.findById(UUID.fromString(uid));
            if (resident.isPresent()) {
                String residentFullName = resident.get().getFirstName() + " " + resident.get().getLastName();
                if (rental.getRenterName() == null || !rental.getRenterName().equalsIgnoreCase(residentFullName)) {
                    return "redirect:/resident/my-requests";
                }
            }
        } catch (IllegalArgumentException e) {
            return "redirect:/resident-login";
        }

        model.addAttribute("request", rental);
        model.addAttribute("type", "rental");
        return "resident/request-details";
    }
}