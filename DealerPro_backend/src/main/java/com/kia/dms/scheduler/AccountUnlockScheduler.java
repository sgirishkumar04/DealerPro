package com.kia.dms.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Date;

@Component
public class AccountUnlockScheduler {

    private static final Logger log = LoggerFactory.getLogger(AccountUnlockScheduler.class);

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    private Job unlockAccountJob;

    // Run every minute
    @Scheduled(cron = "0 * * * * *")
    public void runUnlockJob() {
        log.info("Starting Account Unlock Batch Job at {}", new Date());
        try {
            JobParameters params = new JobParametersBuilder()
                    .addLong("time", System.currentTimeMillis())
                    .toJobParameters();
            jobLauncher.run(unlockAccountJob, params);
        } catch (Exception e) {
            log.error("Error executing Account Unlock Batch Job", e);
        }
    }
}
