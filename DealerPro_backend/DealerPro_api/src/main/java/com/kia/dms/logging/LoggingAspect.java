package com.kia.dms.logging;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
public class LoggingAspect {

    private final Logger log = LoggerFactory.getLogger(this.getClass());

    @Around("execution(* com.kia.dms.modules.*.service.*.*(..))")
    public Object logServiceMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        Object[] args = joinPoint.getArgs();
        
        log.info("Entering {}: with arguments = {}", methodName, Arrays.toString(args));
        
        long start = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long elapsedTime = System.currentTimeMillis() - start;
            
            String returnType = result != null ? result.getClass().getSimpleName() : "void";
            
            log.info("Exiting {}: returned = {}, execution time = {} ms", methodName, returnType, elapsedTime);
            return result;
        } catch (Throwable e) {
            long elapsedTime = System.currentTimeMillis() - start;
            log.error("Exception in {} after {} ms: \n{}", methodName, elapsedTime, e.getMessage(), e);
            throw e;
        }
    }
}
