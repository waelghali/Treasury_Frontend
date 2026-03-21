const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arLocales = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const newPagesLocalesEn = {
    "lgCategoryList": {
        "universalCategories": "Universal Categories",
        "lgCategories": "LG Categories",
        "universalCategoryItem": "Universal Category",
        "lgCategoryItem": "LG Category",
        "addNewUniversalCategory": "Add New Universal Category",
        "addNewLgCategory": "Add New LG Category",
        "gracePeriodDisabled": "This action is disabled during your subscription's grace period.",
        "systemDefaultNoEdit": "System default categories cannot be edited by Corporate Admins.",
        "systemDefaultNoDelete": "System default categories (Universal Categories) cannot be deleted by Corporate Admins.",
        "systemDefaultNoRestore": "System default categories (Universal Categories) cannot be restored by Corporate Admins.",
        "confirmSoftDelete": "Are you sure you want to soft-delete \"{{name}}\"?",
        "softDeleteSuccess": "\"{{name}}\" soft-deleted successfully.",
        "confirmRestore": "Are you sure you want to restore \"{{name}}\"?",
        "restoreSuccess": "\"{{name}}\" restored successfully.",
        "showDeleted": "Show Deleted Categories",
        "noCategoriesFound": "No {{title}} found. Click \"Add New {{itemName}}\" to get started.",
        "tableHeaders": {
            "categoryName": "Category Name",
            "code": "Code",
            "type": "Type",
            "extraFieldName": "Extra Field Name",
            "mandatory": "Mandatory?",
            "communicationList": "Communication List",
            "appliesToEntities": "Applies To Entities",
            "status": "Status",
            "actions": "Actions"
        },
        "universalType": "Universal",
        "customerSpecificType": "Customer-specific",
        "yes": "Yes",
        "no": "No",
        "na": "N/A",
        "allEntities": "All Entities",
        "active": "Active",
        "deleted": "Deleted",
        "systemDefaultStatus": "System Default",
        "restoreAction": "Restore",
        "editAction": "Edit",
        "deleteAction": "Delete"
    }
};

const newPagesLocalesAr = {
    "lgCategoryList": {
        "universalCategories": "الفئات العامة",
        "lgCategories": "فئات خطابات الضمان",
        "universalCategoryItem": "فئة عامة",
        "lgCategoryItem": "فئة خطاب ضمان",
        "addNewUniversalCategory": "إضافة فئة عامة جديدة",
        "addNewLgCategory": "إضافة فئة جديدة لخطاب الضمان",
        "gracePeriodDisabled": "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        "systemDefaultNoEdit": "لا يمكن لمديري الشركة تعديل الفئات الافتراضية للنظام.",
        "systemDefaultNoDelete": "لا يمكن لمديري الشركة حذف الفئات الافتراضية للنظام (الفئات العامة).",
        "systemDefaultNoRestore": "لا يمكن لمديري الشركة استعادة الفئات الافتراضية للنظام (الفئات العامة).",
        "confirmSoftDelete": "هل أنت متأكد من رغبتك في الحذف المؤقت لـ \"{{name}}\"؟",
        "softDeleteSuccess": "تم الحذف المؤقت بنجاح لـ \"{{name}}\".",
        "confirmRestore": "هل أنت متأكد من رغبتك في استعادة \"{{name}}\"؟",
        "restoreSuccess": "تمت استعادة \"{{name}}\" بنجاح.",
        "showDeleted": "إظهار الفئات المحذوفة",
        "noCategoriesFound": "لم يتم العثور على {{title}}. انقر \"إضافة {{itemName}} جديد\" للبدء.",
        "tableHeaders": {
            "categoryName": "اسم الفئة",
            "code": "الرمز",
            "type": "النوع",
            "extraFieldName": "اسم الحقل الإضافي",
            "mandatory": "إلزامي؟",
            "communicationList": "قائمة المراسلات",
            "appliesToEntities": "ينطبق على الكيانات",
            "status": "الحالة",
            "actions": "الإجراءات"
        },
        "universalType": "عالمي",
        "customerSpecificType": "مخصص للجهة",
        "yes": "نعم",
        "no": "لا",
        "na": "غير متوفر",
        "allEntities": "كل الكيانات",
        "active": "نشط",
        "deleted": "محذوف",
        "systemDefaultStatus": "افتراضي للنظام",
        "restoreAction": "استعادة",
        "editAction": "تعديل",
        "deleteAction": "حذف"
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

console.log('Locales updated for Batch 3 pages.');
