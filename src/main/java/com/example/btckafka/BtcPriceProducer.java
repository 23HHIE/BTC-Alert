package com.example.btckafka;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class BtcPriceProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final Random random = new Random();

    @Value("${app.kafka.topic}")
    private String topic;

    public BtcPriceProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedRate = 1000)
    public void sendPrice() {
        double price = 95.0 + (110.0 - 95.0) * random.nextDouble();
        String formatted = String.format("%.2f", price);
        kafkaTemplate.send(topic, formatted);
        System.out.println("Sent price: " + formatted);
    }
}
