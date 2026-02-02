//package com.example.chatsum_backend.controller;
//
//import com.example.chatsum_backend.api.controller.HandoffController;
//import com.example.chatsum_backend.api.dto.HandoffResponse;
//import com.example.chatsum_backend.api.exception.GlobalExceptionHandler;
//import com.example.chatsum_backend.application.HandoffService;
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
//import org.springframework.context.annotation.Import;
//import org.springframework.http.MediaType;
//import org.springframework.test.context.bean.override.mockito.MockitoBean;
//import org.springframework.test.web.servlet.MockMvc;
//
//import static org.mockito.ArgumentMatchers.anyString;
//import static org.mockito.Mockito.when;
//import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
//import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
//
//@WebMvcTest(HandoffController.class)
//@Import(GlobalExceptionHandler.class)
//class HandoffControllerTest {
//
//    @Autowired
//    MockMvc mvc;
//
//    @MockitoBean
//    HandoffService handoffService;
//
//    @Test
//    void returns400WhenTranscriptBlank() throws Exception {
//        mvc.perform(post("/api/handoff")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content("{\"transcript\":\"\"}"))
//                .andExpect(status().isBadRequest())
//                .andExpect(content().contentType("application/problem+json"))
//                .andExpect(jsonPath("$.title").value("Validation failed"))
//                .andExpect(jsonPath("$.detail").value("transcript: transcript must not be blank"));
//    }
//
//    @Test
//    void returns200AndResponseBody() throws Exception {
//        when(handoffService.generate(anyString()))
//                .thenReturn(new HandoffResponse("sum", "state", "prompt"));
//
//        mvc.perform(post("/api/handoff")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content("{\"transcript\":\"User: hi\\nAssistant: hello\"}"))
//                .andExpect(status().isOk())
//                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
//                .andExpect(jsonPath("$.handoffSummary").value("sum"))
//                .andExpect(jsonPath("$.currentState").value("state"))
//                .andExpect(jsonPath("$.seedPrompt").value("prompt"));
//    }
//}
