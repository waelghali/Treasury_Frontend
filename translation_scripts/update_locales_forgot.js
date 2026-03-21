const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.forgotPassword = {
    forgotPassword: "Forgot Password",
    enterEmailInstruction: "Enter your email to receive a password reset link.",
    emailAddress: "Email Address",
    emailPlaceholder: "you@example.com",
    sending: "Sending...",
    sendResetLink: "Send Reset Link",
    rememberPassword: "Remember your password?",
    backToLogin: "Back to Login",
    missingEmail: "Please enter your email address.",
    successMessage: "If an account with that email exists, a password reset link has been sent to your inbox.",
    unexpectedError: "An unexpected error occurred. Please try again."
};

ar.forgotPassword = {
    forgotPassword: "نسيت كلمة المرور",
    enterEmailInstruction: "أدخل بريدك الإلكتروني لاستلام رابط إعادة ضبط كلمة المرور.",
    emailAddress: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    sending: "جاري الإرسال...",
    sendResetLink: "إرسال رابط استعادة كلمة المرور",
    rememberPassword: "هل تتذكر كلمة المرور؟",
    backToLogin: "العودة لتسجيل الدخول",
    missingEmail: "يرجى إدخال عنوان بريدك الإلكتروني.",
    successMessage: "إذا كان هناك حساب مرتبط بهذا البريد، فقد تم الإرسال بنجاح.",
    unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Forgot Password Locales updated.');
