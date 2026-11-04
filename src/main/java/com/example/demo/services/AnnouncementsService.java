package com.example.demo.services;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Announcements;
import com.example.demo.repository.AnnouncementsRepository;

import net.coobird.thumbnailator.Thumbnails;

@Service
public class AnnouncementsService {

    @Autowired
    private AnnouncementsRepository repository;

    // Displayed at 272x204 on the dashboard card and larger on the
    // /announcements page — 1280x720 covers both without keeping the
    // full original upload (which can be 4600x3000+ from a phone camera).
    private static final int MAX_WIDTH  = 1280;
    private static final int MAX_HEIGHT = 720;
    private static final float JPEG_QUALITY = 0.8f;

    public List<Announcements> getAllAnnouncements() {
        return repository.findAll();
    }

    public Announcements getAnnouncementById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Announcements saveAnnouncement(Announcements announcement) {
        return repository.save(announcement);
    }

    public void deleteAnnouncement(Long id) {
        repository.deleteById(id);
    }

    public Announcements getLatest() {
        return repository.findAll().stream()
            .filter(a -> !"ARCHIVED".equalsIgnoreCase(a.getStatus()))
            .sorted(Comparator
                .comparing(Announcements::getPriority, (p1, p2) -> {
                    if ("HIGH".equals(p1) && !"HIGH".equals(p2)) return -1;
                    if (!"HIGH".equals(p1) && "HIGH".equals(p2)) return 1;
                    return 0;
                })
                .thenComparing(Announcements::getDatePosted, Comparator.nullsLast(Comparator.reverseOrder())))
            .findFirst()
            .orElse(null);
    }

    public long countActive() {
        return repository.countByStatusNotIgnoreCase("ARCHIVED");
    }

    public Announcements getById(Long id) {
        return repository.findById(id).orElse(null);
    }

    // =========================================================
    // IMAGE RESIZE — the announcement form sends the image as a
    // base64 data URI inside the JSON body (not a MultipartFile,
    // unlike the avatar upload path). This decodes whatever data
    // URI arrives, shrinks it to MAX_WIDTH x MAX_HEIGHT (preserving
    // aspect ratio, no cropping), and re-encodes it before save.
    //
    // If the image field isn't a data URI (null, or an external
    // URL from some other source) it's passed through unchanged.
    // =========================================================
    public String resizeIfDataUri(String image) throws IOException {
        if (image == null || !image.startsWith("data:image")) {
            return image;
        }

        int commaIdx = image.indexOf(',');
        if (commaIdx < 0) {
            return image; // malformed data URI — leave as-is rather than throw
        }

        String base64 = image.substring(commaIdx + 1);
        byte[] originalBytes = Base64.getDecoder().decode(base64);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(new ByteArrayInputStream(originalBytes))
                .size(MAX_WIDTH, MAX_HEIGHT)
                .keepAspectRatio(true)
                .outputFormat("jpg")
                .outputQuality(JPEG_QUALITY)
                .toOutputStream(out);

        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
    }
}