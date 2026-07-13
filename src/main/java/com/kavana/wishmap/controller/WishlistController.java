package com.kavana.wishmap.controller;
import com.kavana.wishmap.repository.WishlistPlaceRepository;
import com.kavana.wishmap.dto.NearbyCheckRequest;
import com.kavana.wishmap.dto.NearbyPlaceResponse;
import com.kavana.wishmap.entity.User;
import com.kavana.wishmap.entity.WishlistPlace;
import com.kavana.wishmap.repository.UserRepository;
import com.kavana.wishmap.service.WishlistService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;
    private final UserRepository userRepository;
    private final WishlistPlaceRepository wishlistPlaceRepository;
    
    public WishlistController(WishlistService wishlistService, UserRepository userRepository, WishlistPlaceRepository wishlistPlaceRepository) {
        this.wishlistService = wishlistService;
        this.userRepository = userRepository;
        this.wishlistPlaceRepository = wishlistPlaceRepository;

    }

    @PostMapping
    public WishlistPlace addPlace(@RequestBody WishlistPlace place, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        place.setUser(user);
        return wishlistService.addPlace(place);
    }

    @PostMapping("/nearby")
    public List<NearbyPlaceResponse> checkNearby(@RequestBody NearbyCheckRequest request,
                                                   Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return wishlistService.findNearbyPlaces(user.getId(), request);
    }
    @GetMapping("/all")
    public List<WishlistPlace> getAll(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return wishlistPlaceRepository.findByUserId(user.getId());
    }

    @PutMapping("/{id}/visited")
    public WishlistPlace markVisited(@PathVariable Long id) {
        WishlistPlace place = wishlistPlaceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Place not found"));
        place.setVisited(true);
        return wishlistPlaceRepository.save(place);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        wishlistPlaceRepository.deleteById(id);
    }
}