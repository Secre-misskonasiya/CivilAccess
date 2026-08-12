package com.example.demo.controller;

import com.example.demo.model.SafetyReports;
import com.example.demo.repository.SafetyReportRepository;
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
@RequestMapping("/resident/safety-reports")
public class ResidentSafetyReportController {

    @Autowired
    private SafetyReportRepository safetyReportRepository;

    @GetMapping
    public String residentSafetyReports(Model model, 
                                        @org.springframework.web.bind.annotation.RequestParam(required = false) Long userId) {
        
        List<SafetyReports> visibleReports = safetyReportRepository.findAll()
                .stream()
                .filter(r -> r.getStatus() == null || !r.getStatus().equalsIgnoreCase("ARCHIVED"))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        model.addAttribute("reports", visibleReports);
        return "ResidentSafetyReport";
    }

    @GetMapping("/api/feed")
    @ResponseBody
    public List<SafetyReports> feedApi() {
        return safetyReportRepository.findAll()
                .stream()
                .filter(r -> r.getStatus() == null || !r.getStatus().equalsIgnoreCase("ARCHIVED"))
                .sorted(Comparator
                        .comparing(SafetyReports::getDateSubmitted, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}