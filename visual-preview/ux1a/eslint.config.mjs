import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config({
  files: ['visual-preview/ux1a/**/*.{ts,tsx}'],
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: { globals: globals.browser },
  plugins: { 'react-hooks': hooks },
  rules: { ...hooks.configs.recommended.rules },
});
