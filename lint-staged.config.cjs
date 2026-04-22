export default {
  'backend/**/*.{js,mjs}': [
    'prettier --write',
    'eslint --fix',
  ],
  'frontend/**/*.{js,ts,vue,mjs}': [
    'prettier --write',
    'eslint --fix',
  ],
};