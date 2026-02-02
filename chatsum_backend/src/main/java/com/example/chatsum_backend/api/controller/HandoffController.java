package com.example.chatsum_backend.api.controller;

import com.example.chatsum_backend.api.dto.HandoffRequest;
import com.example.chatsum_backend.api.dto.HandoffResponse;
import com.example.chatsum_backend.application.HandoffService;
import com.example.chatsum_backend.application.ModelLimits;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class HandoffController {

    private static final Logger log = LoggerFactory.getLogger(HandoffController.class);

    private final HandoffService handoffService;

    public HandoffController(HandoffService handoffService) {
        this.handoffService = handoffService;
    }

    @PostMapping(
            value = "/handoff",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public HandoffResponse generate(@Valid @RequestBody HandoffRequest request) {
        int transcriptLength = request.transcript().length();
        log.info("POST /api/handoff received (transcriptLength={} chars targetModel={} devMode={})",
                transcriptLength, request.targetModel(), request.developerMode());

        HandoffResponse response = handoffService.generate(
                request.transcript(),
                request.targetModel(),
                request.developerMode()
        );

        log.info("POST /api/handoff completed (summaryLength={}, seedPromptLength={}, neededContextLength={})",
                response.handoffSummary().length(),
                response.seedPrompt().length(),
                response.neededContext() == null ? 0 : response.neededContext().length()
        );

        return response;
    }
}
