/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Ensure we can use same environment variables if needed, though they should be prefixed
    env: {
        // We can map old VITE vars here if we don't want to change .env file immediately, 
        // but better to use process.env in code. 
        // Just leaving this empty for standard config.
    },
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");
        config.resolve.alias = {
            ...config.resolve.alias,
            '@react-native-async-storage/async-storage': false,
        };
        return config;
    },
};

export default nextConfig;
