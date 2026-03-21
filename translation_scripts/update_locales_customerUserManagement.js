const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesPath, 'en', 'translation.json');
const arPath = path.join(localesPath, 'ar', 'translation.json');

const enTranslations = {
    title: "Customer Users",
    buttons: {
        addNewUser: "Add New User",
        cancel: "Cancel",
        updateUser: "Update User",
        createUser: "Create User",
    },
    messages: {
        noUsersFound: "No users found for this customer.",
        confirmDelete: "Are you sure you want to soft-delete the user \"{{email}}\"?",
        deleteSuccess: "User \"{{email}}\" soft-deleted successfully.",
        confirmRestore: "Are you sure you want to restore the user \"{{email}}\"?",
        restoreSuccess: "User \"{{email}}\" restored successfully.",
        loadError: "Failed to load users. ",
        deleteError: "Failed to delete user \"{{email}}\". ",
        restoreError: "Failed to restore user \"{{email}}\". ",
    },
    form: {
        editUser: "Edit User",
        addNewUser: "Add New User",
        email: "Email",
        role: "Role",
        password: "Password",
        roles: {
            corporate_admin: "Corporate Admin",
            end_user: "End User"
        }
    },
    table: {
        email: "Email",
        role: "Role",
        status: "Status",
        actions: "Actions",
        active: "Active",
        deleted: "Deleted",
        tooltips: {
            edit: "Edit User",
            delete: "Delete User",
            restore: "Restore User"
        }
    }
};

const arTranslations = {
    title: "مستخدمو العميل",
    buttons: {
        addNewUser: "إضافة مستخدم جديد",
        cancel: "إلغاء",
        updateUser: "تحديث المستخدم",
        createUser: "إنشاء مستخدم",
    },
    messages: {
        noUsersFound: "لم يتم العثور على مستخدمين لهذا العميل.",
        confirmDelete: "هل أنت متأكد أنك تريد حذف المستخدم \"{{email}}\"؟",
        deleteSuccess: "تم حذف المستخدم \"{{email}}\" بنجاح.",
        confirmRestore: "هل أنت متأكد أنك تريد استعادة المستخدم \"{{email}}\"؟",
        restoreSuccess: "تمت استعادة المستخدم \"{{email}}\" بنجاح.",
        loadError: "فشل في تحميل المستخدمين. ",
        deleteError: "فشل في حذف المستخدم \"{{email}}\". ",
        restoreError: "فشل في استعادة المستخدم \"{{email}}\". ",
    },
    form: {
        editUser: "تعديل المستخدم",
        addNewUser: "إضافة مستخدم جديد",
        email: "البريد الإلكتروني",
        role: "الدور",
        password: "كلمة المرور",
        roles: {
            corporate_admin: "مسؤول الشركة",
            end_user: "مستخدم نهائي"
        }
    },
    table: {
        email: "البريد الإلكتروني",
        role: "الدور",
        status: "الحالة",
        actions: "الإجراءات",
        active: "نشط",
        deleted: "محذوف",
        tooltips: {
            edit: "تعديل المستخدم",
            delete: "حذف المستخدم",
            restore: "استعادة المستخدم"
        }
    }
};


function updateFile(filePath, newKeys) {
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    content.customerUserManagement = newKeys; // Namespace the keys

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${filePath}`);
}

updateFile(enPath, enTranslations);
updateFile(arPath, arTranslations);
console.log('Customer User Management locales updated successfully.');
