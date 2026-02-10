package com.cloudcomputing.repository;

import com.cloudcomputing.model.HistoricalData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HistoricalRepository extends JpaRepository<HistoricalData, Long> {


    List<HistoricalData> findByDeviceId(String deviceId);


    List<HistoricalData> findByDeviceIdIn(List<String> deviceIds);
}