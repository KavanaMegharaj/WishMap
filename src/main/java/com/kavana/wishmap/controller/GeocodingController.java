package com.kavana.wishmap.controller;

import com.kavana.wishmap.service.GeocodingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private final GeocodingService geocodingService;

    public GeocodingController(GeocodingService geocodingService) {
        this.geocodingService = geocodingService;
    }

    @GetMapping
    public List<Map<String, Object>> search(@RequestParam String query) {
        return geocodingService.search(query);
    }
}