const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.sidebar = {
    overview: "Overview",
    dashboard: "Dashboard",
    issuance: "Issuance",
    requestsInbox: "Requests Inbox",
    bankFacilities: "Bank Facilities",
    lgManagement: "LG Management",
    allLgs: "All LG Records",
    pendingApprovals: "Pending Approvals",
    actionCenter: "Action Center",
    configuration: "Configuration",
    userManagement: "User Management",
    issuanceConfig: "Issuance Form Config",
    settings: "Settings",
    lgCategories: "LG Categories",
    system: "System",
    auditLogs: "Audit Logs",
    reports: "Reports",
    migrationHub: "Migration Hub",
    signOut: "Sign Out",
    corporateAdmin: "Corporate Admin",
    org: "Org: {{name}}"
};

ar.sidebar = {
    overview: "نظرة عامة",
    dashboard: "لوحة المتابعة",
    issuance: "الإصدار",
    requestsInbox: "صندوق الطلبات",
    bankFacilities: "التسهيلات البنكية",
    lgManagement: "إدارة الضمانات",
    allLgs: "جميع السجلات",
    pendingApprovals: "الموافقات المعلقة",
    actionCenter: "مركز الإجراءات",
    configuration: "الإعدادات",
    userManagement: "إدارة المستخدمين",
    issuanceConfig: "إعداد نموذج الإصدار",
    settings: "إعدادات النظام",
    lgCategories: "فئات الضمان",
    system: "النظام",
    auditLogs: "سجلات التدقيق",
    reports: "التقارير",
    migrationHub: "مركز الترحيل",
    signOut: "تسجيل الخروج",
    corporateAdmin: "مسؤول الشركة",
    org: "المؤسسة: {{name}}"
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Sidebar Locales updated.');
