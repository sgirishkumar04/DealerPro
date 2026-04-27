package com.kia.dms.scheduler;

import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class AccountUnlockBatchConfig {

    @Bean
    public Step unlockAccountStep(JobRepository jobRepository, 
                                 PlatformTransactionManager transactionManager, 
                                 AccountUnlockTasklet tasklet) {
        return new StepBuilder("unlockAccountStep", jobRepository)
                .tasklet(tasklet, transactionManager)
                .build();
    }

    @Bean
    public Job unlockAccountJob(JobRepository jobRepository, Step unlockAccountStep) {
        return new JobBuilder("unlockAccountJob", jobRepository)
                .start(unlockAccountStep)
                .build();
    }
}
