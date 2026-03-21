const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arLocales = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const pagesEn = {
    endUserActionCenter: {
        "gracePeriodTooltip": "Subscription Grace Period Active. <br/> This action is temporarily restricted.",
        "title": "Action Center",
        "readOnly": "(Read Only)",
        "subtitle": "Overview of pending tasks, renewals, and bank communications.",
        "errorLoading": "Error loading data",
        "syncing": "Synchronizing with records...",
        "stats": {
            "pendingPrints": "Pending Prints",
            "dueRenewals": "Due Renewals",
            "awaitingDelivery": "Awaiting Delivery",
            "bankReplies": "Bank Replies"
        },
        "printing": {
            "title": "Approved Requests Pending Print",
            "bulkPrint": "Bulk Print",
            "bulkPrintSoon": "Bulk Print functionality coming soon!",
            "emptyTitle": "All Caught Up",
            "emptyDesc": "No approved requests are waiting to be printed.",
            "headers": {
                "lgNumber": "LG Number",
                "typeMaker": "Type & Maker",
                "approvalDate": "Approval Date",
                "action": "Action"
            },
            "printLetter": "Print Letter",
            "ref": "Ref:"
        },
        "renewals": {
            "title": "Approaching Expiry / Renewal",
            "autoRenewal": "Auto Renewal",
            "emptyTitle": "No Immediate Risks",
            "emptyDesc": "There are no LGs approaching expiry or requiring renewal.",
            "headers": {
                "lgDetails": "LG Details",
                "expiry": "Expiry",
                "status": "Status",
                "action": "Action"
            },
            "daysLeft": "{{days}} Days Left",
            "renew": "Renew"
        },
        "delivery": {
            "title": "Awaiting Delivery Confirmation",
            "emptyTitle": "Deliveries Up to Date",
            "emptyDesc": "All dispatched instructions have been marked as delivered.",
            "headers": {
                "instruction": "Instruction",
                "dates": "Dates",
                "delay": "Delay",
                "action": "Action"
            },
            "issued": "Issued: {{date}}",
            "daysPending": "{{days}} Days Pending",
            "confirmDelivery": "Confirm Delivery"
        },
        "replies": {
            "title": "Awaiting Bank Reply",
            "bulkReminders": "Bulk Reminders",
            "emptyTitle": "No Pending Replies",
            "emptyDesc": "The bank has responded to all your instructions.",
            "headers": {
                "lgNumber": "LG Number",
                "instruction": "Instruction",
                "timeline": "Timeline",
                "actions": "Actions"
            },
            "issued": "Issued: {{date}}",
            "delivered": "Delivered: {{date}}",
            "recordReply": "Record Reply",
            "viewReminder": "View Reminder",
            "remind": "Remind"
        },
        "messages": {
            "instructionIdMissing": "Instruction ID is missing.",
            "openingLetter": "Opening letter for LG {{lgNumber}}...",
            "errorOpeningLetter": "Error opening letter: {{error}}",
            "failedToLoadTasks": "Failed to load tasks: {{error}}",
            "actionDisabledGrace": "Subscription Grace Period: Action disabled.",
            "authRequired": "Authentication required.",
            "reminderGenerated": "Reminder generated for #{{serialNumber}}.",
            "popupBlocked": "Popup blocked.",
            "noContent": "Server returned no content.",
            "failedToSendReminder": "Failed to send reminder: {{error}}",
            "warnGraceDisabled": "Action disabled during grace period.",
            "dataMissing": "Data missing."
        }
    },
    endUserPendingApprovals: {
        "gracePeriodTooltip": "This action is disabled during your subscription's grace period.",
        "title": "My Pending Approval Requests",
        "loading": "Loading approval requests...",
        "empty": "No pending approval requests submitted by you at this time. All clear!",
        "headers": {
            "lgNumber": "LG Number",
            "actionType": "Action Type",
            "requestedBy": "Requested By",
            "requestedOn": "Requested On",
            "status": "Status",
            "actions": "Actions"
        },
        "viewDetails": "View Details",
        "withdrawRequest": "Withdraw Request",
        "noActions": "No actions",
        "messages": {
            "decodeFailed": "Failed to retrieve user information. Please log in again.",
            "fetchFailed": "Failed to load approval requests: {{error}}",
            "actionDisabledGrace": "This action is disabled during your subscription's grace period.",
            "confirmWithdraw": "Are you sure you want to WITHDRAW this request? This action cannot be undone.",
            "withdrawSuccess": "Approval request withdrawn successfully!",
            "withdrawFailed": "Failed to withdraw request: {{error}}"
        }
    }
};

const pagesAr = {
    endUserActionCenter: {
        "gracePeriodTooltip": "فترة السماح للاشتراك نشطة. <br/> تم تقييد هذا الإجراء مؤقتًا.",
        "title": "مركز الإجراءات",
        "readOnly": "(عرض فقط)",
        "subtitle": "نظرة عامة على المهام المعلقة والتجديدات ومراسلات البنك.",
        "errorLoading": "خطأ في تحميل البيانات",
        "syncing": "جاري المزامنة مع السجلات...",
        "stats": {
            "pendingPrints": "طباعة معلقة",
            "dueRenewals": "تجديدات مستحقة",
            "awaitingDelivery": "في انتظار التسليم",
            "bankReplies": "ردود البنك"
        },
        "printing": {
            "title": "الطلبات المعتمدة في انتظار الطباعة",
            "bulkPrint": "طباعة مجمعة",
            "bulkPrintSoon": "ميزة الطباعة المجمعة قريباً!",
            "emptyTitle": "لا يوجد مهام",
            "emptyDesc": "لا توجد طلبات معتمدة في انتظار الطباعة.",
            "headers": {
                "lgNumber": "رقم خطاب الضمان",
                "typeMaker": "النوع والمنشئ",
                "approvalDate": "تاريخ الاعتماد",
                "action": "إجراء"
            },
            "printLetter": "طباعة الخطاب",
            "ref": "مرجع:"
        },
        "renewals": {
            "title": "تقترب من الانتهاء / التجديد",
            "autoRenewal": "تجديد تلقائي",
            "emptyTitle": "لا توجد مخاطر فورية",
            "emptyDesc": "لا توجد خطابات ضمان تقترب من الانتهاء أو تتطلب التجديد.",
            "headers": {
                "lgDetails": "تفاصيل خطاب الضمان",
                "expiry": "الانتهاء",
                "status": "الحالة",
                "action": "إجراء"
            },
            "daysLeft": "متبقي {{days}} أيام",
            "renew": "تجديد"
        },
        "delivery": {
            "title": "في انتظار تأكيد التسليم",
            "emptyTitle": "التسليمات محدثة",
            "emptyDesc": "تم تحديد جميع التعليمات المرسلة على أنها مسلمة.",
            "headers": {
                "instruction": "تعليمة",
                "dates": "التواريخ",
                "delay": "التأخير",
                "action": "إجراء"
            },
            "issued": "تاريخ الإصدار: {{date}}",
            "daysPending": "معلق منذ {{days}} أيام",
            "confirmDelivery": "تأكيد التسليم"
        },
        "replies": {
            "title": "في انتظار رد البنك",
            "bulkReminders": "تذكيرات مجمعة",
            "emptyTitle": "لا توجد ردود معلقة",
            "emptyDesc": "قام البنك بالرد على جميع تعليماتك.",
            "headers": {
                "lgNumber": "رقم خطاب الضمان",
                "instruction": "تعليمة",
                "timeline": "الجدول الزمني",
                "actions": "إجراءات"
            },
            "issued": "تاريخ الإصدار: {{date}}",
            "delivered": "تم التسليم: {{date}}",
            "recordReply": "تسجيل الرد",
            "viewReminder": "عرض التذكير",
            "remind": "تذكير"
        },
        "messages": {
            "instructionIdMissing": "معرف التعليمة مفقود.",
            "openingLetter": "جاري فتح الخطاب لخطاب الضمان {{lgNumber}}...",
            "errorOpeningLetter": "خطأ في فتح الخطاب: {{error}}",
            "failedToLoadTasks": "فشل تحميل المهام: {{error}}",
            "actionDisabledGrace": "فترة سماح الاشتراك: الإجراء معطل.",
            "authRequired": "المصادقة مطلوبة.",
            "reminderGenerated": "تم إنشاء تذكير لـ #{{serialNumber}}.",
            "popupBlocked": "تم حظر النافذة المنبثقة.",
            "noContent": "لم يُرجع الخادم أي محتوى.",
            "failedToSendReminder": "فشل إرسال التذكير: {{error}}",
            "warnGraceDisabled": "تم تعطيل الإجراء أثناء فترة السماح.",
            "dataMissing": "بيانات مفقودة."
        }
    },
    endUserPendingApprovals: {
        "gracePeriodTooltip": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
        "title": "طلبات الاعتماد المعلقة الخاصة بي",
        "loading": "جاري تحميل طلبات الاعتماد...",
        "empty": "لا توجد طلبات اعتماد معلقة مقدمة بواسطتك في هذا الوقت. كل شيء واضح!",
        "headers": {
            "lgNumber": "رقم خطاب الضمان",
            "actionType": "نوع الإجراء",
            "requestedBy": "طلب بواسطة",
            "requestedOn": "تاريخ الطلب",
            "status": "الحالة",
            "actions": "إجراءات"
        },
        "viewDetails": "عرض التفاصيل",
        "withdrawRequest": "سحب الطلب",
        "noActions": "لا توجد إجراءات",
        "messages": {
            "decodeFailed": "فشل استرداد معلومات المستخدم. يرجى تسجيل الدخول مرة أخرى.",
            "fetchFailed": "فشل تحميل طلبات الاعتماد: {{error}}",
            "actionDisabledGrace": "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
            "confirmWithdraw": "هل أنت متأكد من أنك تريد سحب هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
            "withdrawSuccess": "تم سحب طلب الاعتماد بنجاح!",
            "withdrawFailed": "فشل سحب الطلب: {{error}}"
        }
    }
};

if (!enLocales.pages) enLocales.pages = {};
enLocales.pages = { ...enLocales.pages, ...pagesEn };

if (!arLocales.pages) arLocales.pages = {};
arLocales.pages = { ...arLocales.pages, ...pagesAr };

fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2) + '\n');
fs.writeFileSync(arPath, JSON.stringify(arLocales, null, 2) + '\n');

console.log('Locales updated for EndUser Batch 1.');
