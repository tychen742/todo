const expo = require('eslint-config-expo/flat');

// Re-use the react-hooks plugin instance from the expo config so rule overrides work.
const reactHooksPlugin = expo[8].plugins['react-hooks'];

module.exports = [
  ...expo,
  {
    ignores: ['node_modules/', '.expo/', 'dist/'],
  },
  {
    // set-state-in-effect is overly strict for common async data-fetching patterns
    // (e.g. setLoading(true) at the start of an async load function called from an effect).
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
