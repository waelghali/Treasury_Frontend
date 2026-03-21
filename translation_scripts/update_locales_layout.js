const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.layout = {
    "treasury": "Treasury",
    "endUserEdition": "End User Edition",
    "dashboard": "Dashboard",
    "actionCenter": "Action Center",
    "recordNewLg": "Record New LG",
    "manageLgRecords": "Manage LG Records",
    "withdrawRequest": "Withdraw Request",
    "internalOwners": "Internal Owners",
    "reports": "Reports",
    "euBadge": "EU",
    "endUser": "End User",
    "org": "Org: {{name}}",
    "signOut": "Sign Out",
    "accountRestricted": "Account Restricted",
    "subscriptionExpired": "Your subscription has expired. Please contact your administrator to restore access."
};

ar.layout = {
    "treasury": "الخزانة",
    "endUserEdition": "نسخة المستخدم",
    "dashboard": "لوحة المتابعة",
    "actionCenter": "مركز الإجراءات",
    "recordNewLg": "تسجيل خطاب ضمان جديد",
    "manageLgRecords": "إدارة خطابات الضمان",
    "withdrawRequest": "طلب استرداد",
    "internalOwners": "المسؤولون الداخليون",
    "reports": "التقارير",
    "euBadge": "م.ن",
    "endUser": "مستخدم نهائي",
    "org": "المؤسسة: {{name}}",
    "signOut": "تسجيل الخروج",
    "accountRestricted": "الحساب مقيد",
    "subscriptionExpired": "لقد انتهت صلاحية اشتراكك. يرجى الاتصال بالمسؤول لاستعادة الوصول."
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Layout Locales updated.');
