const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.lgList = {
    titleOwner: "LGs for Owner ID: {{id}}",
    titleManage: "Manage LG Records",
    clearFilters: "Clear Filters",
    export: "Export",
    exportFiltered: "Export Filtered Data ({{count}})",
    exportAll: "Export All Data ({{count}})",
    actionHistory: "Action History",
    recordNewLg: "Record New LG",
    loading: "Loading LG records...",
    noLgsFound: "No LG records found for your customer.",
    searchPlaceholder: "Search by LG No., Issuer, Beneficiary, Bank, Category...",
    filterDate: "Filter by date",
    filterStatus: "Filter by Status",
    allStatuses: "All Statuses",
    filterType: "Filter by Type",
    allTypes: "All Types",
    refreshing: "Refreshing data...",
    headers: {
        lgNumber: "LG Number",
        issuerName: "Issuer Name",
        beneficiary: "Beneficiary",
        amount: "Amount",
        issuingBank: "Issuing Bank",
        category: "Category",
        expiryDate: "Expiry Date",
        status: "Status",
        actions: "Actions",
        autoRenewal: "Auto-Renewal"
    },
    toggleAutoRenewalOn: "Toggle auto-renewal (Current: ON)",
    toggleAutoRenewalOff: "Toggle auto-renewal (Current: OFF)"
};

ar.lgList = {
    titleOwner: "خطابات الضمان للمالك، معرف: {{id}}",
    titleManage: "إدارة سجلات خطابات الضمان",
    clearFilters: "مسح الفلاتر",
    export: "تصدير",
    exportFiltered: "تصدير البيانات المفلترة ({{count}})",
    exportAll: "تصدير كل البيانات ({{count}})",
    actionHistory: "سجل الإجراءات",
    recordNewLg: "تسجيل خطاب ضمان جديد",
    loading: "جاري تحميل سجلات خطابات الضمان...",
    noLgsFound: "لم يتم العثور على سجلات خطابات ضمان لعميلك.",
    searchPlaceholder: "بحث برقم الخطاب، المُصدر، المستفيد، البنك، الفئة...",
    filterDate: "تصفية حسب التاريخ",
    filterStatus: "تصفية حسب الحالة",
    allStatuses: "جميع الحالات",
    filterType: "تصفية حسب النوع",
    allTypes: "جميع الأنواع",
    refreshing: "جاري تحديث البيانات...",
    headers: {
        lgNumber: "رقم خطاب الضمان",
        issuerName: "اسم المُصدر",
        beneficiary: "المستفيد",
        amount: "المبلغ",
        issuingBank: "البنك المُصدر",
        category: "الفئة",
        expiryDate: "تاريخ الانتهاء",
        status: "الحالة",
        actions: "الإجراءات",
        autoRenewal: "تجديد تلقائي"
    },
    toggleAutoRenewalOn: "تبديل التجديد التلقائي (الحالي: مُفعل)",
    toggleAutoRenewalOff: "تبديل التجديد التلقائي (الحالي: معُطل)"
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('LG List Locales updated.');
