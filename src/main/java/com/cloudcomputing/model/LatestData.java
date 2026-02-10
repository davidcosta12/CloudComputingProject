package com.cloudcomputing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "latest_data")
public class LatestData {

    @Id
    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "generation_timestamp")
    private LocalDateTime generationTimestamp;

    @Column(name = "historical_file_name")
    private String historicalFileName;

    public LatestData() {}

    // Getters e Setters
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public LocalDateTime getGenerationTimestamp() { return generationTimestamp; }
    public void setGenerationTimestamp(LocalDateTime generationTimestamp) { this.generationTimestamp = generationTimestamp; }

    public String getHistoricalFileName() { return historicalFileName; }
    public void setHistoricalFileName(String historicalFileName) { this.historicalFileName = historicalFileName; }
}