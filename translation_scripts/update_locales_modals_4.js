const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'locales', 'en', 'translation.json');
const arPath = path.join(__dirname, 'src', 'locales', 'ar', 'translation.json');

const updateLocale = (filePath, newKeys) => {
    let data = {};
    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, 'utf8');
        try {
            data = JSON.parse(rawData);
        } catch (e) {
            console.error(`Error parsing ${filePath}:`, e);
            return;
        }
    }

    // Ensure modals object exists
    if (!data.modals) data.modals = {};

    // Deep merge newKeys into data.modals
    for (const [modalName, modalKeys] of Object.entries(newKeys)) {
        if (!data.modals[modalName]) {
            data.modals[modalName] = {};
        }
        data.modals[modalName] = { ...data.modals[modalName], ...modalKeys };
    }

    // Sort keys alphabetically for clean diffs
    const sortedData = { ...data };
    if (sortedData.modals) {
        const sortedModals = {};
        Object.keys(sortedData.modals).sort().forEach(k => {
            sortedModals[k] = sortedData.modals[k];
        });
        sortedData.modals = sortedModals;
    }

    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2), 'utf8');
    console.log(`Updated ${filePath} successfully.`);
};

// ============================================
// ENGLISH TRANSLATIONS
// ============================================
const enTranslations = {
    internalOwnerFormModal: {
        editTitle: "Edit Internal Owner Details",
        addTitle: "Add New Internal Owner",
        saveChanges: "Save Changes",
        addOwner: "Add Owner",
        email: "Email",
        phoneNumber: "Phone Number",
        internalId: "Internal ID (Optional)",
        managerEmail: "Manager Email",
        processing: "Processing...",
        cancel: "Cancel",
        gracePeriodWarning: "This action is disabled during your subscription's grace period."
    },
    issuanceExecutionModal: {
        title: "Execute Issuance (Smart Mode)",
        beneficiary: "Beneficiary:",
        requestAmount: "Request Amount",
        selectBestBankOption: "Select Best Bank Option",
        analyzingRates: "Analyzing best rates...",
        noSufficientLimits: "No sufficient limits found.",
        bestPrice: "BEST PRICE",
        avail: "Avail:",
        commission: "Commission:",
        cashMargin: "Cash Margin:",
        zeroMargin: "ZERO MARGIN",
        bankRefNumber: "Bank Ref Number",
        issueDate: "Issue Date",
        confirmIssuance: "Confirm Issuance",
        placeholderBankRef: "e.g. LG-2025-001"
    },
    lgActivateNonOperativeModal: {
        title: "Activate LG Record:",
        loadingData: "Loading data...",
        lgDetails: "LG Details",
        type: "Type:",
        status: "Status:",
        paymentInformation: "Payment Information",
        paymentAmount: "Payment Amount*",
        currency: "Currency*",
        selectCurrency: "Select Currency",
        issuingBank: "Issuing Bank*",
        selectBank: "Select Bank",
        paymentMethod: "Payment Method*",
        paymentDate: "Payment Date*",
        paymentReference: "Payment Reference",
        additionalNotes: "Additional Notes (Optional)",
        supportingDocument: "Supporting Document",
        attachDocumentsRelated: "Attach any documents related to this request (e.g., proof of advance payment).",
        activateLg: "Activate LG",
        activating: "Activating...",
        cancel: "Cancel"
    },
    lgAmendModal: {
        title: "Amend LG Record:",
        lgNumber: "LG Number",
        beneficiary: "Beneficiary",
        issuanceDate: "Issuance Date",
        expiryDate: "Expiry Date",
        lgAmount: "LG Amount",
        autoRenewal: "Auto-Renewal",
        paymentConditions: "Payment Conditions",
        purpose: "Purpose",
        otherConditions: "Other Conditions",
        notes: "Notes",
        reasonForAmendment: "Reason for Amendment",
        amendmentLetterFromBank: "Amendment Letter from Bank",
        scanCopyMandatory: "A scanned copy of the bank's amendment letter is mandatory.",
        submitAmendment: "Submit Amendment",
        amending: "Amending...",
        cancel: "Cancel",
        amended: "Amended"
    }
};

// ============================================
// ARABIC TRANSLATIONS
// ============================================
const arTranslations = {
    internalOwnerFormModal: {
        editTitle: "تعديل تفاصيل المالك الداخلي",
        addTitle: "إضافة مالك داخلي جديد",
        saveChanges: "حفظ التغييرات",
        addOwner: "إضافة مالك",
        email: "البريد الإلكتروني",
        phoneNumber: "رقم الهاتف",
        internalId: "المعرف الداخلي (اختياري)",
        managerEmail: "البريد الإلكتروني للمدير",
        processing: "جاري المعالجة...",
        cancel: "إلغاء",
        gracePeriodWarning: "هذا الإجراء معطل خلال فترة السماح لاشتراكك."
    },
    issuanceExecutionModal: {
        title: "تحديث الإصدار (الوضع الذكي)",
        beneficiary: "المستفيد:",
        requestAmount: "مبلغ الطلب",
        selectBestBankOption: "اختر أفضل خيار بنكي",
        analyzingRates: "جاري تحليل أفضل الأسعار...",
        noSufficientLimits: "لم يتم العثور على حدود كافية.",
        bestPrice: "أفضل سعر",
        avail: "متاح:",
        commission: "العمولة:",
        cashMargin: "التغطية النقدية:",
        zeroMargin: "بدون تغطية",
        bankRefNumber: "الرقم المرجعي للبنك",
        issueDate: "تاريخ الإصدار",
        confirmIssuance: "تأكيد الإصدار",
        placeholderBankRef: "مثال: LG-2025-001"
    },
    lgActivateNonOperativeModal: {
        title: "تفعيل خطاب الضمان:",
        loadingData: "جاري تحميل البيانات...",
        lgDetails: "تفاصيل خطاب الضمان",
        type: "النوع:",
        status: "الحالة:",
        paymentInformation: "معلومات الدفع",
        paymentAmount: "مبلغ الدفع*",
        currency: "العملة*",
        selectCurrency: "اختر العملة",
        issuingBank: "البنك المصدر*",
        selectBank: "اختر البنك",
        paymentMethod: "طريقة الدفع*",
        paymentDate: "تاريخ الدفع*",
        paymentReference: "الرقم المرجعي للدفع",
        additionalNotes: "ملاحظات إضافية (اختياري)",
        supportingDocument: "مستند داعم",
        attachDocumentsRelated: "قم بإرفاق أي مستندات متعلقة بهذا الطلب (مثال: إثبات الدفع المقدم).",
        activateLg: "تفعيل",
        activating: "جاري التفعيل...",
        cancel: "إلغاء"
    },
    lgAmendModal: {
        title: "تعديل خطاب الضمان:",
        lgNumber: "رقم خطاب الضمان",
        beneficiary: "المستفيد",
        issuanceDate: "تاريخ الإصدار",
        expiryDate: "تاريخ الانتهاء",
        lgAmount: "مبلغ خطاب الضمان",
        autoRenewal: "تجديد تلقائي",
        paymentConditions: "شروط الدفع",
        purpose: "الغرض",
        otherConditions: "شروط أخرى",
        notes: "ملاحظات",
        reasonForAmendment: "سبب التعديل",
        amendmentLetterFromBank: "خطاب التعديل من البنك",
        scanCopyMandatory: "يجب إرفاق نسخة ضوئية من خطاب التعديل البنكي.",
        submitAmendment: "تقديم التعديل",
        amending: "جاري التعديل...",
        cancel: "إلغاء",
        amended: "معدل"
    }
};

console.log('Updating English translations...');
updateLocale(enPath, enTranslations);

console.log('Updating Arabic translations...');
updateLocale(arPath, arTranslations);

console.log('Done.');
