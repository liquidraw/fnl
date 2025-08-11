
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'halloffame.network' },
      { protocol: 'https', hostname: 'halloffame.network' }
    ]
  }
}
export default nextConfig
