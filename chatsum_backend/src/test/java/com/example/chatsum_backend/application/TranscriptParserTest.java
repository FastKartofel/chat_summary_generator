//package com.example.chatsum_backend.application;
//
//import com.example.chatsum_backend.domain.ChatTurn;
//import org.junit.jupiter.api.Test;
//
//import java.util.List;
//
//import static org.junit.jupiter.api.Assertions.*;
//
//class TranscriptParserTest {
//
//    private final TranscriptParser parser = new TranscriptParser();
//
//    @Test
//    void parse_emptyTranscript_returnsEmptyList() {
//        List<ChatTurn> turns = parser.parse("   \n  ");
//        assertNotNull(turns);
//        assertEquals(0, turns.size());
//    }
//
//    @Test
//    void parse_noMarkers_treatsWholeTextAsUnknownSingleTurn() {
//        String input = "We discussed an API design and decided to use REST.";
//        List<ChatTurn> turns = parser.parse(input);
//
//        assertEquals(1, turns.size());
//        assertEquals(ChatTurn.Role.UNKNOWN, turns.get(0).role());
//        assertEquals(input, turns.get(0).content());
//    }
//
//    @Test
//    void parse_userAndAssistantMarkers_splitsIntoTurns() {
//        String input = """
//                User: I have a bug in my API.
//                Assistant: What error do you see?
//                User: NullPointerException in HandoffService
//                Assistant: Add a null check.
//                """;
//
//        List<ChatTurn> turns = parser.parse(input);
//
//        assertEquals(4, turns.size());
//
//        assertEquals(ChatTurn.Role.USER, turns.get(0).role());
//        assertTrue(turns.get(0).content().contains("I have a bug"));
//
//        assertEquals(ChatTurn.Role.ASSISTANT, turns.get(1).role());
//        assertTrue(turns.get(1).content().contains("What error"));
//
//        assertEquals(ChatTurn.Role.USER, turns.get(2).role());
//        assertTrue(turns.get(2).content().contains("NullPointerException"));
//
//        assertEquals(ChatTurn.Role.ASSISTANT, turns.get(3).role());
//        assertTrue(turns.get(3).content().contains("Add a null check"));
//    }
//
//    @Test
//    void parse_preservesMultilineContentWithinTurn() {
//        String input = """
//                User: Here is code:
//                line1
//                line2
//                Assistant: Ok.
//                """;
//
//        List<ChatTurn> turns = parser.parse(input);
//
//        assertEquals(2, turns.size());
//        assertEquals(ChatTurn.Role.USER, turns.get(0).role());
//        assertTrue(turns.get(0).content().contains("Here is code:"));
//        assertTrue(turns.get(0).content().contains("line1"));
//        assertTrue(turns.get(0).content().contains("line2"));
//    }
//
//    @Test
//    void parse_leadingMarkerWithoutNewlineStillWorks() {
//        String input = "User: Hello\nAssistant: Hi";
//        List<ChatTurn> turns = parser.parse(input);
//
//        assertEquals(2, turns.size());
//        assertEquals(ChatTurn.Role.USER, turns.get(0).role());
//        assertEquals(ChatTurn.Role.ASSISTANT, turns.get(1).role());
//    }
//}
//
