import { createWebEslintConfig } from '@order-manager/eslint-config';

export default createWebEslintConfig({ ignores: ['public/mockServiceWorker.js'] });
