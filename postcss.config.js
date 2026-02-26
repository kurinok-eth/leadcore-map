import prefixSelector from 'postcss-prefix-selector';

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    'postcss-prefix-selector': {
      prefix: '#russia-map-root',
      exclude: [':root', ':host', 'html', 'body'],
      transform(prefix, selector, prefixedSelector) {
        // Уже заскоупленные — пропускаем
        if (selector.includes('#russia-map-root')) {
          return selector;
        }
        // @keyframes внутренние — пропускаем
        if (selector.includes('%')) {
          return selector;
        }
        return prefixedSelector;
      },
    },
  },
}
