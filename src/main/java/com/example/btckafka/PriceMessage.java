package com.example.btckafka;

public class PriceMessage {
    private double price;
    private boolean alert;
    private long timestamp;

    public PriceMessage(double price, boolean alert) {
        this.price = price;
        this.alert = alert;
        this.timestamp = System.currentTimeMillis();
    }

    public double getPrice() { return price; }
    public boolean isAlert() { return alert; }
    public long getTimestamp() { return timestamp; }
}
