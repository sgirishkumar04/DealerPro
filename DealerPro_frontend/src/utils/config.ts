// Configuration management utilities

export interface Configuration {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    enableAnalytics: boolean;
    enableFinance: boolean;
  };
  sessionTimeout: number;
  maxLoginAttempts: number;
  itemsPerPage: number;
}

export interface ConfigError {
  message: string;
  field?: string;
}

/**
 * Parse configuration from environment variables
 */
export const parseConfiguration = (): Configuration | ConfigError => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
    
    // Validate required fields
    if (!apiBaseUrl) {
      return {
        message: 'Missing required configuration: VITE_API_BASE_URL',
        field: 'apiBaseUrl',
      };
    }

    // Validate environment
    if (!['development', 'staging', 'production'].includes(environment)) {
      return {
        message: `Invalid environment: ${environment}. Must be one of: development, staging, production`,
        field: 'environment',
      };
    }

    const config: Configuration = {
      apiBaseUrl,
      environment: environment as Configuration['environment'],
      features: {
        enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false', // Default true
        enableFinance: import.meta.env.VITE_ENABLE_FINANCE !== 'false', // Default true
      },
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '1800', 10), // 30 minutes default
      maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5', 10),
      itemsPerPage: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE || '20', 10),
    };

    return config;
  } catch (error) {
    return {
      message: `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Pretty print configuration object to environment variable format
 */
export const prettyPrintConfiguration = (config: Configuration): string => {
  const lines: string[] = [
    '# DealerPro Frontend Configuration',
    '',
    '# API Configuration',
    `VITE_API_BASE_URL=${config.apiBaseUrl}`,
    `VITE_ENVIRONMENT=${config.environment}`,
    '',
    '# Feature Flags',
    `VITE_ENABLE_ANALYTICS=${config.features.enableAnalytics}`,
    `VITE_ENABLE_FINANCE=${config.features.enableFinance}`,
    '',
    '# Session Configuration',
    `VITE_SESSION_TIMEOUT=${config.sessionTimeout}`,
    `VITE_MAX_LOGIN_ATTEMPTS=${config.maxLoginAttempts}`,
    '',
    '# UI Configuration',
    `VITE_ITEMS_PER_PAGE=${config.itemsPerPage}`,
  ];

  return lines.join('\n');
};

/**
 * Get default configuration
 */
export const getDefaultConfiguration = (): Configuration => {
  return {
    apiBaseUrl: 'http://localhost:8082/api',
    environment: 'development',
    features: {
      enableAnalytics: true,
      enableFinance: true,
    },
    sessionTimeout: 1800, // 30 minutes
    maxLoginAttempts: 5,
    itemsPerPage: 20,
  };
};

/**
 * Validate configuration object
 */
export const validateConfiguration = (config: Configuration): ConfigError | null => {
  if (!config.apiBaseUrl) {
    return { message: 'API base URL is required', field: 'apiBaseUrl' };
  }

  if (!['development', 'staging', 'production'].includes(config.environment)) {
    return { message: 'Invalid environment', field: 'environment' };
  }

  if (config.sessionTimeout < 60) {
    return { message: 'Session timeout must be at least 60 seconds', field: 'sessionTimeout' };
  }

  if (config.maxLoginAttempts < 1) {
    return { message: 'Max login attempts must be at least 1', field: 'maxLoginAttempts' };
  }

  if (config.itemsPerPage < 1 || config.itemsPerPage > 100) {
    return { message: 'Items per page must be between 1 and 100', field: 'itemsPerPage' };
  }

  return null;
};

// Initialize and export configuration
let appConfig: Configuration;

try {
  const parsed = parseConfiguration();
  if ('message' in parsed) {
    console.warn('Configuration error:', parsed.message);
    appConfig = getDefaultConfiguration();
  } else {
    const validationError = validateConfiguration(parsed);
    if (validationError) {
      console.warn('Configuration validation error:', validationError.message);
      appConfig = getDefaultConfiguration();
    } else {
      appConfig = parsed;
    }
  }
} catch (error) {
  console.error('Failed to initialize configuration:', error);
  appConfig = getDefaultConfiguration();
}

export default appConfig;
