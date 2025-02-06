import baseConfig from '@sandilya-stack/shared/config/eslint';

// Server specific config extending base
const serverConfig = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    'no-console': 'error',
  },
};

export default serverConfig;
