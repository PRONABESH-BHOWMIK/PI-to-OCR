module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F6F5',
        ink: '#16322A',
        mute: '#5C6F67',
        line: '#D9E0DC',
        bottle: { DEFAULT: '#0E4D3A', dark: '#0A3A2B' },
        marigold: { DEFAULT: '#F2B705', dark: '#DCA504' },
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
