const path = require('path');

module.exports = {
  header: '# История версий\n\n',
  preset: path.resolve(__dirname, 'changelog-preset.js'),
};
