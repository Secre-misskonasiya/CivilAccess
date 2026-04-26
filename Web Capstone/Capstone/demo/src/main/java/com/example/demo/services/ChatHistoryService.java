package com.example.demo.services;

import com.example.demo.model.ChatHistory;
import com.example.demo.repository.ChatHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatHistoryService {

    @Autowired
    private ChatHistoryRepository repository;

    public ChatHistory save(String sender, String message, String username) {
        ChatHistory chat = new ChatHistory();
        chat.setSender(sender);
        chat.setMessage(message);
        chat.setUsername(username);
        chat.setCreatedAt(LocalDateTime.now());
        return repository.save(chat);
    }

    public List<ChatHistory> getHistory(String username) {
        return repository.findByUsernameOrderByCreatedAtAsc(username);
    }

    public void clearHistory(String username) {
        repository.deleteByUsername(username);
    }
}