package com.kavana.wishmap.dto;

public record NearbyPlaceResponse(Long placeId, String name, String notes, double distanceMeters) {}