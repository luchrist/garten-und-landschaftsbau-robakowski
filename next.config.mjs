/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // The embeddable widgets are meant to be iframed by the customer's
        // existing website, so they must not carry a frame-blocking header.
        source: "/widget/:path*",
        headers: [{ key: "X-Frame-Options", value: "ALLOWALL" }]
      }
    ];
  }
};

export default nextConfig;
