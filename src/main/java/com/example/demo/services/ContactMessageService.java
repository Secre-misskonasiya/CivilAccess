package com.example.demo.services;

import com.example.demo.model.ContactMessage;
import com.example.demo.repository.ContactMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContactMessageService {

    @Autowired
    private ContactMessageRepository repository;

    /**
     * Save a new message (sent by admin or resident).
     */
    public ContactMessage saveMessage(Long requestId, String message, String senderType, String senderName) {
        ContactMessage msg = new ContactMessage();
        msg.setRequestId(requestId);
        msg.setMessage(message);
        msg.setSenderType(senderType);
        msg.setSenderName(senderName);
        return repository.save(msg);
    }

    /**
     * Get all messages for a contact help request, oldest first.
     * Used by polling on both web and mobile.
     */
    public List<ContactMessage> getMessagesByRequestId(Long requestId) {
        return repository.findByRequestIdOrderByCreatedAtAsc(requestId);
    }
}
