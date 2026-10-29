package com.fizzdrop.repository;

import com.fizzdrop.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findByRecipientRoleOrderByCreatedAtDesc(String recipientRole);

    @Query("SELECT n FROM AppNotification n WHERE UPPER(n.recipientRole) = UPPER(:role) AND (:userId IS NULL OR n.recipientUserId IS NULL OR n.recipientUserId = :userId) ORDER BY n.createdAt DESC")
    List<AppNotification> findForRecipient(@Param("role") String role, @Param("userId") Long userId);

    @Query("SELECT n FROM AppNotification n WHERE UPPER(n.recipientRole) = UPPER(:role) AND (:userId IS NULL OR n.recipientUserId IS NULL OR n.recipientUserId = :userId) AND n.isRead = false ORDER BY n.createdAt DESC")
    List<AppNotification> findUnreadForRecipient(@Param("role") String role, @Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE UPPER(n.recipientRole) = UPPER(:role) AND (:userId IS NULL OR n.recipientUserId IS NULL OR n.recipientUserId = :userId)")
    void markAllAsRead(@Param("role") String role, @Param("userId") Long userId);
}
