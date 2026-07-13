package com.kavana.wishmap.repository;

import com.kavana.wishmap.entity.WishlistPlace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WishlistPlaceRepository extends JpaRepository<WishlistPlace, Long> {

    List<WishlistPlace> findByUserEmail(String email);

    List<WishlistPlace> findByUserId(Long userId);
    List<WishlistPlace> findByUserIdAndVisitedFalse(Long userId);
}