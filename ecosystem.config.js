module.exports = {
  apps: [
    {
      script: "api.js",
    },
    {
      script: "worker.js",
    },
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: "ubuntu",
      host: ["3.90.41.186"],
      ref: "origin/master",
      repo: "git@github.com:RSelwa/react-judas-server.git",
      path: "/var/www/react-judas-server",
      "post-deploy": "npm install && node index.js",
    },
  },
};
