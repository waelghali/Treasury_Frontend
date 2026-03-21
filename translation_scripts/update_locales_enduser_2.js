const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arLocales = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const pagesEn = {
    endUserLgDetails: {
        "gracePeriodTooltip": "This action is disabled during your subscription's grace period.",
        "loading": "Loading LG record details...",
        "errorLoading": "Failed to load LG record details. {{error}}",
        "notFound": "LG Record not found.",
        "buttons": {
            "back": "Back to LG Records",
            "copy": "Copy LG Number",
            "extend": "Extend",
            "extendTooltip": "Extend LG",
            "amend": "Amend LG",
            "amendTooltip": "Amend LG",
            "decrease": "Decrease Amt",
            "decreaseTooltip": "Decrease LG Amount",
            "activate": "Activate",
            "activateTooltip": "Activate LG",
            "changeOwner": "Change Owner",
            "changeOwnerTooltip": "Change LG Owner",
            "release": "Release",
            "releaseTooltip": "Release LG",
            "liquidate": "Liquidate",
            "liquidateTooltip": "Liquidate LG",
            "view": "View",
            "viewTooltip": "View Document Securely"
        },
        "tabs": {
            "details": "Details",
            "documents": "Documents",
            "history": "Lifecycle History"
        },
        "sections": {
            "coreInfo": "LG Core Information",
            "bankInfo": "Bank & Rule Information",
            "internalInfo": "Internal & Category Details",
            "documents": "Associated Documents"
        },
        "fields": {
            "lgNumber": "LG Number:",
            "issuerName": "Issuer Name:",
            "beneficiary": "Beneficiary:",
            "amount": "Amount:",
            "issuanceDate": "Issuance Date:",
            "expiryDate": "Expiry Date:",
            "lgType": "LG Type:",
            "status": "Status:",
            "operationalStatus": "Operational Status:",
            "purpose": "Purpose:",
            "autoRenewal": "Auto Renewal:",
            "period": "Period (Months):",
            "issuingBank": "Issuing Bank:",
            "bankAddress": "Bank Address:",
            "bankPhone": "Bank Phone:",
            "issuingMethod": "Issuing Method:",
            "applicableRule": "Applicable Rule:",
            "rulesText": "Rules Text:",
            "advisingStatus": "Advising Status:",
            "advisingBank": "Advising Bank:",
            "otherConditions": "Other Conditions:",
            "internalOwner": "Internal Owner:",
            "ownerPhone": "Owner Phone:",
            "ownerManager": "Owner Manager:",
            "category": "LG Category:",
            "internalProjectId": "Internal Project ID:",
            "notes": "Notes:"
        },
        "messages": {
            "openingLetter": "Opening letter in new tab. Please check for pop-up blockers.",
            "errorOpeningLetter": "Could not open letter. {{error}}",
            "noLetter": "No generated letter found for this LG, or instruction ID is missing.",
            "actionSuccess": "LG action completed successfully!",
            "warnGraceDisabled": "This action is disabled during your subscription's grace period.",
            "autoRenewalSuccess": "Auto-renewal toggled successfully.",
            "autoRenewalError": "Failed to toggle auto-renewal. {{error}}",
            "sendReminderSuccess": "Reminder sent successfully.",
            "sendReminderError": "Failed to send reminder: {{error}}",
            "documentError": "Could not open document: {{error}}",
            "copySuccess": "LG Number copied to clipboard!",
            "noDocuments": "No documents associated with this LG record.",
            "refreshing": "Refreshing data...",
            "na": "N/A"
        }
    },
    endUserLgListExtra: {
        "gracePeriodTooltip": "This action is disabled during your subscription's grace period.",
        "messages": {
            "actionSuccess": "LG action completed successfully!",
            "errorOpeningLetter": "Could not open letter. {{error}}",
            "noLetter": "No generated letter found for this LG, or instruction ID is missing.",
            "openingLetter": "Opening letter in new tab. Please check for pop-up blockers.",
            "warnGraceDisabled": "This action is disabled during your subscription's grace period.",
            "autoRenewalError": "Failed to toggle auto-renewal. {{error}}",
            "loadError": "Failed to load LG Records. {{error}}",
            "noSelection": "No records match your filter criteria.",
            "viewLetter": "View Latest Letter"
        }
    }
};

const pagesAr = {
    endUserLgDetails: {
        "gracePeriodTooltip": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
        "loading": "جاري تحميل تفاصيل خطاب الضمان...",
        "errorLoading": "فشل تحميل تفاصيل خطاب الضمان. {{error}}",
        "notFound": "لم يتم العثور على خطاب الضمان.",
        "buttons": {
            "back": "العودة إلى السجلات",
            "copy": "نسخ رقم خطاب الضمان",
            "extend": "تمديد",
            "extendTooltip": "تمديد خطاب الضمان",
            "amend": "تعديل",
            "amendTooltip": "تعديل خطاب الضمان",
            "decrease": "تخفيض",
            "decreaseTooltip": "تخفيض قيمة خطاب الضمان",
            "activate": "تفعيل",
            "activateTooltip": "تفعيل خطاب الضمان",
            "changeOwner": "تغيير المالك",
            "changeOwnerTooltip": "تغيير مالك خطاب الضمان",
            "release": "إلغاء",
            "releaseTooltip": "إلغاء خطاب الضمان",
            "liquidate": "تسييل",
            "liquidateTooltip": "تسييل خطاب الضمان",
            "view": "عرض",
            "viewTooltip": "عرض المستند بأمان"
        },
        "tabs": {
            "details": "التفاصيل",
            "documents": "المستندات",
            "history": "تاريخ دورة الحياة"
        },
        "sections": {
            "coreInfo": "المعلومات الأساسية",
            "bankInfo": "معلومات البنك والقواعد",
            "internalInfo": "التفاصيل الداخلية والفئة",
            "documents": "المستندات المرتبطة"
        },
        "fields": {
            "lgNumber": "رقم خطاب الضمان:",
            "issuerName": "اسم المصدر:",
            "beneficiary": "المستفيد:",
            "amount": "القيمة:",
            "issuanceDate": "تاريخ الإصدار:",
            "expiryDate": "تاريخ الانتهاء:",
            "lgType": "نوع خطاب الضمان:",
            "status": "الحالة:",
            "operationalStatus": "الحالة التشغيلية:",
            "purpose": "الغرض:",
            "autoRenewal": "التجديد التلقائي:",
            "period": "فترة (أشهر):",
            "issuingBank": "البنك المصدر:",
            "bankAddress": "عنوان البنك:",
            "bankPhone": "هاتف البنك:",
            "issuingMethod": "طريقة الإصدار:",
            "applicableRule": "القاعدة المطبقة:",
            "rulesText": "نص القواعد:",
            "advisingStatus": "حالة التبليغ:",
            "advisingBank": "البنك المبلغ:",
            "otherConditions": "شروط أخرى:",
            "internalOwner": "المالك الداخلي:",
            "ownerPhone": "هاتف المالك:",
            "ownerManager": "مدير المالك:",
            "category": "فئة خطاب الضمان:",
            "internalProjectId": "معرف المشروع الداخلي:",
            "notes": "ملاحظات:"
        },
        "messages": {
            "openingLetter": "فتح الخطاب في علامة تبويب جديدة. يرجى التحقق من أدوات حظر النوافذ المنبثقة.",
            "errorOpeningLetter": "تعذر فتح الخطاب. {{error}}",
            "noLetter": "لم يتم العثور على خطاب مُنشأ لخطاب الضمان هذا، أو أن مُعرف التعليمات مفقود.",
            "actionSuccess": "تم تنفيذ الإجراء بنجاح!",
            "warnGraceDisabled": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
            "autoRenewalSuccess": "تم تبديل التجديد التلقائي بنجاح.",
            "autoRenewalError": "فشل في تبديل التجديد التلقائي. {{error}}",
            "sendReminderSuccess": "تم إرسال التذكير بنجاح.",
            "sendReminderError": "فشل إرسال التذكير: {{error}}",
            "documentError": "تعذر فتح المستند: {{error}}",
            "copySuccess": "تم نسخ رقم خطاب الضمان!",
            "noDocuments": "لا توجد مستندات مرتبطة بسجل خطاب الضمان هذا.",
            "refreshing": "جاري تحديث البيانات...",
            "na": "غير متوفر"
        }
    },
    endUserLgListExtra: {
        "gracePeriodTooltip": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
        "messages": {
            "actionSuccess": "تم تنفيذ الإجراء بنجاح!",
            "errorOpeningLetter": "تعذر فتح الخطاب. {{error}}",
            "noLetter": "لم يتم العثور على خطاب مُنشأ لخطاب الضمان هذا، أو أن مُعرف التعليمات مفقود.",
            "openingLetter": "فتح الخطاب في علامة تبويب جديدة. يرجى التحقق من أدوات حظر النوافذ المنبثقة.",
            "warnGraceDisabled": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
            "autoRenewalError": "فشل في تبديل التجديد التلقائي. {{error}}",
            "loadError": "فشل تحميل سجلات خطابات الضمان. {{error}}",
            "noSelection": "لا توجد سجلات تطابق معايير التصفية الخاصة بك.",
            "viewLetter": "عرض أحدث خطاب"
        }
    }
};

if (!enLocales.pages) enLocales.pages = {};
enLocales.pages = { ...enLocales.pages, ...pagesEn };

if (!arLocales.pages) arLocales.pages = {};
arLocales.pages = { ...arLocales.pages, ...pagesAr };

fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2) + '\n');
fs.writeFileSync(arPath, JSON.stringify(arLocales, null, 2) + '\n');

console.log('Locales updated for EndUser Batch 2.');
