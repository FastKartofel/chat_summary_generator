//package com.example.chatsum_backend.application;
//
//import com.example.chatsum_backend.domain.ChatTurn;
//import org.junit.jupiter.api.Test;
//
//import java.util.List;
//
//import static org.junit.jupiter.api.Assertions.*;
//
//class ChunkerTest {
//
//    private final Chunker chunker = new Chunker();
//
//    @Test
//    void chunk_emptyTurns_returnsEmptyChunks() {
//        List<List<ChatTurn>> chunks = chunker.chunk(List.of());
//        assertNotNull(chunks);
//        assertEquals(0, chunks.size());
//    }
//
//    @Test
//    void chunk_smallTurns_fitIntoSingleChunk() {
//        List<ChatTurn> turns = List.of(
//                new ChatTurn(ChatTurn.Role.USER, "Hi"),
//                new ChatTurn(ChatTurn.Role.ASSISTANT, "Hello"),
//                new ChatTurn(ChatTurn.Role.USER, "Short message")
//        );
//
//        List<List<ChatTurn>> chunks = chunker.chunk(turns);
//
//        assertEquals(1, chunks.size());
//        assertEquals(3, chunks.get(0).size());
//        assertEquals(turns, chunks.get(0));
//    }
//
//    @Test
//    void chunk_largeConversation_splitsIntoMultipleChunks_preservingOrder() {
//        // Create many turns to exceed the char budget
//        String big = "x".repeat(6000);
//        List<ChatTurn> turns = List.of(
//                new ChatTurn(ChatTurn.Role.USER, big),
//                new ChatTurn(ChatTurn.Role.ASSISTANT, big),
//                new ChatTurn(ChatTurn.Role.USER, big)
//        );
//
//        List<List<ChatTurn>> chunks = chunker.chunk(turns);
//
//        assertTrue(chunks.size() >= 2, "Expected multiple chunks due to size");
//
//        // Flatten and ensure order preserved
//        List<ChatTurn> flattened = chunks.stream().flatMap(List::stream).toList();
//        assertEquals(turns, flattened);
//    }
//
//    @Test
//    void chunk_singleHugeTurn_becomesItsOwnChunk() {
//        // Make a single turn bigger than MAX_CHUNK_CHARS (15_000-ish in your impl)
//        String huge = "y".repeat(20000);
//        List<ChatTurn> turns = List.of(new ChatTurn(ChatTurn.Role.USER, huge));
//
//        List<List<ChatTurn>> chunks = chunker.chunk(turns);
//
//        assertEquals(1, chunks.size());
//        assertEquals(1, chunks.get(0).size());
//        assertEquals(huge, chunks.get(0).get(0).content());
//    }
//
//    @Test
//    void chunk_doesNotDropTurns() {
//        String mid = "m".repeat(4000);
//        List<ChatTurn> turns = List.of(
//                new ChatTurn(ChatTurn.Role.USER, mid),
//                new ChatTurn(ChatTurn.Role.ASSISTANT, mid),
//                new ChatTurn(ChatTurn.Role.USER, mid),
//                new ChatTurn(ChatTurn.Role.ASSISTANT, mid)
//        );
//
//        List<List<ChatTurn>> chunks = chunker.chunk(turns);
//
//        int totalTurns = chunks.stream().mapToInt(List::size).sum();
//        assertEquals(turns.size(), totalTurns);
//    }
//}
//
