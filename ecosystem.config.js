
module.exports = {
    apps: [{
      name: 'blockmine',
      script: './cli.js',
      cwd: './backend/',
      watch: false,
      autorestart: true,
      kill_timeout: 10000,
      env: {
        "NODE_ENV": "production",
      }
    }]
  };