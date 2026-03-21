const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const extensionsEn = {
    commonListManagement: {
        tabs: {
            "lg-types": "LG Types",
            "rules": "Rules",
            "issuing-methods": "Issuing Methods",
            "lg-statuses": "LG Statuses",
            "lg-operational-statuses": "LG Operational Statuses",
            "banks": "Banks",
            "currencies": "Currencies"
        },
        messages: {
            invalidListType: "Invalid list type \"{{type}}\". Please check the URL.",
            loadError: "Failed to load {{title}}. ",
            createSuccess: "{{name}} created successfully!",
            updateSuccess: "{{name}} updated successfully!",
            saveError: "Error saving {{title}}: ",
            confirmDelete: "Are you sure you want to soft-delete \"{{name}}\"?",
            deleteSuccess: "\"{{name}}\" soft-deleted successfully.",
            deleteError: "Failed to soft-delete \"{{name}}\". ",
            confirmRestore: "Are you sure you want to restore \"{{name}}\"?",
            restoreSuccess: "\"{{name}}\" restored successfully.",
            restoreError: "Failed to restore \"{{name}}\". ",
            loading: "Loading {{title}}...",
            noItemsFound: "No {{title}} found. Click \"Add New {{name}}\" to get started.",
            unknownListType: "The requested list type \"{{type}}\" is not recognized. Please check the URL or navigation link.",
            templateNote: "Template management is a more complex feature due to dynamic content, placeholders, and global/customer-specific variants. It requires a dedicated UI not covered by this generic list manager.",
            templateNote2: "Please use the appropriate component/page for template management once it is developed."
        },
        buttons: {
            addNew: "Add New {{name}}",
            edit: "Edit {{name}}",
            cancel: "Cancel",
            create: "Create {{name}}",
            update: "Update {{name}}",
            restore: "Restore",
            delete: "Delete"
        },
        status: {
            active: "Active",
            deleted: "Deleted"
        },
        table: {
            status: "Status",
            actions: "Actions"
        },
        errors: {
            unknownListTitle: "Error: Unknown List Type"
        },
        templatesTitle: "Templates Management",
        note: "Note:"
    },
    globalConfigurationForm: {
        titleCreate: "Create New Global Configuration",
        titleEdit: "Edit Global Configuration",
        messages: {
            loadError: "Failed to load configuration details for editing. Please try again.",
            updateSuccess: "Global configuration updated successfully!",
            createSuccess: "Global configuration created successfully!",
            saveError: "Error saving configuration: "
        },
        loading: "Loading configuration data...",
        labels: {
            key: "Configuration Key",
            description: "Description",
            valueMin: "Minimum Value (as string)",
            valueMax: "Maximum Value (as string)",
            valueDefault: "Default Value (as string)",
            unit: "Unit (e.g., days, percentage)"
        },
        buttons: {
            cancel: "Cancel",
            updating: "Updating...",
            update: "Update Configuration",
            creating: "Creating...",
            create: "Create Configuration"
        }
    }
};

const extensionsAr = {
    commonListManagement: {
        tabs: {
            "lg-types": "أنواع خطابات الضمان",
            "rules": "القواعد",
            "issuing-methods": "طرق الإصدار",
            "lg-statuses": "حالات خطابات الضمان",
            "lg-operational-statuses": "الحالات التشغيلية لخطابات الضمان",
            "banks": "البنوك",
            "currencies": "العملات"
        },
        messages: {
            invalidListType: "نوع القائمة غير صالح \"{{type}}\". يرجى التحقق من الرابط.",
            loadError: "فشل تحميل {{title}}. ",
            createSuccess: "تم إنشاء {{name}} بنجاح!",
            updateSuccess: "تم تحديث {{name}} بنجاح!",
            saveError: "خطأ في حفظ {{title}}: ",
            confirmDelete: "هل أنت متأكد أنك تريد الحذف الاسترجاعي لـ \"{{name}}\"؟",
            deleteSuccess: "تم الحذف الاسترجاعي لـ \"{{name}}\" بنجاح.",
            deleteError: "فشل الحذف الاسترجاعي لـ \"{{name}}\". ",
            confirmRestore: "هل أنت متأكد أنك تريد استعادة \"{{name}}\"؟",
            restoreSuccess: "تم استعادة \"{{name}}\" بنجاح.",
            restoreError: "فشل استعادة \"{{name}}\". ",
            loading: "جارٍ تحميل {{title}}...",
            noItemsFound: "لم يتم العثور على {{title}}. انقر على \"إضافة {{name}} جديد(ة)\" للبدء.",
            unknownListType: "نوع القائمة المطلوب \"{{type}}\" غير معروف. يرجى التحقق من الرابط أو رابط التنقل.",
            templateNote: "إدارة القوالب ميزة معقدة نظرًا للمحتوى الديناميكي، والعناصر النائبة، والمتغيرات العامة/الخاصة بالعميل. وتتطلب واجهة مستخدم مخصصة لا يغطيها مدير القوائم العام هذا.",
            templateNote2: "يرجى استخدام المكون/الصفحة المناسبة لإدارة القوالب بمجرد تطويرها."
        },
        buttons: {
            addNew: "إضافة {{name}} جديد(ة)",
            edit: "تعديل {{name}}",
            cancel: "إلغاء",
            create: "إنشاء {{name}}",
            update: "تحديث {{name}}",
            restore: "استعادة",
            delete: "حذف"
        },
        status: {
            active: "نشط",
            deleted: "محذوف"
        },
        table: {
            status: "الحالة",
            actions: "إجراءات"
        },
        errors: {
            unknownListTitle: "خطأ: نوع القائمة غير معروف"
        },
        templatesTitle: "إدارة القوالب",
        note: "ملاحظة:"
    },
    globalConfigurationForm: {
        titleCreate: "إنشاء تكوين عام جديد",
        titleEdit: "تعديل التكوين العام",
        messages: {
            loadError: "فشل تحميل تفاصيل التكوين للتعديل. يرجى المحاولة مرة أخرى.",
            updateSuccess: "تم تحديث التكوين العام بنجاح!",
            createSuccess: "تم إنشاء التكوين العام بنجاح!",
            saveError: "خطأ في حفظ التكوين: "
        },
        loading: "جارٍ تحميل بيانات التكوين...",
        labels: {
            key: "مفتاح التكوين",
            description: "الوصف",
            valueMin: "القيمة الدنيا (كنص)",
            valueMax: "القيمة القصوى (كنص)",
            valueDefault: "القيمة الافتراضية (كنص)",
            unit: "الوحدة (مثل: أيام، نسبة مئوية)"
        },
        buttons: {
            cancel: "إلغاء",
            updating: "جارٍ التحديث...",
            update: "تحديث التكوين",
            creating: "جارٍ الإنشاء...",
            create: "إنشاء التكوين"
        }
    }
};

enData.pages.commonListManagement = { ...enData.pages.commonListManagement, ...extensionsEn.commonListManagement };
arData.pages.commonListManagement = { ...arData.pages.commonListManagement, ...extensionsAr.commonListManagement };

enData.pages.globalConfigurationForm = extensionsEn.globalConfigurationForm;
arData.pages.globalConfigurationForm = extensionsAr.globalConfigurationForm;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('Batch 2 SystemOwner loclaes part 2 updated successfully.');
