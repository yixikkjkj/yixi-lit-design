import config from '../../rspack.config.mjs';
import { fileURLToPath } from 'node:url';

// Isolated diagnosis: do not change the project's build configuration or dist.
export default {
  ...config,
  output: { ...config.output, path: fileURLToPath(new URL('./dist-fixed/', import.meta.url)) },
  module: {
    ...config.module,
    rules: config.module.rules.map(rule => rule.loader === 'builtin:swc-loader' ? {
      ...rule,
      options: { ...rule.options, jsc: { ...rule.options.jsc, transform: {
        ...rule.options.jsc.transform, useDefineForClassFields: false,
      } } },
    } : rule),
  },
};
