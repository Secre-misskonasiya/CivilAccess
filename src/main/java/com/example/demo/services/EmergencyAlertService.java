package com.example.demo.services;

import com.example.demo.model.EmergencyAlerts;
import com.example.demo.repository.EmergencyAlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.UUID;

@Service
public class EmergencyAlertService {

    @Autowired
    private EmergencyAlertRepository repository;

    public List<EmergencyAlerts> getAllAlerts() {
        return repository.findAll();
    }

    public EmergencyAlerts getAlertById(@NonNull UUID id) {
        return repository.findById(id).orElse(null);
    }

    public EmergencyAlerts saveAlert(EmergencyAlerts alert) {
        return repository.save(alert);
    }

    public void deleteAlert(UUID id) {
        repository.deleteById(id);
    }
}