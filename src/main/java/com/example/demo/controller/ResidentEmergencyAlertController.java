package com.example.demo.controller;

import com.example.demo.model.EmergencyAlerts;
import com.example.demo.repository.EmergencyAlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/resident/emergency-alerts")
public class ResidentEmergencyAlertController {

    @Autowired
    private EmergencyAlertRepository emergencyAlertRepository;

    @GetMapping
    public String residentEmergencyAlerts(Model model) {
        List<EmergencyAlerts> visibleAlerts = emergencyAlertRepository.findAll()
                .stream()
                .filter(alert -> !alert.isArchived())
                .sorted(Comparator.comparing(EmergencyAlerts::getDateCreated, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        model.addAttribute("alerts", visibleAlerts);
        return "ResidentEmergencyAlert";
    }

    @GetMapping("/api/feed")
    @ResponseBody
    public List<EmergencyAlerts> feedApi() {
        return emergencyAlertRepository.findAll()
                .stream()
                .filter(alert -> !alert.isArchived())
                .sorted(Comparator.comparing(EmergencyAlerts::getDateCreated, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}