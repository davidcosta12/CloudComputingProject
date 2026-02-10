package com.cloudcomputing.repository;

import com.cloudcomputing.model.LatestData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LatestRepository extends JpaRepository<LatestData, String> {

}