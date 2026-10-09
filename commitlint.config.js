const { COMMITLINT_TYPES } = require('./commit-types');

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    'type-enum': [2, 'always', COMMITLINT_TYPES],
  },
};
