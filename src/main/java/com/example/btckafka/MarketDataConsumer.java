package com.example.btckafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class MarketDataConsumer {

    private static final String RED_BOLD = "\033[1;31m";
    private static final String RESET = "\033[0m";

    private final SimpMessagingTemplate messagingTemplate;

    public MarketDataConsumer(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "${app.kafka.topic}", groupId = "${spring.kafka.consumer.group-id}")
    public void consume(String message) {
        double price = Double.parseDouble(message);
        boolean isAlert = price > 105.0;

        if (isAlert) {
            System.out.println(RED_BOLD + "🚨 ALERT: BTC Price Spike! Current: " + message + RESET);
        } else {
            System.out.println("Price: " + message);
        }

        messagingTemplate.convertAndSend("/topic/prices", new PriceMessage(price, isAlert));
    }
}
