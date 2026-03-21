const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

const enLocales = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arLocales = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const pagesEn = {
    manageInternalOwners: {
        title: "Manage Internal Owners",
        gracePeriodTooltip: "This action is disabled during your subscription's grace period.",
        buttons: {
            addNew: "Add New Owner",
            addFirst: "Add First Owner"
        },
        loading: "Loading internal owners...",
        messages: {
            loadError: "Failed to load internal owner contacts. {{error}}",
            deleteConfirm: "Are you sure you want to delete this internal owner contact? This action is irreversible.",
            deleteSuccess: "Internal owner contact deleted successfully!",
            deleteError: "Failed to delete contact: {{error}}",
            warnGraceDisabled: "This action is disabled during your subscription's grace period.",
            noOwners: "No internal owner contacts found for your customer.",
            noSearchMatch: "No owners match your search criteria."
        },
        searchPlaceholder: "Search by email, phone, or ID...",
        headers: {
            email: "Email",
            phone: "Phone Number",
            internalId: "Internal ID",
            managerEmail: "Manager Email",
            viewLgs: "View LGs",
            actions: "Actions"
        },
        tooltips: {
            sendEmail: "Send email to {{email}}",
            call: "Call {{phone}}",
            viewAllLgs: "Click to view all LGs for this owner",
            noLgs: "No LGs to display",
            editOwner: "Edit Owner Details",
            reassignLgs: "Reassign all LGs for this owner",
            deleteOwner: "Delete Owner"
        },
        na: "N/A"
    },
    recordNewLg: {
        title: "Record New LG",
        gracePeriodTooltip: "This action is disabled during your subscription's grace period.",
        messages: {
            errorTitle: "Error",
            warnGraceDisabled: "This action is disabled during your subscription's grace period.",
            clearConfirm: "Are you sure you want to clear all form fields?",
            uploadError: "Please select an AI Scan File (image or PDF) first.",
            uploadTypeError: "Only image files (JPEG, PNG) or PDF files are supported for AI scanning.",
            uploadSuccess: "AI scan successful! Form fields have been auto-populated.",
            uploadFailed: "AI Scan failed: {{error}}",
            emailFormatError: "Please enter a valid email format for lookup.",
            ownerNotFound: "Internal Owner contact '{{email}}' not found. Please fill in details for a new contact.",
            lookupFailed: "Internal Owner lookup failed: {{error}}",
            submitSuccess: "LG Record configured successfully!",
            submitError: "Failed to configure LG record. {{error}}"
        },
        aiScan: {
            title: "AI Auto-Fill (Optional)",
            description: "Upload a scanned copy of an existing LG or SWIFT message. Our AI will attempt to extract data and auto-fill the form.",
            button: "Process with AI",
            processing: "Processing AI Scan...",
            selectFile: "Select a file to scan"
        },
        sections: {
            core: "1. Core LG & Beneficiary Information",
            bank: "2. Issuing Bank & Rule Details",
            internal: "3. Internal Tracking & Project Management"
        },
        fields: {
            beneficiary: "Beneficiary Corporate *",
            issuerName: "Issuer Name *",
            issuerId: "Issuer ID",
            lgNumber: "LG Number (Reference) *",
            amount: "LG Amount *",
            currency: "LG Currency *",
            payableCurrency: "Payable Currency",
            issueDate: "Issuance Date *",
            expiryDate: "Expiry Date *",
            autoRenewal: "Auto-Renewal Eligible",
            lgType: "LG Type *",
            operationalStatus: "Operational Status",
            purpose: "Description/Purpose *",
            paymentConditions: "Payment Conditions/Terms",
            issuingBank: "Issuing Bank *",
            advisingStatus: "Advising Status",
            advisingBank: "Advising/Confirming Bank *",
            foreignBankName: "Foreign Bank Name *",
            foreignBankCountry: "Foreign Bank Country *",
            foreignBankAddress: "Foreign Bank Address *",
            foreignBankSwift: "Foreign Bank SWIFT Code *",
            issuingBankAddress: "Issuing Bank Address *",
            issuingBankPhone: "Issuing Bank Phone *",
            issuingBankFax: "Issuing Bank Fax",
            issuingMethod: "Issuing Method (Preferred) *",
            applicableRule: "Applicable Rule *",
            rulesText: "Rules Text (if Other)",
            otherConditions: "Other Conditions/Instructions",
            internalOwnerEmail: "Internal Owner Email *",
            internalOwnerPhone: "Internal Owner Phone *",
            internalOwnerId: "Internal Owner Tracking ID",
            ownerManagerEmail: "Owner's Manager Email *",
            category: "LG Category *",
            internalProjectId: "Internal Contract/Project ID",
            notes: "Internal Notes",
            supportingDocument: "Internal Supporting Document (Optional)"
        },
        buttons: {
            clear: "Clear Form",
            save: "Record LG",
            lookup: "Lookup",
            changeContact: "Change Contact"
        },
        placeholders: {
            selectBeneficiary: "-- Select Beneficiary --",
            selectCurrency: "-- Select Currency --",
            selectLgType: "-- Select LG Type --",
            selectStatus: "-- Select Status --",
            selectBank: "Search or Select Bank",
            selectMethod: "-- Select Method --",
            selectRule: "-- Select Rule --",
            selectCategory: "-- Select Category --",
            enterEmail: "owner@company.com",
            enterNotes: "Any internal reference notes (not printed on LG)..."
        }
    }
};

const pagesAr = {
    manageInternalOwners: {
        title: "إدارة الملاك الداخليين",
        gracePeriodTooltip: "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
        buttons: {
            addNew: "إضافة مالك جديد",
            addFirst: "إضافة المالك الأول"
        },
        loading: "جاري تحميل الملاك الداخليين...",
        messages: {
            loadError: "فشل تحميل جهات اتصال المالك الداخلي. {{error}}",
            deleteConfirm: "هل أنت متأكد أنك تريد حذف جهة اتصال المالك الداخلي هذه؟ هذا الإجراء لا يمكن التراجع عنه.",
            deleteSuccess: "تم حذف جهة اتصال المالك الداخلي بنجاح!",
            deleteError: "فشل حذف جهة الاتصال: {{error}}",
            warnGraceDisabled: "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
            noOwners: "لم يتم العثور على جهات اتصال للمالك الداخلي لعميلك.",
            noSearchMatch: "لا توجد جهات اتصال تطابق معايير البحث الخاصة بك."
        },
        searchPlaceholder: "البحث بالبريد الإلكتروني، أو الهاتف، أو المعرف...",
        headers: {
            email: "البريد الإلكتروني",
            phone: "رقم الهاتف",
            internalId: "المعرف الداخلي",
            managerEmail: "البريد الإلكتروني للمدير",
            viewLgs: "عرض خطابات الضمان",
            actions: "الإجراءات"
        },
        tooltips: {
            sendEmail: "إرسال بريد إلكتروني إلى {{email}}",
            call: "اتصال {{phone}}",
            viewAllLgs: "انقر لعرض جميع خطابات الضمان لهذا المالك",
            noLgs: "لا توجد خطابات ضمان للعرض",
            editOwner: "تعديل تفاصيل المالك",
            reassignLgs: "إعادة تعيين جميع خطابات الضمان لهذا المالك",
            deleteOwner: "حذف المالك"
        },
        na: "غير متوفر"
    },
    recordNewLg: {
        title: "تسجيل خطاب ضمان جديد",
        gracePeriodTooltip: "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
        messages: {
            errorTitle: "خطأ",
            warnGraceDisabled: "تم تعطيل هذا الإجراء أثناء فترة السماح للاشتراك الخاصة بك.",
            clearConfirm: "هل أنت متأكد أنك تريد مسح جميع حقول النموذج؟",
            uploadError: "يرجى تحديد ملف مسح ذكاء اصطناعي (صورة أو ملف PDF) أولاً.",
            uploadTypeError: "يتم دعم ملفات الصور (JPEG, PNG) أو ملفات PDF فقط للمسح بالذكاء الاصطناعي.",
            uploadSuccess: "نجح مسح الذكاء الاصطناعي! تم ملء حقول النموذج تلقائياً.",
            uploadFailed: "فشل مسح الذكاء الاصطناعي: {{error}}",
            emailFormatError: "يرجى إدخال تنسيق بريد إلكتروني صالح للبحث.",
            ownerNotFound: "لم يتم العثور على جهة اتصال المالك الداخلي '{{email}}'. يرجى ملء التفاصيل لجهة اتصال جديدة.",
            lookupFailed: "فشل البحث عن المالك الداخلي: {{error}}",
            submitSuccess: "تم تكوين سجل خطاب الضمان بنجاح!",
            submitError: "فشل تكوين سجل خطاب الضمان. {{error}}"
        },
        aiScan: {
            title: "التعبئة التلقائية بالذكاء الاصطناعي (اختياري)",
            description: "قم بتحميل نسخة ممسوحة ضوئيًا من خطاب ضمان موجود أو رسالة سويفت. سيحاول الذكاء الاصطناعي الخاص بنا استخراج البيانات وملء النموذج تلقائيًا.",
            button: "المعالجة بالذكاء الاصطناعي",
            processing: "جاري المعالجة...",
            selectFile: "تحديد ملف للمسح"
        },
        sections: {
            core: "1. المعلومات الأساسية لخطاب الضمان والمستفيد",
            bank: "2. البنك المصدر وتفاصيل القاعدة",
            internal: "3. التتبع والتفاصيل الداخلية"
        },
        fields: {
            beneficiary: "الشركة المستفيدة *",
            issuerName: "اسم المصدر *",
            issuerId: "رقم هوية المصدر",
            lgNumber: "رقم خطاب الضمان (المرجع) *",
            amount: "قيمة خطاب الضمان *",
            currency: "عملة خطاب الضمان *",
            payableCurrency: "العملة القابلة للدفع",
            issueDate: "تاريخ الإصدار *",
            expiryDate: "تاريخ الانتهاء *",
            autoRenewal: "مؤهل للتجديد التلقائي",
            lgType: "نوع خطاب الضمان *",
            operationalStatus: "الحالة التشغيلية",
            purpose: "الوصف / الغرض *",
            paymentConditions: "شروط الدفع",
            issuingBank: "البنك المصدر *",
            advisingStatus: "حالة التبليغ",
            advisingBank: "البنك المبلغ / المعزز *",
            foreignBankName: "اسم البنك الأجنبي *",
            foreignBankCountry: "بلد البنك الأجنبي *",
            foreignBankAddress: "عنوان البنك الأجنبي *",
            foreignBankSwift: "رمز سويفت للبنك الأجنبي *",
            issuingBankAddress: "عنوان البنك المصدر *",
            issuingBankPhone: "هاتف البنك المصدر *",
            issuingBankFax: "فاكس البنك المصدر",
            issuingMethod: "طريقة الإصدار (المفضلة) *",
            applicableRule: "القاعدة المطبقة *",
            rulesText: "نص القاعدة (إذا كان اختيارًا آخر)",
            otherConditions: "شروط / تعليمات أخرى",
            internalOwnerEmail: "البريد الإلكتروني للمالك الداخلي *",
            internalOwnerPhone: "رقم هاتف المالك الداخلي *",
            internalOwnerId: "الرقم الداخلي للمالك",
            ownerManagerEmail: "البريد الإلكتروني لمدير المالك *",
            category: "فئة خطاب الضمان *",
            internalProjectId: "رقم المشروع / العقد الداخلي",
            notes: "ملاحظات داخلية",
            supportingDocument: "مستند داعم داخلي (اختياري)"
        },
        buttons: {
            clear: "مسح النموذج",
            save: "تسجيل خطاب الضمان",
            lookup: "بحث",
            changeContact: "تغيير جهة الاتصال"
        },
        placeholders: {
            selectBeneficiary: "-- اختر المستفيد --",
            selectCurrency: "-- اختر العملة --",
            selectLgType: "-- اختر نوع خطاب الضمان --",
            selectStatus: "-- اختر الحالة --",
            selectBank: "ابحث أو اختر بنك",
            selectMethod: "-- اختر الطريقة --",
            selectRule: "-- اختر القاعدة --",
            selectCategory: "-- اختر الفئة --",
            enterEmail: "owner@company.com",
            enterNotes: "أي ملاحظات للرجوع إليها داخليًا..."
        }
    }
};

if (!enLocales.pages) enLocales.pages = {};
enLocales.pages = { ...enLocales.pages, ...pagesEn };

if (!arLocales.pages) arLocales.pages = {};
arLocales.pages = { ...arLocales.pages, ...pagesAr };

fs.writeFileSync(enPath, JSON.stringify(enLocales, null, 2) + '\n');
fs.writeFileSync(arPath, JSON.stringify(arLocales, null, 2) + '\n');

console.log('Locales updated for EndUser Batch 3.');
