const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.resetPassword = {
    resetPassword: "Reset Password",
    enterNewPassword: "Enter your new password below.",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    newPasswordPlaceholder: "Enter your new password",
    confirmNewPasswordPlaceholder: "Confirm your new password",
    resetting: "Resetting...",
    resetPasswordButton: "Reset Password",
    backToLogin: "Back to Login",
    missingTokenUrl: "Password reset token is missing from the URL.",
    missingToken: "Missing password reset token.",
    noResetTokenFound: "No reset token found. Please use the link from your email.",
    passwordsDoNotMatch: "New password and confirmation do not match.",
    passwordTooShort: "Password must be at least 8 characters long.",
    passwordNoUppercase: "Password must contain at least one uppercase letter.",
    passwordNoLowercase: "Password must contain at least one lowercase letter.",
    passwordNoDigit: "Password must contain at least one digit.",
    resetSuccess: "Your password has been successfully reset. Please log in with your new password.",
    resetRedirecting: "Your password has been successfully reset. Redirecting to login page...",
    resetFailed: "Password reset failed. The token might be invalid or expired.",
    unexpectedError: "An unexpected error occurred. Please try again."
};

ar.resetPassword = {
    resetPassword: "إعادة ضبط كلمة المرور",
    enterNewPassword: "أدخل كلمة المرور الجديدة أدناه.",
    newPassword: "كلمة المرور الجديدة",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    newPasswordPlaceholder: "أدخل كلمة المرور الجديدة",
    confirmNewPasswordPlaceholder: "تأكيد كلمة المرور الجديدة",
    resetting: "جاري إعادة الضبط...",
    resetPasswordButton: "إعادة ضبط كلمة المرور",
    backToLogin: "العودة لتسجيل الدخول",
    missingTokenUrl: "رمز إعادة ضبط كلمة المرور مفقود من الرابط.",
    missingToken: "رمز إعادة ضبط كلمة المرور مفقود.",
    noResetTokenFound: "لم يتم العثور على رمز إعادة الضبط. يرجى استخدام الرابط المرسل لبريدك الإلكتروني.",
    passwordsDoNotMatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين.",
    passwordTooShort: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
    passwordNoUppercase: "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل.",
    passwordNoLowercase: "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل.",
    passwordNoDigit: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.",
    resetSuccess: "تم إعادة ضبط كلمة المرور بنجاح. يرجى تسجيل الدخول بكلمة المرور الجديدة.",
    resetRedirecting: "تم إعادة ضبط كلمة المرور بنجاح. جاري التوجيه إلى صفحة تسجيل الدخول...",
    resetFailed: "فشل إعادة ضبط كلمة المرور. قد يكون الرمز غير صالح أو منتهي الصلاحية.",
    unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Reset Password Locales updated.');
