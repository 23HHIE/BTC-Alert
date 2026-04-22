package com.example.btckafka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BtcKafkaApplication {

    public static void main(String[] args) {
        SpringApplication.run(BtcKafkaApplication.class, args);
    }
}
