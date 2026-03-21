const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const enExtensions = {
    customerUserManagement: {
        title: "Customer Users",
        buttons: {
            cancel: "Cancel",
            addNewUser: "Add New User",
            updateUser: "Update User",
            createUser: "Create User"
        },
        messages: {
            loadError: "Failed to fetch users. ",
            confirmDelete: "Are you sure you want to soft-delete the user {{email}}?",
            deleteSuccess: "User {{email}} has been soft-deleted successfully.",
            deleteError: "Failed to delete user {{email}}. ",
            confirmRestore: "Are you sure you want to restore the user {{email}}?",
            restoreSuccess: "User {{email}} has been restored successfully.",
            restoreError: "Failed to restore user {{email}}. ",
            noUsersFound: "No users found for this customer."
        },
        form: {
            editUser: "Edit User",
            addNewUser: "Add New User",
            email: "Email Address",
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
            deleted: "Deleted",
            active: "Active",
            tooltips: {
                restore: "Restore User",
                edit: "Edit User",
                delete: "Soft Delete User"
            }
        }
    }
};

const arExtensions = {
    customerUserManagement: {
        title: "مستخدمي العميل",
        buttons: {
            cancel: "إلغاء",
            addNewUser: "إضافة مستخدم جديد",
            updateUser: "تحديث المستخدم",
            createUser: "إنشاء مستخدم"
        },
        messages: {
            loadError: "فشل في جلب المستخدمين. ",
            confirmDelete: "هل أنت متأكد أنك تريد الحذف الاسترجاعي للمستخدم {{email}}؟",
            deleteSuccess: "تم الحذف الاسترجاعي للمستخدم {{email}} بنجاح.",
            deleteError: "فشل في حذف المستخدم {{email}}. ",
            confirmRestore: "هل أنت متأكد أنك تريد استعادة المستخدم {{email}}؟",
            restoreSuccess: "تم استعادة المستخدم {{email}} بنجاح.",
            restoreError: "فشل استعادة المستخدم {{email}}. ",
            noUsersFound: "لم يتم العثور على مستخدمين لهذا العميل."
        },
        form: {
            editUser: "تعديل المستخدم",
            addNewUser: "إضافة مستخدم جديد",
            email: "عنوان البريد الإلكتروني",
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
            actions: "إجراءات",
            deleted: "محذوف",
            active: "نشط",
            tooltips: {
                restore: "استعادة المستخدم",
                edit: "تعديل المستخدم",
                delete: "حذف استرجاعي للمستخدم"
            }
        }
    }
};

enData.customerUserManagement = enExtensions.customerUserManagement;
arData.customerUserManagement = arExtensions.customerUserManagement;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('customerUserManagement locales added.');
