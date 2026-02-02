package com.example.chatsum_backend.application;


import com.example.chatsum_backend.domain.ChatTurn;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class TranscriptParser {


    private static final Logger log = LoggerFactory.getLogger(TranscriptParser.class);


    /**
     * MVP parser:
     * - If transcript contains lines starting with "User:" / "Assistant:", split on those.
     * - Otherwise treat whole text as UNKNOWN.
     *
     * This will be upgraded later for ChatGPT export JSON ingestion.
     */
    public List<ChatTurn> parse(String transcript) {

        log.debug("Parsing transcript ({} chars)", transcript.length());
        String t = transcript.trim();
        if (t.isEmpty()) return List.of();

        boolean hasMarkers = t.contains("\nUser:") || t.startsWith("User:")
                || t.contains("\nAssistant:") || t.startsWith("Assistant:");

        if (!hasMarkers) {
            return List.of(new ChatTurn(ChatTurn.Role.UNKNOWN, t));
        }

        List<ChatTurn> turns = new ArrayList<>();
        ChatTurn.Role currentRole = ChatTurn.Role.UNKNOWN;
        StringBuilder buf = new StringBuilder();

        String[] lines = t.split("\n");
        for (String line : lines) {
            if (line.startsWith("User:")) {
                flush(turns, currentRole, buf);
                currentRole = ChatTurn.Role.USER;
                buf.append(line.substring("User:".length()).trim()).append("\n");
            } else if (line.startsWith("Assistant:")) {
                flush(turns, currentRole, buf);
                currentRole = ChatTurn.Role.ASSISTANT;
                buf.append(line.substring("Assistant:".length()).trim()).append("\n");
            } else {
                buf.append(line).append("\n");
            }
        }
        flush(turns, currentRole, buf);

        log.info("Transcript parsing complete ({} turns)", turns.size());
        return turns;
    }

    private void flush(List<ChatTurn> turns, ChatTurn.Role role, StringBuilder buf) {
        String content = buf.toString().trim();
        if (!content.isEmpty()) {
            turns.add(new ChatTurn(role, content));
        }
        buf.setLength(0);
    }
}

