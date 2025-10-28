module.exports = {
  reactStrictMode: true,
  turbopack: {}, // Empty turbopack config to avoid the "webpack config with no turbopack config" error
  images: {
    domains: ['example.com'], // Add your image domains here
  },
  webpack: (config) => {
    // Custom webpack configuration can go here
    return config;
  },
};