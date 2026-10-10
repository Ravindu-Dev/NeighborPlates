const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'render-component.js'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Replace stringify and printUpgradeWarning with exception-safe versions
  const targetPattern = /function printUpgradeWarning\(warning, originalProps\) \{[\s\S]*?function stringify\(object\) \{[\s\S]*?seen\.delete\(value\);[\s\S]*?return newValue;[\s\S]*?\}, 2\);[\s\S]*?\}/;

  const safeReplacement = `function printUpgradeWarning(warning, originalProps) {
    try {
        console.warn(\`CssInterop upgrade warning.\\n\\n\${warning}.\\n\\nThis warning was caused by a component with the props:\\n\${stringify(originalProps)}\\n\\nIf adding or removing sibling components caused this warning you should add a unique "key" prop to your components. https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key\\n\`);
    } catch (_) {
        console.warn(\`CssInterop upgrade warning.\\n\\n\${warning}\`);
    }
}
function stringify(object) {
    try {
        const seen = new WeakSet();
        return JSON.stringify(object, function replace(_, value) {
            if (!(value !== null && typeof value === "object")) {
                return value;
            }
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
            const newValue = Array.isArray(value) ? [] : {};
            for (const key of Object.keys(value)) {
                try {
                    newValue[key] = replace(key, value[key]);
                } catch {
                    // Ignore throwing getters (such as NavigationStateContext.getKey)
                }
            }
            seen.delete(value);
            return newValue;
        }, 2);
    } catch {
        return "[Props]";
    }
}`;

  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, safeReplacement);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-css-interop] Successfully patched react-native-css-interop render-component.js');
  } else if (content.includes('// Ignore throwing getters')) {
    console.log('[patch-css-interop] react-native-css-interop is already patched');
  } else {
    console.warn('[patch-css-interop] Warning: Could not match printUpgradeWarning pattern in render-component.js');
  }
} else {
  console.log('[patch-css-interop] react-native-css-interop render-component.js not found, skipping');
}
