export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        roseGold: '#e7bcb5',
        tkrIvory: '#fffaf5',
        tkrPink: '#fff1f2',
        tkrBlue: '#0f172a',
      },
      boxShadow: {
        glow: '0 0 10px rgba(249,168,212,0.4)',
      },
    },
  },
  plugins: [],
}
