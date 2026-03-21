const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arLocales = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const newPagesLocalesEn = {
    "migrationUpload": {
        "title": "Data Migration & Upload",
        "gracePeriodDisabled": "This action is disabled during your subscription's grace period.",
        "selectFile": "Select migration file",
        "orManualEntry": "Or enter JSON data manually",
        "uploadAndStage": "Upload & Stage Data",
        "finalizeMigration": "Finalize Migration (Import Ready Records)",
        "noRecordsMessage": "No staged records to display.",
        "cancel": "Cancel",
        "save": "Save",
        "delete": "Delete",
        "actions": "Actions",
        "status": "Status",
        "fileName": "File Name",
        "validationLog": "Validation Log",
        "historyPreviewTitle": "LG History Preview",
        "conflictDetected": "Conflict Detected",
        "conflictMessage": "Multiple snapshots for the same date/time. The last one in the series will be used. Please review carefully.",
        "initialRecord": "Initial Record",
        "amendment": "Amendment",
        "changesFromPrevious": "Changes from previous version:",
        "close": "Close",
        "noIssues": "No Issues",
        "revalidateSelected": "Re-validate Selected",
        "deprecatedProcess": "This process is now deprecated as records are processed automatically on upload.",
        "confirmFinalize": "Are you sure you want to finalize the migration and import {{count}} records? This action cannot be undone.",
        "confirmRevalidate": "Are you sure you want to re-validate the {{count}} selected records?",
        "confirmDelete": "Are you sure you want to delete record {{id}}?",
        "readyForImportError": "This record is already ready for import and cannot be edited. It must be processed or deleted."
    },
    "pendingApprovals": {
        "title": "Pending Approval Requests",
        "gracePeriodDisabled": "This action is disabled during your subscription's grace period.",
        "clearFilters": "Clear Filters",
        "export": "Export",
        "exportFiltered": "Export Filtered",
        "exportAll": "Export All",
        "searchPlaceholder": "Search LG No, Requestor, Authorizer...",
        "from": "From:",
        "to": "To:",
        "filterStatus": "Filter Status",
        "allStatuses": "All Statuses",
        "loading": "Loading approval requests...",
        "noRequests": "No requests match your criteria.",
        "tableHeaders": {
            "lgNumber": "LG Number",
            "actionType": "Action Type",
            "requestedBy": "Requested By",
            "requestedOn": "Requested On",
            "authRejBy": "Auth/Rej By",
            "status": "Status",
            "actions": "Actions"
        },
        "viewDetails": "View Details",
        "approve": "Approve",
        "reject": "Reject",
        "confirmApprove": "Are you sure you want to APPROVE this request?",
        "confirmReject": "Are you sure you want to REJECT this request? Please provide a reason (optional):",
        "na": "N/A"
    },
    "userForm": {
        "titleCreate": "Create New User",
        "titleEdit": "Edit User",
        "gracePeriodDisabled": "This action is disabled during your subscription's grace period.",
        "emailLabel": "Email",
        "roleLabel": "Role",
        "roles": {
            "end_user": "End User",
            "checker": "Checker",
            "viewer": "Viewer"
        },
        "passwordSection": "Password",
        "hidePassword": "Hide Password Fields",
        "changePassword": "Change Password",
        "passwordLabel": "Password",
        "confirmPasswordLabel": "Confirm Password",
        "requirePasswordChange": "Require password change on next login",
        "entityAccessSection": "Entity Access",
        "accessAllEntities": "Access all entities under this customer",
        "accessSpecificEntities": "Access specific entities",
        "selectEntities": "Select Entities:",
        "noEntities": "No entities available for this customer.",
        "cancel": "Cancel",
        "updateUser": "Update User",
        "createUser": "Create User",
        "loading": "Loading user data...",
        "errors": {
            "emailRoleRequired": "Email and Role are required.",
            "passwordRequired": "Password is required.",
            "passwordLength": "Password must be at least 8 characters long.",
            "entitySelectionRequired": "Please select at least one entity or grant access to all entities."
        }
    }
};

const newPagesLocalesAr = {
    "migrationUpload": {
        "title": "ترحيل البيانات ورفعها",
        "gracePeriodDisabled": "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        "selectFile": "حدد ملف الترحيل",
        "orManualEntry": "أو أدخل بيانات JSON يدوياً",
        "uploadAndStage": "رفع وتجهيز البيانات",
        "finalizeMigration": "إنهاء الترحيل (استيراد السجلات الجاهزة)",
        "noRecordsMessage": "لا توجد سجلات مجهزة لعرضها.",
        "cancel": "إلغاء",
        "save": "حفظ",
        "delete": "حذف",
        "actions": "الإجراءات",
        "status": "الحالة",
        "fileName": "اسم الملف",
        "validationLog": "سجل التحقق",
        "historyPreviewTitle": "معاينة سجل خطابات الضمان",
        "conflictDetected": "تم اكتشاف تعارض",
        "conflictMessage": "لقطات متعددة لنفس التاريخ/الوقت. سيتم استخدام الأخيرة في السلسلة. يرجى المراجعة بعناية.",
        "initialRecord": "السجل الأولي",
        "amendment": "تعديل",
        "changesFromPrevious": "التغييرات عن الإصدار السابق:",
        "close": "إغلاق",
        "noIssues": "لا توجد مشاكل",
        "revalidateSelected": "إعادة التحقق من المحدد",
        "deprecatedProcess": "هذه العملية مهملة الآن حيث تتم معالجة السجلات تلقائيًا عند الرفع.",
        "confirmFinalize": "هل أنت متأكد من رغبتك في إنهاء الترحيل واستيراد {{count}} من السجلات؟ لا يمكن التراجع عن هذا الإجراء.",
        "confirmRevalidate": "هل أنت متأكد من رغبتك في إعادة التحقق من {{count}} سجل محدد؟",
        "confirmDelete": "هل أنت متأكد من رغبتك في حذف السجل {{id}}؟",
        "readyForImportError": "هذا السجل جاهز بالفعل للاستيراد ولا يمكن تعديله. يجب معالجته أو حذفه."
    },
    "pendingApprovals": {
        "title": "طلبات الاعتماد المعلقة",
        "gracePeriodDisabled": "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        "clearFilters": "مسح الفلاتر",
        "export": "تصدير",
        "exportFiltered": "تصدير المصفى",
        "exportAll": "تصدير الكل",
        "searchPlaceholder": "ابحث برقم الضمان، طالب، معتمد...",
        "from": "من:",
        "to": "إلى:",
        "filterStatus": "تصفية الحالة",
        "allStatuses": "كل الحالات",
        "loading": "جاري تحميل طلبات النوافق...",
        "noRequests": "لا توجد طلبات تطابق معاييرك.",
        "tableHeaders": {
            "lgNumber": "رقم خطاب الضمان",
            "actionType": "نوع الإجراء",
            "requestedBy": "طلب بواسطة",
            "requestedOn": "طلب في",
            "authRejBy": "اعتماد/رفض بواسطة",
            "status": "الحالة",
            "actions": "الإجراءات"
        },
        "viewDetails": "عرض التفاصيل",
        "approve": "اعتماد",
        "reject": "رفض",
        "confirmApprove": "هل أنت متأكد من رغبتك في اعتماد هذا الطلب؟",
        "confirmReject": "هل أنت متأكد من أنك تريد رفض هذا الطلب؟ يرجى تقديم سبب (اختياري):",
        "na": "غير متوفر"
    },
    "userForm": {
        "titleCreate": "إنشاء مستخدم جديد",
        "titleEdit": "تعديل مستخدم",
        "gracePeriodDisabled": "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        "emailLabel": "البريد الإلكتروني",
        "roleLabel": "الدور",
        "roles": {
            "end_user": "مستخدم نهائي",
            "checker": "مدقق",
            "viewer": "مشاهد"
        },
        "passwordSection": "كلمة المرور",
        "hidePassword": "إخفاء حقول كلمة المرور",
        "changePassword": "تغيير كلمة المرور",
        "passwordLabel": "كلمة المرور",
        "confirmPasswordLabel": "تأكيد كلمة المرور",
        "requirePasswordChange": "طلب تغيير كلمة المرور عند تسجيل الدخول التالي",
        "entityAccessSection": "وصول الكيان",
        "accessAllEntities": "الوصول إلى جميع الكيانات التابعة لهذا العميل",
        "accessSpecificEntities": "الوصول إلى كيانات محددة",
        "selectEntities": "اختيار الكيانات:",
        "noEntities": "لا توجد كيانات متاحة لهذا العميل.",
        "cancel": "إلغاء",
        "updateUser": "تحديث المستخدم",
        "createUser": "إنشاء مستخدم",
        "loading": "جاري تحميل بيانات المستخدم...",
        "errors": {
            "emailRoleRequired": "البريد الإلكتروني والدور مطلوبان.",
            "passwordRequired": "كلمة المرور مطلوبة.",
            "passwordLength": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
            "entitySelectionRequired": "يرجى تحديد كيان واحد على الأقل أو منح حق الوصول لجميع الكيانات."
        }
    }
};

// Deep merge
const mergeDeep = (target, source) => {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], mergeDeep(target[key], source[key]))
        }
    }
    Object.assign(target || {}, source)
    return target
}

if (!enLocales.pages) enLocales.pages = {};
mergeDeep(enLocales.pages, newPagesLocalesEn);

if (!arLocales.pages) arLocales.pages = {};
mergeDeep(arLocales.pages, newPagesLocalesAr);

fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2) + '\n');
fs.writeFileSync(arPath, JSON.stringify(arLocales, null, 2) + '\n');

console.log('Locales updated for Batch 4 pages.');
