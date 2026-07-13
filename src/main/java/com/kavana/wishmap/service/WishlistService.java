package com.kavana.wishmap.service;

import com.kavana.wishmap.dto.NearbyCheckRequest;
import com.kavana.wishmap.dto.NearbyPlaceResponse;
import com.kavana.wishmap.entity.WishlistPlace;
import com.kavana.wishmap.repository.WishlistPlaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WishlistService {

    private final WishlistPlaceRepository placeRepository;
    private final GeoService geoService;

    public WishlistService(WishlistPlaceRepository placeRepository, GeoService geoService) {
        this.placeRepository = placeRepository;
        this.geoService = geoService;
    }

    public WishlistPlace addPlace(WishlistPlace place) {
        return placeRepository.save(place);
    }

    public List<NearbyPlaceResponse> findNearbyPlaces(Long userId, NearbyCheckRequest request) {
        List<WishlistPlace> unvisited = placeRepository.findByUserIdAndVisitedFalse(userId);

        return unvisited.stream()
            .map(place -> {
                double distance = geoService.calculateDistanceInMeters(
                    request.currentLat(), request.currentLon(),
                    place.getLatitude(), place.getLongitude()
                );
                return new NearbyPlaceResponse(place.getId(), place.getName(), place.getNotes(), distance);
            })
            .filter(response -> response.distanceMeters() <= request.radiusMeters())
            .sorted((a, b) -> Double.compare(a.distanceMeters(), b.distanceMeters()))
            .collect(Collectors.toList());
    }
}