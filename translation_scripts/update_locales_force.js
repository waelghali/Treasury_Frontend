const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.forcePasswordChange = {
    changePassword: "Change Your Password",
    requiredToChange: "You are required to change your password before proceeding.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordsDoNotMatch: "New password and confirmation do not match.",
    passwordTooShort: "New password must be at least 8 characters long.",
    changing: "Changing...",
    changePasswordButton: "Change Password",
    successMessage: "Password changed successfully! Redirecting to your dashboard...",
    unexpectedError: "An unexpected error occurred during password change."
};

ar.forcePasswordChange = {
    changePassword: "تغيير كلمة المرور",
    requiredToChange: "يجب عليك تغيير كلمة المرور الخاصة بك قبل المتابعة.",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    passwordsDoNotMatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين.",
    passwordTooShort: "يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.",
    changing: "جاري التغيير...",
    changePasswordButton: "تغيير كلمة المرور",
    successMessage: "تم تغيير كلمة المرور بنجاح! جاري التوجيه إلى لوحة المتابعة...",
    unexpectedError: "حدث خطأ غير متوقع أثناء تغيير كلمة المرور."
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Force Password Change Locales updated.');
