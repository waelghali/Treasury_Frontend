const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'locales', 'en', 'translation.json');
const arPath = path.join(__dirname, 'src', 'locales', 'ar', 'translation.json');

const updateLocales = () => {
    // 1. Load existing
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

    // 2. Add new structures
    if (!enData.modals.bulkChangeLGOwnerModal) enData.modals.bulkChangeLGOwnerModal = {};
    if (!arData.modals.bulkChangeLGOwnerModal) arData.modals.bulkChangeLGOwnerModal = {};

    if (!enData.modals.bulkRemindersModal) enData.modals.bulkRemindersModal = {};
    if (!arData.modals.bulkRemindersModal) arData.modals.bulkRemindersModal = {};

    if (!enData.modals.cancelInstructionModal) enData.modals.cancelInstructionModal = {};
    if (!arData.modals.cancelInstructionModal) arData.modals.cancelInstructionModal = {};

    if (!enData.modals.changeLGOwnerModal) enData.modals.changeLGOwnerModal = {};
    if (!arData.modals.changeLGOwnerModal) arData.modals.changeLGOwnerModal = {};


    // ---- BulkChangeLGOwnerModal ----
    const bulkChangeLGOwnerEn = {
        title: "Bulk Change Internal Owner from: {{email}}",
        currentOwnerDetails: "Current Owner Details:",
        email: "Email:",
        phone: "Phone:",
        manager: "Manager:",
        na: "N/A",
        lgsToBeReassigned: "LGs to be Reassigned ({{count}}):",
        loadingLgs: "Loading LGs...",
        exp: "Exp: {{date}}",
        createNewOwner: "Create a New Internal Owner Contact",
        newOwnerContactDetails: "New Owner Contact Details:",
        internalIdOptional: "Internal ID (Optional)",
        selectExistingOwner: "Select Existing Owner",
        loadingOwners: "Loading owners...",
        selectAnOwner: "-- Select an owner --",
        reasonForChange: "Reason for Change",
        processing: "Processing...",
        submitBulkChange: "Submit Bulk Change",
        cancel: "Cancel"
    };

    const bulkChangeLGOwnerAr = {
        title: "تغيير المالك الداخلي بشكل جماعي من: {{email}}",
        currentOwnerDetails: "تفاصيل المالك الحالي:",
        email: "البريد الإلكتروني:",
        phone: "الهاتف:",
        manager: "المدير:",
        na: "غير متوفر",
        lgsToBeReassigned: "خطابات الضمان المراد إعادة تعيينها ({{count}}):",
        loadingLgs: "جاري تحميل خطابات الضمان...",
        exp: "انتهاء: {{date}}",
        createNewOwner: "إنشاء جهة اتصال لمالك داخلي جديد",
        newOwnerContactDetails: "تفاصيل جهة اتصال المالك الجديد:",
        internalIdOptional: "المعرف الداخلي (اختياري)",
        selectExistingOwner: "اختيار مالك موجود",
        loadingOwners: "جاري تحميل الملاك...",
        selectAnOwner: "-- اختر مالك --",
        reasonForChange: "سبب التغيير",
        processing: "جاري المعالجة...",
        submitBulkChange: "تأكيد التغيير الجماعي",
        cancel: "إلغاء"
    };

    // ---- BulkRemindersModal ----
    const bulkRemindersEn = {
        title: "Generate Bulk Bank Reminders",
        description1: "This action will automatically identify all eligible LG instructions for a bank reminder, which may extend beyond the list below. It will then generate a consolidated PDF document containing all such reminders. The PDF will open in a new tab for printing.",
        description2: "Eligible instructions are those where a bank reply has not been recorded, and they fall within configured time thresholds (e.g., days since issuance/delivery).",
        cancel: "Cancel",
        generating: "Generating...",
        generateAndPrint: "Generate & Print Reminders"
    };

    const bulkRemindersAr = {
        title: "إنشاء تذكيرات بنكية جماعية",
        description1: "سيقوم هذا الإجراء تلقائياً بتحديد كافة تعليمات خطابات الضمان المؤهلة لتذكير بنكي، والتي قد تمتد أبعد من القائمة أدناه. سيقوم بعدها بإنشاء مستند PDF موحد يحتوي على كافة هذه التذكيرات. سيتم فتح ملف الـ PDF في علامة تبويب جديدة للطباعة.",
        description2: "التعليمات المؤهلة هي تلك التي لم يُسجل لها رد من البنك، وتقع ضمن الحدود الزمنية المُعدة (مثل عدد الأيام منذ الإصدار/التسليم).",
        cancel: "إلغاء",
        generating: "جاري الإنشاء...",
        generateAndPrint: "إنشاء وطباعة التذكيرات"
    };

    // ---- CancelInstructionModal ----
    const cancelInstructionEn = {
        title: "Cancel Last Instruction",
        warningText: "You are about to cancel the following instruction. This action will roll back the LG to its previous state.",
        instructionType: "Instruction Type:",
        instructionSerial: "Instruction Serial:",
        lgNumber: "LG Number:",
        issuedOn: "Issued On:",
        na: "N/A",
        timeLeft: "Time left to cancel: {{time}}",
        loading: "Loading...",
        reasonForCancellation: "Reason for Cancellation",
        reasonPlaceholder: "e.g., Incorrect amount was entered",
        declaration: "I confirm that this instruction is to be considered null and void, that it has not been delivered to the bank, or if delivered, all necessary steps have been taken to stop its use, including shredding physical copies and ensuring it will not be used in any way. I take full responsibility for this action.",
        confirmCancellation: "Confirm Cancellation",
        back: "Back"
    };

    const cancelInstructionAr = {
        title: "إلغاء التعليمة الأخيرة",
        warningText: "أنت على وشك إلغاء التعليمة التالية. هذا الإجراء سيقوم بإرجاع خطاب الضمان إلى حالته السابقة.",
        instructionType: "نوع التعليمة:",
        instructionSerial: "الرقم التسلسلي للتعليمة:",
        lgNumber: "رقم خطاب الضمان:",
        issuedOn: "تاريخ الإصدار:",
        na: "غير متوفر",
        timeLeft: "الوقت المتبقي للإلغاء: {{time}}",
        loading: "جاري التحميل...",
        reasonForCancellation: "سبب الإلغاء",
        reasonPlaceholder: "مثلاً، تم إدخال مبلغ غير صحيح",
        declaration: "أؤكد أن هذه التعليمة تعتبر لاغية وباطلة، وأنها لم تُسلم للبنك، أو في حالة تسليمها، فقد تم إتخاذ كافة الخطوات اللازمة لإيقاف استخدامها، بما في ذلك إتلاف النسخ الورقية وضمان عدم استخدامها بأي شكل. أتحمل المسؤولية الكاملة عن هذا الإجراء.",
        confirmCancellation: "تأكيد الإلغاء",
        back: "عودة"
    };

    // ---- ChangeLGOwnerModal ----
    const changeLGOwnerEn = {
        title: "Change Internal Owner for LG: {{lgNumber}}",
        currentOwnerDetails: "Current Owner Details:",
        email: "Email:",
        phone: "Phone:",
        manager: "Manager:",
        na: "N/A",
        createNewOwner: "Create a New Internal Owner Contact",
        newOwnerContactDetails: "New Owner Contact Details:",
        internalIdOptional: "Internal ID (Optional)",
        selectExistingOwner: "Select Existing Owner",
        loadingOwners: "Loading owners...",
        selectAnOwner: "-- Select an owner --",
        reasonForChange: "Reason for Change",
        processing: "Processing...",
        submitChangeRequest: "Submit Change Request",
        cancel: "Cancel"
    };

    const changeLGOwnerAr = {
        title: "تغيير المالك الداخلي لخطاب الضمان: {{lgNumber}}",
        currentOwnerDetails: "تفاصيل المالك الحالي:",
        email: "البريد الإلكتروني:",
        phone: "الهاتف:",
        manager: "المدير:",
        na: "غير متوفر",
        createNewOwner: "إنشاء جهة اتصال لمالك داخلي جديد",
        newOwnerContactDetails: "تفاصيل جهة اتصال المالك الجديد:",
        internalIdOptional: "المعرف الداخلي (اختياري)",
        selectExistingOwner: "اختيار مالك موجود",
        loadingOwners: "جاري تحميل الملاك...",
        selectAnOwner: "-- اختر مالك --",
        reasonForChange: "سبب التغيير",
        processing: "جاري المعالجة...",
        submitChangeRequest: "تقديم طلب التغيير",
        cancel: "إلغاء"
    };

    // 3. Assign
    Object.assign(enData.modals.bulkChangeLGOwnerModal, bulkChangeLGOwnerEn);
    Object.assign(arData.modals.bulkChangeLGOwnerModal, bulkChangeLGOwnerAr);

    Object.assign(enData.modals.bulkRemindersModal, bulkRemindersEn);
    Object.assign(arData.modals.bulkRemindersModal, bulkRemindersAr);

    Object.assign(enData.modals.cancelInstructionModal, cancelInstructionEn);
    Object.assign(arData.modals.cancelInstructionModal, cancelInstructionAr);

    Object.assign(enData.modals.changeLGOwnerModal, changeLGOwnerEn);
    Object.assign(arData.modals.changeLGOwnerModal, changeLGOwnerAr);


    // 4. Save
    fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
    fs.writeFileSync(arPath, JSON.stringify(arData, null, 2));

    console.log('Modals locales updated successfully (Batch 2).');
};

updateLocales();
