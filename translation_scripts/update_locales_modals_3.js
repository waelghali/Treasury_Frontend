const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

// Read existing translations
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

// New translations for Batch 3 Modals
const newTranslations = {
    decreaseAmountModal: {
        title: "Decrease LG Amount: {{lgNumber}}",
        description: "Reduce the amount of this LG. This action may require approval.",
        currentAmount: "Current LG Amount",
        status: "Status",
        amountToDecrease: "Amount to be Decreased ({{currencyCode}})",
        newRemainingAmount: "New Remaining LG Amount:",
        reasonForDecrease: "Reason for Amount Decrease",
        additionalNotes: "Additional Notes (Optional)",
        supportingDocument: "Supporting Document",
        attachDocumentsDescription: "Attach any documents related to this request (e.g., formal request from beneficiary).",
        processing: "Processing...",
        submitDecreaseRequest: "Submit Decrease Request",
        cancel: "Cancel",
        gracePeriodWarning: "This action is disabled during your subscription's grace period.",
        successMessageApproval: "LG Decrease Amount request submitted for approval. Request ID: {{id}}.",
        successMessageDirect: "LG {{lgNumber}} amount decreased successfully!",
        validationAmountRequired: "Amount to decrease is required",
        validationAmountPositive: "Amount to decrease must be positive",
        validationAmountMax: "Amount to decrease must be less than current LG amount ({{currentAmount}})",
        validationReasonRequired: "Reason for amount decrease is required",
        validationReasonLength: "Reason must be at least 10 characters."
    },
    extendLGModal: {
        title: "Extend Letter of Guarantee: {{lgNumber}}",
        description: "Extend the expiry date for this LG.",
        currentExpiryDate: "Current Expiry Date",
        currentAmount: "Current LG Amount",
        extensionMethod: "Extension Method",
        selectSpecificDate: "Select Specific Date",
        extendByMonths: "Extend by Months",
        newExpiryDate: "New Expiry Date",
        numberOfMonths: "Number of Months to Extend",
        newExpiryDateApprox: "New Expiry Date will be approximately:",
        additionalNotes: "Additional Notes (Optional)",
        processing: "Processing...",
        extendLG: "Extend LG",
        cancel: "Cancel",
        gracePeriodWarning: "This action is disabled during your subscription's grace period.",
        successMessage: "LG Record {{lgNumber}} successfully extended to {{date}}.",
        validationMethodRequired: "Extension method is required.",
        validationDateRequired: "New Expiry Date is required.",
        validationDateAfterCurrent: "New Expiry Date must be after the current one.",
        validationMonthsRequired: "Number of months is required.",
        validationMonthsPositive: "Number of months must be a positive integer."
    },
    historyExportModal: {
        title: "Export LG Action History",
        from: "From",
        to: "To",
        includeActions: "Include Actions:",
        cancel: "Cancel",
        exportHistory: "Export History",
        noHistoryFound: "No history found for the selected criteria.",
        successExport: "Successfully exported {{count}} history events.",
        errorExport: "Failed to export history. Please ensure you are logged in and the list data is accessible."
    },
    facilityFormModal: {
        createTitle: "Create Issuance Facility",
        updateTitle: "Update Facility",
        modelVersion: "Model Version: Issuance-v2.1 (Multi-CCY Enabled)",
        tabs: {
            basicInfo: "BASIC INFO",
            riskGovernance: "RISK & GOVERNANCE",
            subLimitsPricing: "SUB-LIMITS & PRICING"
        },
        basicInfo: {
            permittedCustomerEntities: "Permitted Customer Entities (Multiple Choice)",
            facilityAttachment: "Facility Attachment",
            changeFile: "Change File",
            chooseFile: "Choose File",
            existingAttachment: "Existing attachment saved",
            noFileSelected: "No file selected",
            facilityName: "Facility Name *",
            facilityNamePlaceholder: "e.g. Master Facility",
            totalFacilityAmount: "Total Facility Amount *",
            facilityTenor: "Facility Tenor *",
            months: "Months",
            bankPartner: "Bank Partner *",
            selectBank: "Select Bank...",
            baseCurrency: "Base Currency *",
            selectCurrency: "Select CCY...",
            status: "Status",
            statusActive: "ACTIVE",
            statusSuspended: "SUSPENDED",
            referenceNumber: "Reference #",
            startDate: "Start Date",
            expiryDate: "Expiry Date",
            nextReview: "Next Review",
            foreignCorrespondentDetails: "Foreign Correspondent Details",
            bankName: "Bank Name",
            swift: "SWIFT",
            country: "Country",
            fullAddress: "Full Address"
        },
        riskGovernance: {
            riskSettings: "Risk & Multi-Currency Settings",
            multiCurrencyAllowed: "Multi-Currency Allowed",
            multiCurrencyDesc: "Enable issuance in currencies other than base currency",
            fxBreachAutoSuspend: "FX Breach Auto-Suspend",
            fxBreachDesc: "Lock facility if currency revaluation hits total limit",
            marginReducesExposure: "Margin Reduces Exposure",
            marginReducesDesc: "Deduct cash margin from utilized limit",
            governanceSLA: "Governance & SLA",
            slaAgreementDays: "SLA Agreement (Days)",
            marginLeadTimeDays: "Margin Lead Time (Days)",
            allowCrossBorder: "Allow Cross-Border",
            allowCrossBorderDesc: "Master switch for multi-country beneficiary issuance",
            allowThirdPartyIssuance: "Allow Third Party Issuance",
            allowThirdPartyDesc: "Allow issuance on behalf of third parties",
            internalNotes: "Internal Notes & Special Conditions",
            internalNotesPlaceholder: "Paste credit committee approval notes..."
        },
        subLimits: {
            allocationTitle: "Allocation of Sub-Limits",
            newAllocation: "+ NEW ALLOCATION",
            lgTypes: "LG Types",
            limitAmount: "Limit Amount",
            allocationLabel: "Allocation Label",
            allocationLabelPlaceholder: "Enter label...",
            commissionStructure: "Commission Structure",
            commRate: "Comm. Rate (%)",
            minFees: "Min. Fees (Floor)",
            flatProcessingFee: "Flat Processing Fee",
            rules: "Rules",
            cashMargin: "Cash Margin (%)",
            maxTenor: "Max Tenor (Days)",
            allowsConfirm: "Allows Confirm.",
            geography: "Geography",
            allowOnly: "ALLOW ONLY (+)",
            excludeThese: "EXCLUDE THESE (-)",
            isoCodesPlaceholder: "ISO codes: UAE, SA, EG...",
            crossBorderOff: "Facility cross-border switch is OFF."
        },
        footer: {
            schemaCompliant: "Issuance-v2.1 Full Schema Compliant",
            discard: "Discard",
            uploading: "UPLOADING...",
            authorizeUpdate: "AUTHORIZE & UPDATE FACILITY",
            authorizeSave: "AUTHORIZE & SAVE FACILITY"
        }
    }
};

const arTranslations = {
    decreaseAmountModal: {
        title: "تخفيض قيمة خطاب الضمان: {{lgNumber}}",
        description: "تقليل قيمة هذا الخطاب. قد يتطلب هذا الإجراء موافقة.",
        currentAmount: "القيمة الحالية للخطاب",
        status: "الحالة",
        amountToDecrease: "القيمة المراد تخفيضها ({{currencyCode}})",
        newRemainingAmount: "القيمة المتبقية الجديدة للخطاب:",
        reasonForDecrease: "سبب تخفيض القيمة",
        additionalNotes: "ملاحظات إضافية (اختياري)",
        supportingDocument: "المستند الداعم",
        attachDocumentsDescription: "أرفق أي مستندات متعلقة بهذا الطلب (مثال: طلب رسمي من المستفيد).",
        processing: "جارٍ المعالجة...",
        submitDecreaseRequest: "تقديم طلب التخفيض",
        cancel: "إلغاء",
        gracePeriodWarning: "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        successMessageApproval: "تم إرسال طلب تخفيض قيمة الخطاب للموافقة. رقم الطلب: {{id}}.",
        successMessageDirect: "تم تخفيض قيمة الخطاب {{lgNumber}} بنجاح!",
        validationAmountRequired: "قيمة التخفيض مطلوبة",
        validationAmountPositive: "يجب أن تكون قيمة التخفيض موجبة",
        validationAmountMax: "يجب أن تكون قيمة التخفيض أقل من القيمة الحالية للخطاب ({{currentAmount}})",
        validationReasonRequired: "سبب التخفيض مطلوب",
        validationReasonLength: "يجب أن يكون السبب 10 أحرف على الأقل."
    },
    extendLGModal: {
        title: "تمديد خطاب الضمان: {{lgNumber}}",
        description: "تاريخ انتهاء الصلاحية لخطاب الضمان هذا.",
        currentExpiryDate: "تاريخ الانتهاء الحالي",
        currentAmount: "القيمة الحالية للخطاب",
        extensionMethod: "طريقة التمديد",
        selectSpecificDate: "تحديد تاريخ معين",
        extendByMonths: "تمديد بالأشهر",
        newExpiryDate: "تاريخ الانتهاء الجديد",
        numberOfMonths: "عدد أشهر التمديد",
        newExpiryDateApprox: "سيكون تاريخ الانتهاء الجديد تقريبًا:",
        additionalNotes: "ملاحظات إضافية (اختياري)",
        processing: "جارٍ المعالجة...",
        extendLG: "تمديد خطاب الضمان",
        cancel: "إلغاء",
        gracePeriodWarning: "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        successMessage: "تم تمديد سجل خطاب الضمان {{lgNumber}} بنجاح إلى {{date}}.",
        validationMethodRequired: "طريقة التمديد مطلوبة.",
        validationDateRequired: "تاريخ الانتهاء الجديد مطلوب.",
        validationDateAfterCurrent: "يجب أن يكون تاريخ الانتهاء الجديد بعد التاريخ الحالي.",
        validationMonthsRequired: "عدد الأشهر مطلوب.",
        validationMonthsPositive: "يجب أن يكون عدد الأشهر عددًا صحيحًا موجبًا."
    },
    historyExportModal: {
        title: "تصدير سجل إجراءات خطاب الضمان",
        from: "من",
        to: "إلى",
        includeActions: "تضمين الإجراءات:",
        cancel: "إلغاء",
        exportHistory: "تصدير السجل",
        noHistoryFound: "لم يتم العثور على سجل للمعايير المحددة.",
        successExport: "تم تصدير {{count}} أحداث بنجاح.",
        errorExport: "فشل تصدير السجل. يرجى التأكد من أنك قيد تسجيل الدخول وإمكانية الوصول إلى البيانات."
    },
    facilityFormModal: {
        createTitle: "إنشاء تسهيل إصدار",
        updateTitle: "تحديث التسهيل",
        modelVersion: "إصدار النموذج: إصدار-v2.1 (مفعل بعملات متعددة)",
        tabs: {
            basicInfo: "المعلومات الأساسية",
            riskGovernance: "المخاطر والحوكمة",
            subLimitsPricing: "الحدود الفرعية والتسعير"
        },
        basicInfo: {
            permittedCustomerEntities: "كيانات العملاء المسموح بها (اختيار متعدد)",
            facilityAttachment: "مرفق التسهيل",
            changeFile: "تغيير الملف",
            chooseFile: "اختيار ملف",
            existingAttachment: "تم حفظ المرفق الحالي",
            noFileSelected: "لم يتم تحديد ملف",
            facilityName: "اسم التسهيل *",
            facilityNamePlaceholder: "مثال: التسهيل الرئيسي",
            totalFacilityAmount: "إجمالي قيمة التسهيل *",
            facilityTenor: "المدة الزمنية للتسهيل *",
            months: "أشهر",
            bankPartner: "البنك الشريك *",
            selectBank: "اختر البنك...",
            baseCurrency: "العملة الأساسية *",
            selectCurrency: "اختر العملة...",
            status: "الحالة",
            statusActive: "مفعل",
            statusSuspended: "موقوف",
            referenceNumber: "الرقم المرجعي #",
            startDate: "تاريخ البدء",
            expiryDate: "تاريخ الانتهاء",
            nextReview: "المراجعة التالية",
            foreignCorrespondentDetails: "تفاصيل المراسل الأجنبي",
            bankName: "اسم البنك",
            swift: "سويفت الدفع",
            country: "الدولة",
            fullAddress: "العنوان الكامل"
        },
        riskGovernance: {
            riskSettings: "إعدادات المخاطر والعملات المتعددة",
            multiCurrencyAllowed: "السماح بالعملات المتعددة",
            multiCurrencyDesc: "تفعيل الإصدار بعملات غير العملة الأساسية",
            fxBreachAutoSuspend: "التعليق التلقائي لاختراق الصرف",
            fxBreachDesc: "قفل التسهيل إذا تجاوزت إعادة تقييم العملة الحد الإجمالي",
            marginReducesExposure: "الهامش يقلل الانكشاف",
            marginReducesDesc: "خصم الهامش النقدي من الحد المستخدم",
            governanceSLA: "الحوكمة واتفاقية مستوى الخدمة",
            slaAgreementDays: "أيام اتفاقية مستوى الخدمة",
            marginLeadTimeDays: "المهلة الزمنية للهامش (أيام)",
            allowCrossBorder: "السماح عبر الحدود",
            allowCrossBorderDesc: "المفتاح الرئيسي لإصدار المستفيد من دول متعددة",
            allowThirdPartyIssuance: "السماح بإصدار طرف ثالث",
            allowThirdPartyDesc: "السماح بالإصدار نيابة عن أطراف ثالثة",
            internalNotes: "ملاحظات داخلية وشروط خاصة",
            internalNotesPlaceholder: "الصق ملاحظات موافقة لجنة الائتمان العالي..."
        },
        subLimits: {
            allocationTitle: "تخصيص الحدود الفرعية",
            newAllocation: "+ تخصيص جديد",
            lgTypes: "أنواع خطابات الضمان",
            limitAmount: "مبلغ الحد",
            allocationLabel: "تسمية التخصيص",
            allocationLabelPlaceholder: "أدخل التسمية...",
            commissionStructure: "هيكل العمولة",
            commRate: "معدل العمولة (%)",
            minFees: "الحد الأدنى للرسوم",
            flatProcessingFee: "رسوم معالجة ثابتة",
            rules: "القواعد",
            cashMargin: "الهامش النقدي (%)",
            maxTenor: "أقصى مدة (أيام)",
            allowsConfirm: "يسمح بالتأكيد.",
            geography: "الجغرافيا",
            allowOnly: "السماح فقط (+)",
            excludeThese: "استبعاد هذه (-)",
            isoCodesPlaceholder: "رموز ISO: UAE, SA, EG...",
            crossBorderOff: "مفتاح مبادلة التسهيل الإقليمي مغلق."
        },
        footer: {
            schemaCompliant: "متوافق مع مخطط الإصدار v2.1",
            discard: "تجاهل",
            uploading: "جارٍ الرفع...",
            authorizeUpdate: "تصريح وتحديث التسهيل",
            authorizeSave: "تصريح وحفظ التسهيل"
        }
    }
};

// Merge translations
enData.modals = { ...enData.modals, ...newTranslations };
arData.modals = { ...arData.modals, ...arTranslations };

// Write back to files
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2));

console.log('Successfully updated en.json and ar.json with Batch 3 Modals.');
