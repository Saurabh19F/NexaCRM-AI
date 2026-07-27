package com.nexacrm.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${nexacrm.cache.dashboard-ttl-seconds:30}")
    private long dashboardTtlSeconds;

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer))
                .disableCachingNullValues();

        RedisCacheConfiguration dashboardConfig = defaultConfig
                .entryTtl(Duration.ofSeconds(dashboardTtlSeconds));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig.entryTtl(Duration.ofMinutes(5)))
                .withCacheConfiguration("dashboard-summary", dashboardConfig)
                .withCacheConfiguration("dashboard-funnel", dashboardConfig)
                .withCacheConfiguration("dashboard-employees", dashboardConfig)
                .withCacheConfiguration("dashboard-sources", dashboardConfig)
                .withCacheConfiguration("dashboard-activities", dashboardConfig)
                .withCacheConfiguration("dashboard-trend", dashboardConfig)
                .build();
    }
}
