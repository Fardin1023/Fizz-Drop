package com.fizzdrop.controller;

import com.fizzdrop.dto.ApiResponse;
import com.fizzdrop.entity.AppNotification;
import com.fizzdrop.repository.AppNotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final AppNotificationRepository notificationRepository;

    public NotificationController(AppNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<List<AppNotification>> getNotifications(
            @RequestParam(defaultValue = "SUPERADMIN") String role,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {

        List<AppNotification> list;
        if (unreadOnly) {
            list = notificationRepository.findUnreadForRecipient(role.toUpperCase(), userId);
        } else {
            list = notificationRepository.findForRecipient(role.toUpperCase(), userId);
        }
        return ResponseEntity.ok(list);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id).map(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
            return ResponseEntity.ok(n);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(
            @RequestParam(defaultValue = "SUPERADMIN") String role,
            @RequestParam(required = false) Long userId) {
        notificationRepository.markAllAsRead(role.toUpperCase(), userId);
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Notification deleted."));
        }
        return ResponseEntity.notFound().build();
    }
}
