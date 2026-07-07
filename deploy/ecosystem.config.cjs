module.exports = {
  apps: [
    {
      name: "school-app",
      cwd: "/var/www/school-management-system",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        USE_DATABASE: "true",
        NEXT_PUBLIC_USE_DATABASE: "true",
      },
    },
  ],
};
