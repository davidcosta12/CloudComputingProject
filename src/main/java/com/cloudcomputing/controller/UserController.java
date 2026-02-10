package com.cloudcomputing.controller;

import com.cloudcomputing.model.HistoricalData;
import com.cloudcomputing.model.LatestData;
import com.cloudcomputing.repository.HistoricalRepository;
import com.cloudcomputing.repository.LatestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${FRONTEND_URL:http://localhost:3000}")
public class UserController {

    @Autowired
    private LatestRepository latestRepo;

    @Autowired
    private HistoricalRepository historicalRepo;

    @GetMapping("/dashboard-data")
    public ResponseEntity<?> getDashboardData(@AuthenticationPrincipal Jwt jwt, Authentication auth) {

        System.out.println("--- Debug Dashboard Request ---");
        // Tentativa de ler de diferentes claims comuns no Cognito
        String email = jwt.getClaimAsString("email");
        String username = jwt.getClaimAsString("cognito:username");

        // Atributo essencial para o utilizador comum
        String userDeviceId = jwt.getClaimAsString("custom:device_id");

        System.out.println("Utilizador: " + (email != null ? email : username));
        System.out.println("Authorities: " + auth.getAuthorities());
        System.out.println("ID do Dispositivo extraído: " + userDeviceId);

        // 1. Verificar se é Admin
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_Admin") ||
                        a.getAuthority().equalsIgnoreCase("Admin"));

        if (isAdmin) {
            System.out.println("Acesso ADMIN confirmado.");
            return ResponseEntity.ok(Map.of(
                    "role", "admin",
                    "latest", latestRepo.findAll(),
                    "historical", historicalRepo.findAll()
            ));
        }

        // 2. Lógica para User Comum
        if (userDeviceId == null || userDeviceId.isEmpty()) {
            System.out.println("Acesso negado: custom:device_id é null.");
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Acesso Negado",
                    "message", "O seu token AWS não contém o atributo 'custom:device_id'. Verifique as permissões no Cognito."
            ));
        }

        System.out.println("Acesso USER confirmado para device: " + userDeviceId);

        // Busca dados filtrados
        Optional<LatestData> latest = latestRepo.findById(userDeviceId);
        List<HistoricalData> history = historicalRepo.findByDeviceId(userDeviceId);

        return ResponseEntity.ok(Map.of(
                "role", "user",
                "device_id", userDeviceId,
                "latest", latest.isPresent() ? List.of(latest.get()) : List.of(),
                "historical", history
        ));
    }
}