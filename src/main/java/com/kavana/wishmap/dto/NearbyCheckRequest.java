package com.kavana.wishmap.dto;

public record NearbyCheckRequest(double currentLat, double currentLon, double radiusMeters) {}