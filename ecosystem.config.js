module.exports = {
  apps: [{
    name: 'blockmine',
    script: './backend/cli.js',
    cwd: './backend/',
    watch: false,
    env: {
      "NODE_ENV": "production",
    }
  }]
}; 