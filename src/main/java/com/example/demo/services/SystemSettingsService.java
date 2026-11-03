package com.example.demo.services;

import com.example.demo.model.SystemSettings;
import com.example.demo.repository.SystemSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingsService {

    @Autowired
    private SystemSettingsRepository repository;

    public String get(String key, String defaultValue) {
        return repository.findBySettingKey(key)
                .map(SystemSettings::getSettingValue)
                .orElse(defaultValue);
    }

    public void set(String key, String value) {
        SystemSettings s = repository.findBySettingKey(key)
                .orElse(new SystemSettings(key, value));
        s.setSettingValue(value);
        repository.save(s);
    }

    public Map<String, String> getAllAsMap() {
        Map<String, String> map = new HashMap<>();
        for (SystemSettings s : repository.findAll()) {
            map.put(s.getSettingKey(), s.getSettingValue());
        }
        return map;
    }

    public void saveAll(Map<String, String> settings) {
        settings.forEach(this::set);
    }
}