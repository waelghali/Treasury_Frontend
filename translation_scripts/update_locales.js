const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json'));
const ar = JSON.parse(fs.readFileSync('src/locales/ar/translation.json'));

en.auth = {
    ...en.auth,
    verifySecurity: 'Verify Security',
    signIn: 'Sign In',
    signInButton: 'Sign In',
    codeSent: 'A code has been sent to your email',
    treasuryPlatform: 'Treasury Management Platform',
    signingIn: 'Signing In...',
    enter6DigitCode: 'Enter 6-Digit Code',
    trustDevice: 'Trust this device in the future',
    didNotReceiveCode: "Didn't receive the code?",
    resendCodeIn: "Resend Code in {{time}}s",
    resendNewCode: "Resend New Code",
    verifying: "Verifying...",
    verifyAccess: "Verify & Access Platform",
    backToSignIn: "Back to Sign In",
    forgotPassword: "Forgot Password?",
    backToHome: "Back to Home",
    networkError: "A network error occurred. Please check your connection.",
    verificationFailed: "Verification failed. Please try again.",
    loginFailed: "Login failed. Please try again."
};

en.legal = {
    reviewAccept: "Review and Accept Policies",
    policyDesc: "To continue using the platform, you must accept our latest Terms & Conditions and Privacy Policy.",
    terms: "T&C (v{{version}})",
    privacy: "Privacy Policy (v{{version}})",
    loading: "Loading policies...",
    accepting: "Accepting...",
    acceptButton: "I Accept the Policies"
};

ar.auth = {
    ...ar.auth,
    verifySecurity: 'تأكيد الأمان',
    signIn: 'تسجيل الدخول',
    signInButton: 'تسجيل الدخول',
    codeSent: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
    treasuryPlatform: 'منصة إدارة الخزانة',
    signingIn: 'جاري تسجيل الدخول...',
    enter6DigitCode: 'أدخل الرمز المكون من 6 أرقام',
    trustDevice: 'الوثوق بهذا الجهاز في المستقبل',
    didNotReceiveCode: "لم تستلم الرمز؟",
    resendCodeIn: "إعادة الإرسال خلال {{time}} ثانية",
    resendNewCode: "إرسال رمز جديد",
    verifying: "جاري التحقق...",
    verifyAccess: "التحقق والدخول للمنصة",
    backToSignIn: "العودة لتسجيل الدخول",
    forgotPassword: "نسيت كلمة المرور؟",
    backToHome: "العودة للصفحة الرئيسية",
    networkError: "حدث خطأ في الشبكة. يرجى التحقق من اتصالك.",
    verificationFailed: "فشل التحقق. يرجى المحاولة مرة أخرى.",
    loginFailed: "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى."
};

ar.legal = {
    reviewAccept: "مراجعة وقبول السياسات",
    policyDesc: "للاستمرار في استخدام المنصة، يجب عليك قبول أحدث الشروط والأحكام وسياسة الخصوصية.",
    terms: "الشروط والأحكام (v{{version}})",
    privacy: "سياسة الخصوصية (v{{version}})",
    loading: "جاري تحميل السياسات...",
    accepting: "جاري القبول...",
    acceptButton: "أوافق على السياسات"
};

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/ar/translation.json', JSON.stringify(ar, null, 2));
console.log('Locales updated.');
