package com.cloudcomputing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "historical_data")
public class HistoricalData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "records", columnDefinition = "TEXT")
    private String records;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public HistoricalData() {}

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getRecords() { return records; }
    public void setRecords(String records) { this.records = records; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}