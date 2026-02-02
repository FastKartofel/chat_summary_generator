package com.example.chatsum_backend;

import com.example.chatsum_backend.config.OpenAiProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(OpenAiProperties.class)
public class ChatsumBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatsumBackendApplication.class, args);
    }

}
