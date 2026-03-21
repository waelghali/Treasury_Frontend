const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'locales', 'en', 'translation.json');
const arPath = path.join(__dirname, 'src', 'locales', 'ar', 'translation.json');

const enStrings = {
    "pages": {
        "actionCenter": {
            "title": "Action Center"
        },
        "auditLogsCorporate": {
            "title": "Audit Logs (Corporate)",
            "loading": "Loading audit logs...",
            "noLogsFound": "No audit logs found for your organization.",
            "showFilters": "Show Filters",
            "hideFilters": "Hide Filters",
            "userId": "User ID",
            "actionType": "Action Type",
            "entityType": "Entity Type",
            "entityId": "Entity ID",
            "startDate": "Start Date",
            "endDate": "End Date",
            "clearFilters": "Clear Filters",
            "applyFilters": "Apply Filters",
            "exportToCsv": "Export to CSV",
            "tableCols": {
                "timestamp": "Timestamp",
                "userName": "User Name",
                "actionType": "Action Type",
                "entityType": "Entity Type",
                "entityName": "Entity Name",
                "lgNumber": "LG Number",
                "details": "Details",
                "ipAddress": "IP Address"
            },
            "system": "System",
            "na": "N/A"
        },
        "corporateAdminDashboard": {
            "title": "Corporate Admin Dashboard",
            "loading": "Loading Corporate Admin Dashboard...",
            "avgDeliveryDays": "Average Delivery Days",
            "overall": "Overall:",
            "days": "days",
            "lgTypeMix": "LG Type Mix",
            "outerGlobalInnerYours": "(Outer: Global | Inner: Your Figures)",
            "noDataAvailable": "No data available.",
            "avgDaysToAction": "Avg. Days to Action",
            "bankMarketShare": "Bank Market Share",
            "totalLgVolume": "Total LG Volume",
            "lgRecords": "LG Records",
            "avgProcessingTimesByBank": "Average Processing Times by Bank",
            "quickActions": "Quick Actions",
            "quickActionsList": {
                "manageLgCategories": "Manage LG Categories",
                "manageLgCategoriesDesc": "Create and organize customer-specific LG categories",
                "manageUsers": "Manage Users",
                "manageUsersDesc": "Add, edit, and deactivate users for your organization",
                "moduleConfigs": "Module Configurations",
                "moduleConfigsDesc": "Adjust settings for subscribed modules (e.g., LG Custody)"
            }
        },
        "customerConfigurationManagement": {
            "title": "Module Settings (Customer Configurations)",
            "loading": "Loading settings...",
            "manageEmailSettings": "Manage Email Settings",
            "subscriptionAndUsage": "Subscription & Usage",
            "plan": "Plan:",
            "currentTerm": "Current Term",
            "startDate": "Start Date:",
            "renewalDate": "Renewal Date:",
            "usageLimits": "Usage Limits",
            "activeUsers": "Active Users",
            "activeLgRecords": "Active LG Records",
            "planFeatures": "Plan Features",
            "makerChecker": "Maker-Checker",
            "multiEntity": "Multi-Entity",
            "aiScan": "AI Scan",
            "docStorage": "Doc Storage"
        }
    }
};

const arStrings = {
    "pages": {
        "actionCenter": {
            "title": "مركز الإجراءات"
        },
        "auditLogsCorporate": {
            "title": "سجلات التدقيق (الشركات)",
            "loading": "جاري تحميل سجلات التدقيق...",
            "noLogsFound": "لا توجد سجلات تدقيق لمؤسستك.",
            "showFilters": "إظهار الفلاتر",
            "hideFilters": "إخفاء الفلاتر",
            "userId": "معرف المستخدم",
            "actionType": "نوع الإجراء",
            "entityType": "نوع الكيان",
            "entityId": "معرف الكيان",
            "startDate": "تاريخ البدء",
            "endDate": "تاريخ الانتهاء",
            "clearFilters": "مسح الفلاتر",
            "applyFilters": "تطبيق الفلاتر",
            "exportToCsv": "تصدير إلى CSV",
            "tableCols": {
                "timestamp": "طابع زمني",
                "userName": "اسم المستخدم",
                "actionType": "نوع الإجراء",
                "entityType": "نوع الكيان",
                "entityName": "اسم الكيان",
                "lgNumber": "رقم خطاب الضمان",
                "details": "التفاصيل",
                "ipAddress": "عنوان IP"
            },
            "system": "النظام",
            "na": "غير متوفر"
        },
        "corporateAdminDashboard": {
            "title": "لوحة تحكم مسؤول الشركة",
            "loading": "جاري تحميل لوحة تحكم مسؤول الشركة...",
            "avgDeliveryDays": "متوسط أيام التسليم",
            "overall": "الإجمالي:",
            "days": "أيام",
            "lgTypeMix": "مزيج أنواع خطابات الضمان",
            "outerGlobalInnerYours": "(الخارجي: عالمي | الداخلي: أرقامك)",
            "noDataAvailable": "لا توجد بيانات متاحة.",
            "avgDaysToAction": "متوسط الأيام لاتخاذ إجراء",
            "bankMarketShare": "الحصة السوقية للبنوك",
            "totalLgVolume": "إجمالي حجم خطابات الضمان",
            "lgRecords": "سجلات خطابات الضمان",
            "avgProcessingTimesByBank": "متوسط أوقات المعالجة حسب البنك",
            "quickActions": "إجراءات سريعة",
            "quickActionsList": {
                "manageLgCategories": "إدارة فئات خطابات الضمان",
                "manageLgCategoriesDesc": "إنشاء وتنظيم فئات خطابات الضمان الخاصة بالعميل",
                "manageUsers": "إدارة المستخدمين",
                "manageUsersDesc": "إضافة وتعديل وإلغاء تنشيط مستخدمي مؤسستك",
                "moduleConfigs": "تكوينات النظام",
                "moduleConfigsDesc": "ضبط إعدادات الوحدات المشترك بها (مثل حفظ خطابات الضمان)"
            }
        },
        "customerConfigurationManagement": {
            "title": "إعدادات النظام (تكوينات العملاء)",
            "loading": "جاري تحميل الإعدادات...",
            "manageEmailSettings": "إدارة إعدادات البريد الإلكتروني",
            "subscriptionAndUsage": "الاشتراك والاستخدام",
            "plan": "الخطة:",
            "currentTerm": "المدة الحالية",
            "startDate": "تاريخ البدء:",
            "renewalDate": "تاريخ التجديد:",
            "usageLimits": "حدود الاستخدام",
            "activeUsers": "المستخدمون النشطون",
            "activeLgRecords": "سجلات خطابات الضمان النشطة",
            "planFeatures": "ميزات الخطة",
            "makerChecker": "صانع-مدقق",
            "multiEntity": "متعدد الكيانات",
            "aiScan": "مسح ذكي",
            "docStorage": "تخزين المستندات"
        }
    }
};

function updateFile(filePath, newStrings) {
    if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.pages) parsed.pages = {};

        // Deep merge
        for (const page in newStrings.pages) {
            if (!parsed.pages[page]) parsed.pages[page] = {};
            Object.assign(parsed.pages[page], newStrings.pages[page]);
        }

        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`Updated ${filePath}`);
    } else {
        console.error(`File not found: ${filePath}`);
    }
}

updateFile(enPath, enStrings);
updateFile(arPath, arStrings);
