const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

// The keys we moved were: forgotPassword, forcePasswordChange, dashboard, lgList, sidebar, 
// userManagement, customerUserManagement, auditLogs, reports, modals, subscriptionPlans, public.

const movedKeys = [
    'forgotPassword', 'forcePasswordChange', 'dashboard', 'lgList', 'sidebar',
    'userManagement', 'customerUserManagement', 'auditLogs', 'reports', 'modals',
    'subscriptionPlans', 'public'
];

function undo(jsonObj) {
    if (jsonObj.pages) {
        for (const k of movedKeys) {
            if (jsonObj.pages[k]) {
                jsonObj[k] = jsonObj.pages[k];
                delete jsonObj.pages[k];
            }
        }
    }
}

undo(en);
undo(ar);

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));

console.log("Undid the previous script.");
console.log("EN Root keys:", Object.keys(en));

// Let's also see what keys are inside "pages" if it exists
if (en.pages) {
    console.log("EN pages keys:", Object.keys(en.pages));
}
