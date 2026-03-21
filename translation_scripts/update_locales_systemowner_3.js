const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const extensionsEn = {
    globalConfigurationList: {
        title: "Global Ranges Configurations",
        buttons: {
            addNew: "Add New Configuration"
        },
        messages: {
            loadError: "Failed to load global configurations. Please try again.",
            restoreConfirm: "Are you sure you want to restore the configuration \"{{name}}\"?",
            restoreSuccess: "Global configuration \"{{name}}\" restored successfully.",
            loading: "Loading global configurations...",
            noItems: "No global configurations found matching your criteria."
        },
        filters: {
            filterPlaceholder: "Filter by key, description, or value...",
            allGroups: "All Groups",
            security: "Security & Authentication",
            limits: "System Limits & Timers",
            communication: "Communication & Alerts",
            compliance: "Document Compliance & Requirements",
            general: "General"
        },
        table: {
            key: "Key",
            description: "Description",
            min: "Min",
            max: "Max",
            default: "Default",
            unit: "Unit",
            actions: "Actions",
            restoreTooltip: "Restore Configuration",
            toggleTooltip: "Toggle On/Off",
            editTooltip: "Edit Configuration",
            na: "N/A"
        }
    },
    templateList: {
        title: "Templates Management",
        buttons: {
            addNew: "Add New Template"
        },
        messages: {
            loadError: "Failed to load templates. {{message}}",
            deleteConfirm: "Are you sure you want to soft-delete the template \"{{name}}\"?",
            deleteError: "Failed to delete: {{message}}",
            restoreConfirm: "Restore template \"{{name}}\"?",
            restoreError: "Failed to restore: {{message}}",
            loading: "Loading templates..."
        },
        filters: {
            searchPlaceholder: "Search by name...",
            allActionTypes: "All Action Types",
            globalAndCustomer: "Global & Customer",
            globalOnly: "Global Only",
            customerOnly: "Customer Only"
        },
        table: {
            templateId: "Template ID",
            name: "Name",
            type: "Type",
            actionType: "Action Type",
            global: "Global",
            customerId: "Customer ID",
            status: "Status",
            actions: "Actions",
            yes: "Yes",
            no: "No",
            deleted: "Deleted",
            active: "Active",
            na: "N/A",
            restoreTooltip: "Restore",
            editTooltip: "Edit",
            deleteTooltip: "Delete"
        }
    },
    templateForm: {
        formTitles: {
            create: "Create New Template",
            edit: "Edit Template"
        },
        messages: {
            metaLoadError: "Failed to load system configuration constants.",
            loadError: "Failed to load template details.",
            customerLoadError: "Failed to load customer list.",
            saveSuccess: "Template saved successfully!",
            saveError: "Error: {{message}}",
            loading: "Loading..."
        },
        fields: {
            name: "Template Name",
            templateType: "Template Type",
            actionType: "Action Type",
            selectType: "Select Type",
            selectAction: "Select Action",
            globalTemplate: "Global Template",
            customer: "Customer",
            selectCustomer: "Select Customer",
            emailSubject: "Email Subject",
            subjectPlaceholder: "e.g. Reminder: LG #{{lg_number}} Expiring Soon",
            content: "Template Content"
        },
        buttons: {
            cancel: "Cancel",
            update: "Update Template",
            create: "Create Template"
        },
        placeholdersInfo: {
            title: "Available Placeholders",
            instruction: "Click to insert at cursor position",
            emptyText: "Select an Action Type to see placeholders."
        }
    },
    schedulerPage: {
        title: "Scheduler Management",
        messages: {
            loadError: "Failed to fetch scheduled jobs. Please check API status.",
            actionError: "Error performing action: {{message}}",
            rescheduleError: "Error rescheduling job: {{message}}",
            loading: "Loading data...",
            noJobs: "No scheduled jobs found."
        },
        table: {
            name: "Name",
            id: "ID",
            nextRunTime: "Next Run Time",
            trigger: "Trigger",
            actions: "Actions",
            na: "N/A",
            runNowTooltip: "Run Now",
            pauseTooltip: "Pause Job",
            resumeTooltip: "Resume Job",
            rescheduleTooltip: "Reschedule Job"
        },
        rescheduleForm: {
            title: "Reschedule: {{name}}",
            triggerType: "Trigger Type",
            cron: "Cron (Recurring)",
            dateType: "Date (One-time)",
            hour: "Hour (0-23)",
            minute: "Minute (0-59)",
            specificDate: "Specific Date/Time (for 'date' trigger)",
            submit: "Reschedule Job"
        }
    }
};

const extensionsAr = {
    globalConfigurationList: {
        title: "تكوينات النطاقات العامة",
        buttons: {
            addNew: "إضافة تكوين جديد"
        },
        messages: {
            loadError: "فشل تحميل التكوينات العامة. يرجى المحاولة مرة أخرى.",
            restoreConfirm: "هل أنت متأكد أنك تريد استعادة التكوين \"{{name}}\"؟",
            restoreSuccess: "تم استعادة التكوين العام \"{{name}}\" بنجاح.",
            loading: "جارٍ تحميل التكوينات العامة...",
            noItems: "لم يتم العثور على تكوينات عامة تطابق معاييرك."
        },
        filters: {
            filterPlaceholder: "تصفية حسب المفتاح، الوصف، أو القيمة...",
            allGroups: "كل المجموعات",
            security: "الأمان والمصادقة",
            limits: "حدود ومؤقتات النظام",
            communication: "الاتصالات والتنبيهات",
            compliance: "متطلبات وامتثال المستندات",
            general: "عام"
        },
        table: {
            key: "المفتاح",
            description: "الوصف",
            min: "الحد الأدنى",
            max: "الحد الأقصى",
            default: "الافتراضي",
            unit: "الوحدة",
            actions: "إجراءات",
            restoreTooltip: "استعادة التكوين",
            toggleTooltip: "تبديل تشغيل/إيقاف",
            editTooltip: "تعديل التكوين",
            na: "غير متاح"
        }
    },
    templateList: {
        title: "إدارة القوالب",
        buttons: {
            addNew: "إضافة قالب جديد"
        },
        messages: {
            loadError: "فشل تحميل القوالب. {{message}}",
            deleteConfirm: "هل أنت متأكد أنك تريد الحذف الاسترجاعي للقالب \"{{name}}\"؟",
            deleteError: "فشل الحذف: {{message}}",
            restoreConfirm: "هل تريد استعادة القالب \"{{name}}\"؟",
            restoreError: "فشل الاستعادة: {{message}}",
            loading: "جارٍ تحميل القوالب..."
        },
        filters: {
            searchPlaceholder: "البحث بالاسم...",
            allActionTypes: "كل أنواع الإجراءات",
            globalAndCustomer: "عام وخاص بالعميل",
            globalOnly: "عام فقط",
            customerOnly: "خاص بالعميل فقط"
        },
        table: {
            templateId: "رقم القالب",
            name: "الاسم",
            type: "النوع",
            actionType: "نوع الإجراء",
            global: "عام",
            customerId: "رقم العميل",
            status: "الحالة",
            actions: "إجراءات",
            yes: "نعم",
            no: "لا",
            deleted: "محذوف",
            active: "نشط",
            na: "غير متاح",
            restoreTooltip: "استعادة",
            editTooltip: "تعديل",
            deleteTooltip: "حذف"
        }
    },
    templateForm: {
        formTitles: {
            create: "إنشاء قالب جديد",
            edit: "تعديل القالب"
        },
        messages: {
            metaLoadError: "فشل تحميل ثوابت تكوين النظام.",
            loadError: "فشل تحميل تفاصيل القالب.",
            customerLoadError: "فشل تحميل قائمة العملاء.",
            saveSuccess: "تم حفظ القالب بنجاح!",
            saveError: "خطأ: {{message}}",
            loading: "جارٍ التحميل..."
        },
        fields: {
            name: "اسم القالب",
            templateType: "نوع القالب",
            actionType: "نوع الإجراء",
            selectType: "اختر النوع",
            selectAction: "اختر الإجراء",
            globalTemplate: "قالب عام",
            customer: "العميل",
            selectCustomer: "اختر العميل",
            emailSubject: "عنوان البريد الإلكتروني",
            subjectPlaceholder: "مثل: تذكير: خطاب الضمان رقم {{lg_number}} سينتهي قريباً",
            content: "محتوى القالب"
        },
        buttons: {
            cancel: "إلغاء",
            update: "تحديث القالب",
            create: "إنشاء القالب"
        },
        placeholdersInfo: {
            title: "العناصر النائبة المتاحة",
            instruction: "انقر للإدراج في موضع المؤشر",
            emptyText: "حدد نوع الإجراء لرؤية العناصر النائبة المتاحة."
        }
    },
    schedulerPage: {
        title: "إدارة المجدول",
        messages: {
            loadError: "فشل جلب المهام المجدولة. يرجى التحقق من حالة واجهة برمجة التطبيقات.",
            actionError: "خطأ في تنفيذ الإجراء: {{message}}",
            rescheduleError: "خطأ في إعادة جدولة المهمة: {{message}}",
            loading: "جارٍ تحميل البيانات...",
            noJobs: "لم يتم العثور على مهام مجدولة."
        },
        table: {
            name: "الاسم",
            id: "المعرف",
            nextRunTime: "وقت التشغيل القادم",
            trigger: "المُشغّل",
            actions: "إجراءات",
            na: "غير متاح",
            runNowTooltip: "تشغيل الآن",
            pauseTooltip: "إيقاف مؤقت للمهمة",
            resumeTooltip: "استئناف المهمة",
            rescheduleTooltip: "إعادة جدولة المهمة"
        },
        rescheduleForm: {
            title: "إعادة جدولة: {{name}}",
            triggerType: "نوع المُشغّل",
            cron: "مُجدول (متكرر)",
            dateType: "تاريخ (مرة واحدة)",
            hour: "الساعة (0-23)",
            minute: "الدقيقة (0-59)",
            specificDate: "تاريخ/وقت محدد (لمُشغّل 'التاريخ')",
            submit: "إعادة جدولة المهمة"
        }
    }
};

enData.pages = { ...enData.pages, ...extensionsEn };
arData.pages = { ...arData.pages, ...extensionsAr };

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('Batch 3 SystemOwner locales updated successfully.');
