import { createNodeEslintConfig } from '@order-manager/eslint-config';

export default createNodeEslintConfig({ ignores: ['dist', 'coverage'] });
