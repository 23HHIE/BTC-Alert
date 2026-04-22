package com.example.btckafka;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-that-is-at-least-32-bytes-long!!";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, 3600000);
    }

    @Test
    void generate_thenExtractUsername() {
        String token = jwtUtil.generate("alice");
        assertEquals("alice", jwtUtil.extractUsername(token));
    }

    @Test
    void isValid_withValidToken() {
        String token = jwtUtil.generate("alice");
        assertTrue(jwtUtil.isValid(token));
    }

    @Test
    void isValid_withTamperedToken() {
        String token = jwtUtil.generate("alice") + "tampered";
        assertFalse(jwtUtil.isValid(token));
    }

    @Test
    void isValid_withRandomString() {
        assertFalse(jwtUtil.isValid("not.a.jwt"));
    }

    @Test
    void isValid_withExpiredToken() {
        JwtUtil shortLived = new JwtUtil(SECRET, -1);
        String token = shortLived.generate("alice");
        assertFalse(jwtUtil.isValid(token));
    }

    @Test
    void differentUsers_produceDifferentTokens() {
        String tokenA = jwtUtil.generate("alice");
        String tokenB = jwtUtil.generate("bob");
        assertNotEquals(tokenA, tokenB);
        assertEquals("alice", jwtUtil.extractUsername(tokenA));
        assertEquals("bob", jwtUtil.extractUsername(tokenB));
    }
}
