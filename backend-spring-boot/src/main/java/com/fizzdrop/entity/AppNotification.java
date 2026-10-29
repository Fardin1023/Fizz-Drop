package com.fizzdrop.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_notifications")
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_role", nullable = false, length = 50)
    @JsonProperty("recipient_role")
    @JsonAlias({"recipient_role", "recipientRole"})
    private String recipientRole; // "SUPERADMIN", "SUPPLIER"

    @Column(name = "recipient_user_id")
    @JsonProperty("recipient_user_id")
    @JsonAlias({"recipient_user_id", "recipientUserId"})
    private Long recipientUserId;

    @Column(name = "title", nullable = false, length = 200)
    @JsonProperty("title")
    private String title;

    @Lob
    @Column(name = "message", columnDefinition = "TEXT")
    @JsonProperty("message")
    private String message;

    @Column(name = "type", nullable = false, length = 50)
    @JsonProperty("type")
    private String type; // "NEW_REQUISITION", "APPROVED", "PARTIALLY_APPROVED", "REJECTED"

    @Column(name = "reference_code", length = 50)
    @JsonProperty("reference_code")
    @JsonAlias({"reference_code", "referenceCode"})
    private String referenceCode; // e.g. "REQ-2026-2722"

    @Column(name = "reference_id")
    @JsonProperty("reference_id")
    @JsonAlias({"reference_id", "referenceId"})
    private Long referenceId;

    @Column(name = "is_read", nullable = false)
    @JsonProperty("is_read")
    @JsonAlias({"is_read", "isRead"})
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    public AppNotification() {
        this.createdAt = LocalDateTime.now();
        this.isRead = false;
    }

    public AppNotification(String recipientRole, Long recipientUserId, String title, String message, String type, String referenceCode, Long referenceId) {
        this.recipientRole = recipientRole;
        this.recipientUserId = recipientUserId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.referenceCode = referenceCode;
        this.referenceId = referenceId;
        this.isRead = false;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isRead == null) {
            this.isRead = false;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipientRole() { return recipientRole; }
    public void setRecipientRole(String recipientRole) { this.recipientRole = recipientRole; }

    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getReferenceCode() { return referenceCode; }
    public void setReferenceCode(String referenceCode) { this.referenceCode = referenceCode; }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
