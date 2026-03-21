const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesPath, 'en', 'translation.json');
const arPath = path.join(localesPath, 'ar', 'translation.json');

const enTranslations = {
    title: "Audit Logs",
    buttons: {
        showFilters: "Show Filters",
        hideFilters: "Hide Filters",
        clearFilters: "Clear Filters",
        applyFilters: "Apply Filters",
        exportToCSV: "Export to CSV"
    },
    filters: {
        userId: "User ID",
        actionType: "Action Type",
        entityType: "Entity Type",
        entityId: "Entity ID",
        startDate: "Start Date",
        endDate: "End Date",
        customerId: "Customer ID"
    },
    placeholders: {
        userId: "e.g., 1",
        actionType: "e.g., LOGIN_SUCCESS",
        entityType: "e.g., Customer",
        entityId: "e.g., 5",
        customerId: "e.g., 2"
    },
    messages: {
        loadError: "Failed to load audit logs. ",
        exportStarted: "Export started successfully.",
        exportFailed: "Export failed. ",
        loading: "Loading audit logs...",
        noLogsFound: "No audit logs found for the selected filters.",
        notAuth: "Authentication token not found. Please log in again.",
        unexpected: "An unexpected error occurred."
    },
    table: {
        timestamp: "Timestamp",
        userName: "User Name",
        customerId: "Customer ID",
        actionType: "Action Type",
        entityType: "Entity Type",
        entityId: "Entity ID",
        lgNumber: "LG Number",
        details: "Details",
        ipAddress: "IP Address"
    },
    details: {
        na: "N/A",
        action: "Action",
        file: "File",
        ocrChars: "OCR Chars",
        geminiPrompt: "Gemini Prompt",
        geminiCompletion: "Gemini Completion",
        tokens: "tokens",
        pages: "Pages",
        reason: "Reason",
        failureReason: "Failure Reason",
        logMetadata: "Log Metadata"
    }
};

const arTranslations = {
    title: "سجلات التدقيق",
    buttons: {
        showFilters: "إظهار الفلاتر",
        hideFilters: "إخفاء الفلاتر",
        clearFilters: "مسح الفلاتر",
        applyFilters: "تطبيق الفلاتر",
        exportToCSV: "تصدير إلى CSV"
    },
    filters: {
        userId: "معرف المستخدم",
        actionType: "نوع الإجراء",
        entityType: "نوع الكيان",
        entityId: "معرف الكيان",
        startDate: "تاريخ البدء",
        endDate: "تاريخ الانتهاء",
        customerId: "معرف العميل"
    },
    placeholders: {
        userId: "مثال: 1",
        actionType: "مثال: تسجيل_الدخول_بنجاح",
        entityType: "مثال: عميل",
        entityId: "مثال: 5",
        customerId: "مثال: 2"
    },
    messages: {
        loadError: "فشل في تحميل سجلات التدقيق. ",
        exportStarted: "بدأ التصدير بنجاح.",
        exportFailed: "فشل التصدير. ",
        loading: "جاري تحميل سجلات التدقيق...",
        noLogsFound: "لم يتم العثور على سجلات تدقيق للفلاتر المحددة.",
        notAuth: "لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول مرة أخرى.",
        unexpected: "حدث خطأ غير متوقع."
    },
    table: {
        timestamp: "الطابع الزمني",
        userName: "اسم المستخدم",
        customerId: "معرف العميل",
        actionType: "نوع الإجراء",
        entityType: "نوع الكيان",
        entityId: "معرف الكيان",
        lgNumber: "رقم خطاب الضمان",
        details: "التفاصيل",
        ipAddress: "عنوان IP"
    },
    details: {
        na: "غير متوفر",
        action: "الإجراء",
        file: "الملف",
        ocrChars: "أحرف تقنية التعرف الضوئي (OCR)",
        geminiPrompt: "استعلام متدرب Gemini",
        geminiCompletion: "اكتساب متدرب Gemini",
        tokens: "الرموز",
        pages: "الصفحات",
        reason: "السبب",
        failureReason: "سبب الفشل",
        logMetadata: "البيانات الوصفية للسجل"
    }
};


function updateFile(filePath, newKeys) {
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    content.auditLogs = newKeys; // Namespace the keys

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${filePath}`);
}

updateFile(enPath, enTranslations);
updateFile(arPath, arTranslations);
console.log('Audit Logs locales updated successfully.');
