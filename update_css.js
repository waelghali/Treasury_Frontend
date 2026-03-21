const fs = require('fs');
let css = fs.readFileSync('src/theme.css', 'utf8');

// Logical properties replacements
css = css.replace(/margin-left:/g, 'margin-inline-start:');
css = css.replace(/margin-right:/g, 'margin-inline-end:');
css = css.replace(/padding-left:/g, 'padding-inline-start:');
css = css.replace(/padding-right:/g, 'padding-inline-end:');
css = css.replace(/border-left:/g, 'border-inline-start:');
css = css.replace(/border-right:/g, 'border-inline-end:');
css = css.replace(/border-top-right-radius:/g, 'border-start-end-radius:');
css = css.replace(/border-bottom-right-radius:/g, 'border-end-end-radius:');
css = css.replace(/border-top-left-radius:/g, 'border-start-start-radius:');
css = css.replace(/border-bottom-left-radius:/g, 'border-end-start-radius:');
css = css.replace(/(?<!-)\bleft:/g, 'inset-inline-start:');
css = css.replace(/(?<!-)\bright:/g, 'inset-inline-end:');

// Add fonts
const fontCss = `
:root {
  --font-primary: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
}
[dir="rtl"] {
  --font-primary: 'Cairo', ui-sans-serif, system-ui, -apple-system, sans-serif;
}
body, .login-wrapper, .layout-wrapper {
  font-family: var(--font-primary) !important;
}
`;
css = fontCss + css;

// Deepen shadow for dark theme to look 'premium'
css = css.replace(/financial-dark/g, 'premium-dark');
css = css.replace(
    /--shadow-card: 0 32px 64px -12px rgba\(0,0,0,0\.5\);/g,
    `--shadow-card: 0 4px 6px -1px rgba(0,0,0,0.5), 0 24px 38px 3px rgba(0,0,0,0.25);`
);
css = css.replace(
    /--border-card: #374151;/g,
    `--border-card: #1f2937;`
);

fs.writeFileSync('src/theme.css', css);
console.log('CSS update complete.');
