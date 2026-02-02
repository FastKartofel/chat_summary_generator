//package com.example.chatsum_backend.application;
//
//import com.example.chatsum_backend.api.dto.HandoffResponse;
//import com.example.chatsum_backend.openai.OpenAiClient;
//import org.junit.jupiter.api.Test;
//
//import static org.junit.jupiter.api.Assertions.*;
//import static org.mockito.ArgumentMatchers.anyString;
//import static org.mockito.ArgumentMatchers.contains;
//import static org.mockito.Mockito.mock;
//import static org.mockito.Mockito.when;
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.mockito.Mockito.*;
//import static org.mockito.ArgumentMatchers.*;
//
//
//class HandoffServiceTest {
//
//    @Test
//    void callsOpenAiForChunkSummariesAndMerge() {
//        TranscriptParser parser = new TranscriptParser();
//        Chunker chunker = new Chunker();
//
//        OpenAiClient openAi = mock(OpenAiClient.class);
//
//        // For chunk summary calls, we only use res.handoffSummary()
//        when(openAi.callStructuredHandoff(anyString(), contains("Chunk")))
//                .thenReturn(new OpenAiClient.StructuredHandoff(
//                        "chunk-summary", "ignored", "ignored"
//                ));
//
//        // For merge call, return final structured output
//        when(openAi.callStructuredHandoff(anyString(), contains("Produce the final handoff")))
//                .thenReturn(new OpenAiClient.StructuredHandoff(
//                        "FINAL_SUMMARY", "FINAL_STATE", "FINAL_PROMPT"
//                ));
//
//        HandoffService service = new HandoffService(parser, chunker, openAi);
//
//        String transcript = """
//                User: Hello
//                Assistant: Hi!
//                User: Can you summarize this?
//                Assistant: Sure.
//                """;
//
//        HandoffResponse res = service.generate(transcript);
//
//        assertThat(res.handoffSummary()).isEqualTo("FINAL_SUMMARY");
//        assertThat(res.currentState()).isEqualTo("FINAL_STATE");
//        assertThat(res.seedPrompt()).isEqualTo("FINAL_PROMPT");
//
//        // verify: at least one chunk call + one merge call happened
//        verify(openAi, atLeastOnce()).callStructuredHandoff(anyString(), contains("Chunk"));
//        verify(openAi, times(1)).callStructuredHandoff(anyString(), contains("Produce the final handoff"));
//    }
//}
//
