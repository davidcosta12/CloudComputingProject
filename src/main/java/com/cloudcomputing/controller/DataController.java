package com.cloudcomputing.controller;

import com.cloudcomputing.model.HistoricalData;
import com.cloudcomputing.model.LatestData;
import com.cloudcomputing.repository.HistoricalRepository;
import com.cloudcomputing.repository.LatestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/data")
@CrossOrigin(origins = "${FRONTEND_URL:http://localhost:3000}")
public class DataController {

    @Autowired
    private HistoricalRepository historicalRepo;

    // VISTA PARA ADMIN: Puxa o histórico de todos os devices do sistema
    @GetMapping("/history/all")
    public List<HistoricalData> getAllHistory() {
        return historicalRepo.findAll();
    }

    // VISTA PARA UTILIZADOR: O React passa a lista de IDs que o user possui
    @PostMapping("/history/by-devices")
    public List<HistoricalData> getHistoryByDevices(@RequestBody List<String> deviceIds) {
        return historicalRepo.findByDeviceIdIn(deviceIds);
    }
}