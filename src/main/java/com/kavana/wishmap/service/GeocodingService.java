package com.kavana.wishmap.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeocodingService {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://nominatim.openstreetmap.org")
            .defaultHeader("User-Agent", "WishMap-StudentProject/1.0")   // required by Nominatim's usage policy
            .build();

    public List<Map<String, Object>> search(String query) {
        // Bounded to Bangalore using a viewbox + bounded=1, per your requirement
        return restClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/search")
                .queryParam("q", query)
                .queryParam("format", "json")
                .queryParam("limit", 5)
                .queryParam("viewbox", "77.4601,13.1436,77.7840,12.7343") // Bangalore bounding box (lon,lat,lon,lat)
                .queryParam("bounded", 1)
                .build())
            .retrieve()
            .body(List.class);
    }
}