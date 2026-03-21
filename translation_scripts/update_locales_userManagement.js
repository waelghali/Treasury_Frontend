const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesPath, 'en', 'translation.json');
const arPath = path.join(localesPath, 'ar', 'translation.json');

const enTranslations = {
    title: "Organization & Teams",
    tabs: {
        users: "Users",
        departments: "Departments",
        groups: "Approval Groups"
    },
    tooltips: {
        gracePeriod: "This action is disabled during your subscription's grace period."
    },
    buttons: {
        addUser: "Add User",
        addDepartment: "Add Department",
        addGroup: "Add Group",
        cancel: "Cancel",
        save: "Save",
        edit: "Edit",
        delete: "Delete",
        restore: "Restore"
    },
    users: {
        email: "Email",
        role: "Role",
        status: "Status",
        actions: "Actions",
        active: "Active",
        deleted: "Deleted",
        confirmDelete: "Are you sure you want to soft-delete user: {{email}}?",
        confirmRestore: "Are you sure you want to restore user: {{email}}?",
        deleteSuccess: "User '{{email}}' soft-deleted successfully.",
        restoreSuccess: "User '{{email}}' restored successfully.",
        cannotDeleteSelf: "You cannot delete your own account."
    },
    departments: {
        name: "Department Name",
        manager: "Manager",
        noManager: "No Manager Assigned",
        empty: "No departments configured.",
        modalTitleNew: "New Department",
        modalTitleEdit: "Edit Department",
        selectManager: "-- Select Manager --",
        confirmDelete: "Delete this department?",
        createSuccess: "Department created.",
        updateSuccess: "Department updated.",
        deleteSuccess: "Department deleted."
    },
    groups: {
        name: "Group Name",
        members: "Members",
        emptyRow: "Empty Group",
        empty: "No approval groups configured.",
        modalTitleNew: "New Approval Group",
        modalTitleEdit: "Edit Approval Group",
        selectMembers: "Select Members",
        confirmDelete: "Delete this group?",
        createSuccess: "Group created.",
        updateSuccess: "Group updated.",
        deleteSuccess: "Group deleted."
    }
};

const arTranslations = {
    title: "المنظمة والفرق",
    tabs: {
        users: "المستخدمون",
        departments: "الأقسام",
        groups: "مجموعات الموافقة"
    },
    tooltips: {
        gracePeriod: "هذا الإجراء معطل خلال فترة السماح لاشتراكك."
    },
    buttons: {
        addUser: "إضافة مستخدم",
        addDepartment: "إضافة قسم",
        addGroup: "إضافة مجموعة",
        cancel: "إلغاء",
        save: "حفظ",
        edit: "تعديل",
        delete: "حذف",
        restore: "استعادة"
    },
    users: {
        email: "البريد الإلكتروني",
        role: "الدور",
        status: "الحالة",
        actions: "الإجراءات",
        active: "نشط",
        deleted: "محذوف",
        confirmDelete: "هل أنت متأكد أنك تريد حذف المستخدم: {{email}}؟",
        confirmRestore: "هل أنت متأكد أنك تريد استعادة المستخدم: {{email}}؟",
        deleteSuccess: "تم حذف المستخدم '{{email}}' بنجاح.",
        restoreSuccess: "تمت استعادة المستخدم '{{email}}' بنجاح.",
        cannotDeleteSelf: "لا يمكنك حذف حسابك الخاص."
    },
    departments: {
        name: "اسم القسم",
        manager: "المدير",
        noManager: "لم يتم تعيين مدير",
        empty: "لم يتم إعداد أي أقسام.",
        modalTitleNew: "قسم جديد",
        modalTitleEdit: "تعديل القسم",
        selectManager: "-- اختر المدير --",
        confirmDelete: "حذف هذا القسم؟",
        createSuccess: "تم إنشاء القسم.",
        updateSuccess: "تم تحديث القسم.",
        deleteSuccess: "تم حذف القسم."
    },
    groups: {
        name: "اسم المجموعة",
        members: "الأعضاء",
        emptyRow: "مجموعة فارغة",
        empty: "لم يتم إعداد أي مجموعات موافقة.",
        modalTitleNew: "مجموعة موافقة جديدة",
        modalTitleEdit: "تعديل مجموعة الموافقة",
        selectMembers: "اختيار الأعضاء",
        confirmDelete: "حذف هذه المجموعة؟",
        createSuccess: "تم إنشاء المجموعة.",
        updateSuccess: "تم تحديث المجموعة.",
        deleteSuccess: "تم حذف المجموعة."
    }
};

function updateFile(filePath, newKeys) {
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    content.userManagement = newKeys; // Namespace the keys

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${filePath}`);
}

updateFile(enPath, enTranslations);
updateFile(arPath, arTranslations);
console.log('User Management locales updated successfully.');
