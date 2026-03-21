const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const rootKeysToKeep = ['common', 'treasury', 'auth', 'legal', 'layout', 'resetPassword', 'pages'];

function fixTranslations(jsonObj) {
    if (!jsonObj.pages) {
        jsonObj.pages = {};
    }

    const keys = Object.keys(jsonObj);
    for (const key of keys) {
        if (!rootKeysToKeep.includes(key)) {
            // Move it to pages
            jsonObj.pages[key] = jsonObj[key];
            delete jsonObj[key];
            console.log(`Moved '${key}' into 'pages'`);
        }
    }
}

console.log('Fixing EN translations:');
fixTranslations(en);
console.log('\nFixing AR translations:');
fixTranslations(ar);

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));

console.log('\nSuccessfully restructured translation files!');
