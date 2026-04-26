package com.example.demo.services;

import com.example.demo.model.ChatHistoryAI;
import com.example.demo.repository.ChatHistoryRepositoryAI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatHistoryServiceAI {

    @Autowired
    private ChatHistoryRepositoryAI repository;

    public ChatHistoryAI save(String sender, String message, String username) {
        ChatHistoryAI chat = new ChatHistoryAI();
        chat.setSender(sender);
        chat.setMessage(message);
        chat.setUsername(username);
        chat.setCreatedAt(LocalDateTime.now());
        return repository.save(chat);
    }

    public List<ChatHistoryAI> getHistory(String username) {
        try {
            return repository.findByUsernameOrderByCreatedAtAsc(username);
        } catch (Exception e) {
            System.err.println("Error getting history: " + e.getMessage());
            return List.of(); 
        }
    }

    public void clearHistory(String username) {
        try {
            repository.deleteByUsername(username);
        } catch (Exception e) {
            System.err.println("Error clearing history: " + e.getMessage());
        }
    }
    
    /**
     * Get formatted conversation history for the AI prompt
     * @param username The username
     * @param maxMessages Maximum number of recent messages to include
     * @return Formatted conversation history string
     */
    public String getFormattedHistory(String username, int maxMessages) {
        try {
            List<ChatHistoryAI> history = getHistory(username);
            
            if (history == null || history.isEmpty()) {
                return "";
            }
            
            List<ChatHistoryAI> recentMessages = history.stream()
                    .skip(Math.max(0, history.size() - maxMessages))
                    .collect(Collectors.toList());
            
            if (recentMessages.isEmpty()) {
                return "";
            }
            
            StringBuilder conversation = new StringBuilder();
            conversation.append("\n\n--- PREVIOUS CONVERSATION HISTORY ---\n");
            
            for (ChatHistoryAI chat : recentMessages) {
                String sender = "user".equals(chat.getSender()) ? "User" : "AI Assistant";
                
                String cleanMessage = chat.getMessage().replace("\n", " ").replace("\r", "");
                conversation.append(sender).append(": ").append(cleanMessage).append("\n");
            }
            
            conversation.append("--- END OF HISTORY ---\n");
            conversation.append("Please continue the conversation naturally based on the history above.\n");
            
            return conversation.toString();
        } catch (Exception e) {
            System.err.println("Error formatting history: " + e.getMessage());
            return ""; 
        }
    }
}