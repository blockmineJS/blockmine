
module.exports = {
    apps: [{
      name: 'blockmine',
      script: './cli.js',
      cwd: './backend/',
      watch: false,
      env: {
        "NODE_ENV": "production",
      }
    }]
  };