export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['node_modules/**', 'coverage/**', 'dist/**'],
  rules: {
    'alpha-value-notation': null,
    'at-rule-descriptor-value-no-unknown': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'color-hex-length': null,
    'color-no-hex': true,
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
      'color-mix',
    ],
    'declaration-property-value-disallowed-list': {
      '/^(?:color|background(?:-color)?|border(?:-.+)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow)$/':
        ['/(?:^|[\\s,(])(?:white|black|red|orange|green|blue)(?:$|[\\s,)])/'],
    },
    'comment-empty-line-before': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'declaration-property-value-keyword-no-deprecated': null,
    'declaration-property-value-allowed-list': {
      font: ['inherit', '/^var\\(--type-[a-z-]+\\)$/'],
      'font-family': ['inherit', '/^var\\(--font-sans\\)$/'],
      'font-size': ['inherit', '/^var\\(--font-size-[a-z0-9-]+\\)$/'],
      'font-weight': ['inherit', '/^var\\(--font-weight-[a-z-]+\\)$/'],
      'line-height': ['inherit', '/^var\\(--line-height-[a-z-]+\\)$/'],
      gap: [
        'var(--page-gap)',
        '/^(?:0|var\\(--space-(?:1|2|3|4|6|7)\\))(?: (?:0|var\\(--space-(?:1|2|3|4|6|7)\\)))?$/',
      ],
      'border-radius': [
        'inherit',
        '/^(?:0|var\\(--radius(?:-circle)?\\))(?: (?:0|var\\(--radius(?:-circle)?\\))){0,3}$/',
      ],
      'letter-spacing': ['inherit', '/^var\\(--letter-spacing-[a-z-]+\\)$/'],
    },
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'property-no-deprecated': null,
    'property-no-vendor-prefix': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
  },
  overrides: [
    {
      files: [
        'src/styles/tokens.css',
        'src/styles/print.css',
        'src/features/reports/components/PrintableOrders.module.css',
      ],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      files: ['src/features/reports/components/PrintableOrders.module.css'],
      rules: { 'declaration-property-value-allowed-list': null },
    },
  ],
};
