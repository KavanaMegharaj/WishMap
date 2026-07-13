package com.kavana.wishmap.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "wishlist_places")
@Data
public class WishlistPlace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String name;
    private String notes;
    private Double latitude;
    private Double longitude;
    private String category;
    private boolean visited = false;

    private String imageUrl;
    private String city;
    private String country;
    private String googleMapsLink;
    private LocalDate plannedVisitDate;
    private Integer priority;      // 1 (low) - 5 (high)

    private LocalDateTime createdAt = LocalDateTime.now();
}