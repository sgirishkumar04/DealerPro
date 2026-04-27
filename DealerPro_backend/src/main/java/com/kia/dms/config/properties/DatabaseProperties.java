package com.kia.dms.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.database")
public class DatabaseProperties {

    private String type = "sqlite";
    private Sync sync = new Sync();

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Sync getSync() {
        return sync;
    }

    public void setSync(Sync sync) {
        this.sync = sync;
    }

    public static class Sync {
        private boolean enabled = false;
        private String path;
        private int intervalMinutes = 30;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public int getIntervalMinutes() {
            return intervalMinutes;
        }

        public void setIntervalMinutes(int intervalMinutes) {
            this.intervalMinutes = intervalMinutes;
        }
    }
}
