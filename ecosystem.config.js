module.exports = {
  apps: [
    {
      script: "index.js",
      watch: ".",
    },
    // {
    //   script: "./service-worker/",
    //   watch: ["./service-worker"],
    // },
  ],

  deploy: {
    production: {
      user: "debian",
      host: "162.19.27.74",
      ref: "origin/master",
      repo: "git@github.com:RSelwa/react-judas-server.git",
      path: "/var/www/html",
      "pre-deploy-local": "echo 'This is a local executed command'",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
