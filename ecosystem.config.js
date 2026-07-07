module.exports = {
  apps: [
    {
      name: 'baby-tracker',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.env.APP_DIR || '/apps/aira-tracker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
