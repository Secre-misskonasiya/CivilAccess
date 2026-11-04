package com.example.demo.services;

import com.example.demo.model.ContactHelpRequest;
import com.example.demo.repository.ContactHelpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ContactHelpService {

    @Autowired
    private ContactHelpRepository repository;

    public List<ContactHelpRequest> getAllRequests() {
        return repository.findAll();
    }

    public ContactHelpRequest getRequestById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public ContactHelpRequest saveRequest(ContactHelpRequest request) {
        return repository.save(request);
    }

    public long countByStatus(String status) {
        List<ContactHelpRequest> all = repository.findAll();
        return all.stream()
                .filter(r -> status.equals(r.getStatus()))
                .count();
    }

    public Page<ContactHelpRequest> getRequestsByStatus(String status, Pageable pageable) {
        List<ContactHelpRequest> all = repository.findAll();
        
        // Filter by status
        List<ContactHelpRequest> filtered = all.stream()
                .filter(r -> status.equals(r.getStatus()))
                .collect(Collectors.toList());
        
        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        
        if (start > filtered.size()) {
            return new PageImpl<>(List.of(), pageable, filtered.size());
        }
        
        List<ContactHelpRequest> pageContent = filtered.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }


    public List<ContactHelpRequest> getRequestsByStatus(String status) {
    return repository.findByStatus(status);
}


}