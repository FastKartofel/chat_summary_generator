package com.example.chatsum_backend.application;


import com.example.chatsum_backend.domain.ChatTurn;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Chunker {

    // MVP sizing: characters. We'll switch to token budgeting later.
    private static final int TARGET_CHUNK_CHARS = 12_000;
    private static final int MAX_CHUNK_CHARS = 15_000;

    private static final Logger log = LoggerFactory.getLogger(Chunker.class);

    public List<List<ChatTurn>> chunk(List<ChatTurn> turns) {
        log.debug("Chunking {} turn(s)", turns.size());
        List<List<ChatTurn>> chunks = new ArrayList<>();
        List<ChatTurn> current = new ArrayList<>();
        int currentSize = 0;

        for (ChatTurn turn : turns) {
            int turnSize = turn.content().length() + 20; // small overhead
            if (!current.isEmpty() && (currentSize + turnSize) > TARGET_CHUNK_CHARS) {
                chunks.add(current);
                current = new ArrayList<>();
                currentSize = 0;
            }

            // hard cap: if a single turn is massive, split it
            if (turnSize > MAX_CHUNK_CHARS) {
                // flush current first
                if (!current.isEmpty()) chunks.add(current);
                chunks.add(List.of(turn)); // MVP: keep as its own chunk
                current = new ArrayList<>();
                currentSize = 0;
                continue;
            }

            current.add(turn);
            currentSize += turnSize;
        }

        log.info("Chunking complete ({} chunk(s))", chunks.size());
        if (!current.isEmpty()) chunks.add(current);
        return chunks;
    }
}

