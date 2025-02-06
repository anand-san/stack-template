import baseConfig from '@sandilya-stack/shared/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Frontend specific config extending base
const frontendConfig = {
  ...baseConfig,
  plugins: {
    ...baseConfig.plugins,
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...baseConfig.rules,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};

export default frontendConfig;
