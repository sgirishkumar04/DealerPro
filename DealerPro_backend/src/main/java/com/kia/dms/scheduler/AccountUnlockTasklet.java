package com.kia.dms.scheduler;

import com.kia.dms.modules.user.entity.UserEntity;
import com.kia.dms.modules.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.StepContribution;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class AccountUnlockTasklet implements Tasklet {

    private static final Logger log = LoggerFactory.getLogger(AccountUnlockTasklet.class);

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        log.info("Executing AccountUnlockTasklet - Checking for expired account locks...");
        
        LocalDateTime now = LocalDateTime.now();
        
        // Find all users who are locked and whose lock duration has expired
        // Note: Using a custom repository method would be more efficient, 
        // but for this implementation we'll find all with a lock and filter.
        
        List<UserEntity> lockedUsers = userRepository.findAll(); // In a real app, use a specific query
        
        int count = 0;
        for (UserEntity user : lockedUsers) {
            if (user.getAccountLockedUntil() != null && now.isAfter(user.getAccountLockedUntil())) {
                log.info("Unlocking account for user: {}", user.getEmail());
                user.setAccountLockedUntil(null);
                user.setFailedLoginAttempts(0);
                user.setLastFailedLogin(null);
                userRepository.save(user);
                count++;
            }
        }
        
        log.info("AccountUnlockTasklet completed. {} accounts unlocked.", count);
        return RepeatStatus.FINISHED;
    }
}
