module.exports = {
  apps: [
    {
      // Name of app
      name: "judas-server",
      // Script for pm2 run forever
      // If use static website, remove it
      script: "index.js",

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/

      // Args for script for pm2 run forever
      // If use static website, remove it
      args: "one two",
      // Current directory on server
      cwd: "/var/www/html/judas",
      // Config out file for web errors
      error_file: "/var/www/html/judas/logs/web.err.log",
      // Config out file for web logs
      out_file: "/var/www/html/judas/logs/web.out.log",
      // Number of instances to be started in cluster mode
      instances: 1,
      // Enable or disable auto restart after process failure
      autorestart: true,
      // Enable or disable the watch mode
      watch: false,
      // Restart the app if an amount of memory is exceeded (format: /0-9?/ K for KB, ‘M’ for MB, ‘G’ for GB, default to B)
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      // ^env_\S*$ => Specify environment variables to be injected when using –env
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],

  deploy: {
    production: {
      key: "~/aws-selwa.pem",

      // SSH user
      user: "ubuntu",
      // SSH host
      host: "54.152.51.61",
      //   host: "ec2-54-152-51-61.compute-1.amazonaws.com",
      // GIT remote/branch
      ref: "origin/master",
      // GIT remote
      repo: "git@github.com:RSelwa/react-judas-server.git",
      // Fetch all branches or fast
      fetch: "all",
      // Path in the server
      path: "/var/www/html/judas",
      // Command run after pull source code
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
    },
  },
};
