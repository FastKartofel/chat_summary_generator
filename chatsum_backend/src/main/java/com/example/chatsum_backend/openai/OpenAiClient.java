package com.example.chatsum_backend.openai;

import com.example.chatsum_backend.config.OpenAiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class OpenAiClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final OpenAiProperties props;
    private final ObjectMapper om;
    private final HttpClient http;

    public OpenAiClient(OpenAiProperties props, ObjectMapper om) {
        this.props = props;
        this.om = om;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(props.timeouts().connectSeconds()))
                .build();
    }

    /**
     * Structured Outputs call: returns strict JSON matching the schema.
     * We ALWAYS use props.model() for the OpenAI model (e.g. "gpt-5.2" from config).
     */
    public StructuredHandoff callStructuredHandoff(String instructions, String userContent) {
        long t0 = System.nanoTime();
        try {
            // Build a strict JSON schema output (Structured Outputs)
            String body = """
            {
              "model": "%s",
              "instructions": %s,
              "input": [
                { "role": "user", "content": %s }
              ],
              "text": {
                "format": {
                  "type": "json_schema",
                  "name": "handoff",
                  "strict": true,
                  "schema": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "handoffSummary": { "type": "string" },
                      "currentState":   { "type": "string" },
                      "seedPrompt":     { "type": "string" },
                      "neededContext":  { "type": "string" }
                    },
                    "required": ["handoffSummary","currentState","seedPrompt","neededContext"]
                  }
                }
              }
            }
            """.formatted(
                    props.model(),
                    om.writeValueAsString(instructions),
                    om.writeValueAsString(userContent)
            );

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(props.timeouts().requestSeconds()))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = sendWithRetry(req);
            long ms = (System.nanoTime() - t0) / 1_000_000;

            if (res.statusCode() / 100 != 2) {
                log.error("OpenAI error status={} body={}", res.statusCode(), safeTrim(res.body(), 1200));
                throw new RuntimeException("OpenAI call failed: HTTP " + res.statusCode());
            }

            JsonNode root = om.readTree(res.body());

            // Structured output lives in output_text; parse it as JSON
            String outputText = extractOutputText(root);
            JsonNode parsed = om.readTree(outputText);

            int inputTokens = root.path("usage").path("input_tokens").asInt(0);
            int outputTokens = root.path("usage").path("output_tokens").asInt(0);
            BigDecimal cost = estimateCostUsd(inputTokens, outputTokens);

            log.info(
                    "OpenAI response ok model={} inputTokens={} outputTokens={} estCostUsd={} latencyMs={}",
                    props.model(), inputTokens, outputTokens, cost, ms
            );

            return new StructuredHandoff(
                    parsed.path("handoffSummary").asText(""),
                    parsed.path("currentState").asText(""),
                    parsed.path("seedPrompt").asText(""),
                    parsed.path("neededContext").asText("")
            );

        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000;
            log.error("OpenAI call failed latencyMs={} err={}", ms, e.toString());
            throw new RuntimeException("OpenAI call failed", e);
        }
    }

    /**
     * Plain text call that lets you control max_output_tokens.
     * NOTE: This returns ONLY the assistant output text (not JSON).
     */
    public String callTextWithMaxOutputTokens(String instructions, String userContent, int maxOutputTokens) {
        long t0 = System.nanoTime();
        try {
            String body = """
            {
              "model": "%s",
              "instructions": %s,
              "max_output_tokens": %d,
              "input": [
                { "role": "user", "content": %s }
              ]
            }
            """.formatted(
                    props.model(), // ALWAYS from config (e.g. gpt-5.2)
                    om.writeValueAsString(instructions),
                    maxOutputTokens,
                    om.writeValueAsString(userContent)
            );

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + props.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = sendWithRetry(req);
            long ms = (System.nanoTime() - t0) / 1_000_000;

            if (res.statusCode() / 100 != 2) {
                log.error("OpenAI callText error status={} body={}", res.statusCode(), safeTrim(res.body(), 1200));
                throw new RuntimeException("OpenAI callText failed: HTTP " + res.statusCode());
            }

            JsonNode root = om.readTree(res.body());

            // In Responses API, assistant output text is returned in output[].content[].type=output_text
            String out = extractOutputText(root);

            int inputTokens = root.path("usage").path("input_tokens").asInt(0);
            int outputTokens = root.path("usage").path("output_tokens").asInt(0);
            BigDecimal cost = estimateCostUsd(inputTokens, outputTokens);

            log.info(
                    "OpenAI text ok model={} maxOutputTokens={} inputTokens={} outputTokens={} estCostUsd={} latencyMs={}",
                    props.model(), maxOutputTokens, inputTokens, outputTokens, cost, ms
            );

            return out;

        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000;
            log.error("OpenAI callText failed latencyMs={} err={}", ms, e.toString());
            throw new RuntimeException("OpenAI callText failed", e);
        }
    }

    private BigDecimal estimateCostUsd(int inputTokens, int outputTokens) {
        BigDecimal in = BigDecimal.valueOf(inputTokens)
                .multiply(BigDecimal.valueOf(props.pricing().inputPer1M()))
                .divide(BigDecimal.valueOf(1_000_000), 10, BigDecimal.ROUND_HALF_UP);

        BigDecimal out = BigDecimal.valueOf(outputTokens)
                .multiply(BigDecimal.valueOf(props.pricing().outputPer1M()))
                .divide(BigDecimal.valueOf(1_000_000), 10, BigDecimal.ROUND_HALF_UP);

        return in.add(out).setScale(6, BigDecimal.ROUND_HALF_UP);
    }

    private static String extractOutputText(JsonNode root) {
        // Walk: output[] -> content[] -> where type == "output_text"
        for (JsonNode item : root.path("output")) {
            if (!"message".equals(item.path("type").asText())) continue;
            for (JsonNode c : item.path("content")) {
                if ("output_text".equals(c.path("type").asText())) {
                    return c.path("text").asText();
                }
            }
        }
        throw new RuntimeException("No output_text found in OpenAI response");
    }

    private static String safeTrim(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private HttpResponse<String> sendWithRetry(HttpRequest req) throws Exception {
        int maxAttempts = 3;
        long backoffMs = 500;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return http.send(req, HttpResponse.BodyHandlers.ofString());
            } catch (java.net.http.HttpTimeoutException e) {
                if (attempt == maxAttempts) throw e;
                Thread.sleep(backoffMs);
                backoffMs *= 2;
            }
        }
        throw new IllegalStateException("unreachable");
    }

    public record StructuredHandoff(
            String handoffSummary,
            String currentState,
            String seedPrompt,
            String neededContext
    ) {}
}
