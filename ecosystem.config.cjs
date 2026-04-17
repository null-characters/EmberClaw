/**
 * EmberClaw pm2 Configuration
 * 
 * Installation:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 * 
 * Management:
 *   pm2 status
 *   pm2 logs emberclaw
 *   pm2 restart emberclaw
 *   pm2 stop emberclaw
 *   pm2 delete emberclaw
 * 
 * Auto-start on boot:
 *   pm2 startup
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'emberclaw',
      
      // Entry point
      script: 'bin/emberclaw.mjs',
      
      // Arguments
      args: 'daemon',
      
      // Working directory
      cwd: __dirname,
      
      // Interpreter (for ES modules)
      interpreter: 'node',
      interpreter_args: '--experimental-specifier-resolution=node',
      
      // Instance settings
      instances: 1,
      exec_mode: 'fork',
      
      // Restart settings
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      
      // Memory management
      max_memory_restart: '1G',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        HEALTH_PORT: 9876,
      },
      
      // Log settings
      log_file: '.emberclaw/logs/pm2-combined.log',
      out_file: '.emberclaw/logs/pm2-out.log',
      error_file: '.emberclaw/logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Cron restart (optional - restart every day at 3am)
      // cron_restart: '0 3 * * *',
    },
    
    // Development mode (optional)
    {
      name: 'emberclaw-dev',
      script: 'bin/emberclaw.mjs',
      args: '',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      autorestart: false,
      watch: ['src', 'bin', 'config'],
      ignore_watch: ['node_modules', '.emberclaw', 'logs'],
      env: {
        NODE_ENV: 'development',
        HEALTH_PORT: 9877,
      },
    },
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'emberclaw',
      host: ['server1.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:null-characters/EmberClaw.git',
      path: '/opt/emberclaw',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --only emberclaw',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
