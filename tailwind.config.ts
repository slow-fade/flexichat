import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#111111',
        sidebar: '#161616'
      }
    }
  },
  plugins: []
};

export default config;
