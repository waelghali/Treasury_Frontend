const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.dashboard = {
    welcome: "Welcome to Your Dashboard",
    activeLgs: "Active LGs",
    lgsForRenewal: "LGs for Renewal",
    pendingPrints: "Pending Print Actions",
    quickActions: "Quick Actions",
    recentActivity: "Recent LG Activity",
    comingSoonActivity: "Coming soon: A list of your most recent LG records and actions.",
    loadingData: "Loading dashboard data...",
    failedToLoad: "Failed to load dashboard data: {{error}}",
    gracePeriodDisabled: "This action is disabled during your subscription's grace period.",
    recordNewLgTitle: "Record New LG",
    recordNewLgDesc: "Initiate the process to record a new Letter of Guarantee.",
    viewMyLgsTitle: "View My LGs",
    viewMyLgsDesc: "Access and manage your active Letters of Guarantee.",
    viewReportsTitle: "View Reports",
    viewReportsDesc: "Access various reports and analytics related to LGs."
};

ar.dashboard = {
    welcome: "مرحباً بك في لوحة المتابعة الخاصة بك",
    activeLgs: "خطابات الضمان السارية",
    lgsForRenewal: "خطابات الضمان المستحقة للتجديد",
    pendingPrints: "إجراءات الطباعة المعلقة",
    quickActions: "إجراءات سريعة",
    recentActivity: "أحدث أنشطة خطابات الضمان",
    comingSoonActivity: "قريباً: قائمة بأحدث سجلات وإجراءات خطابات الضمان الخاصة بك.",
    loadingData: "جاري تحميل بيانات لوحة المتابعة...",
    failedToLoad: "فشل تحميل بيانات لوحة المتابعة: {{error}}",
    gracePeriodDisabled: "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
    recordNewLgTitle: "تسجيل خطاب ضمان جديد",
    recordNewLgDesc: "بدء عملية تسجيل خطاب ضمان جديد.",
    viewMyLgsTitle: "عرض خطابات الضمان الخاصة بي",
    viewMyLgsDesc: "الوصول وإدارة خطابات الضمان السارية الخاصة بك.",
    viewReportsTitle: "عرض التقارير",
    viewReportsDesc: "الوصول إلى التقارير والتحليلات المختلفة المتعلقة بخطابات الضمان."
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Dashboard Locales updated.');
