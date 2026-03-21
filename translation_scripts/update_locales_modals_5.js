const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'locales', 'en', 'translation.json');
const arPath = path.join(__dirname, 'src', 'locales', 'ar', 'translation.json');

const enStrings = {
    "liquidateLgModal": {
        "title": "Liquidate LG:",
        "chooseLiquidationText": "Choose full or partial liquidation for this LG. This action may require approval.",
        "currentLgAmount": "Current LG Amount:",
        "liquidationType": "Liquidation Type",
        "fullLiquidation": "Full Liquidation (Amount becomes 0)",
        "partialLiquidation": "Partial Liquidation (Reduce Amount)",
        "newAmountAfterPartial": "New LG Amount after Partial Liquidation",
        "reasonForLiquidation": "Reason for Liquidation",
        "additionalNotes": "Additional Notes (Optional)",
        "additionalNotesHint": "Provide any additional free-text notes for this liquidation.",
        "supportingDocument": "Supporting Document",
        "attachDocumentsRelated": "Attach any documents related to this request (e.g., formal request from beneficiary).",
        "submitLiquidation": "Submit Liquidation Request",
        "processing": "Processing...",
        "cancel": "Cancel",
        "disabledGracePeriod": "This action is disabled during your subscription's grace period."
    },
    "recordBankReplyModal": {
        "title": "Record Bank Reply for Instruction:",
        "instructionText": "Record the bank's response to this instruction.",
        "lg": "LG:",
        "type": "Type:",
        "issued": "Issued:",
        "delivered": "Delivered:",
        "bankReplyDate": "Bank Reply Date",
        "replyDetails": "Reply Details (Optional)",
        "bankReplyDocument": "Bank Reply Document (Optional)",
        "supportedFormats": "Supported formats: JPG, PNG, PDF. (Max 5MB)",
        "recordReply": "Record Reply",
        "processing": "Processing...",
        "cancel": "Cancel"
    },
    "recordDeliveryModal": {
        "title": "Record Delivery for Instruction:",
        "instructionText": "Confirm when this instruction was delivered to the bank and attach any supporting evidence.",
        "lg": "LG:",
        "type": "Type:",
        "issued": "Issued:",
        "deliveryDate": "Delivery Date",
        "deliveryDocument": "Delivery Document",
        "supportedFormats": "Supported formats: JPG, PNG, PDF. (Max 5MB)",
        "recordDelivery": "Record Delivery",
        "processing": "Processing...",
        "cancel": "Cancel"
    },
    "releaseLgModal": {
        "title": "Release LG:",
        "instructionText": "Confirm release of this LG. This action will change the LG status to \"Released\" and may require approval.",
        "currentLgAmount": "Current LG Amount:",
        "status": "Status:",
        "reasonForRelease": "Reason for Release",
        "additionalNotes": "Additional Notes (Optional)",
        "supportingDocument": "Supporting Document",
        "attachDocumentsRelated": "Attach any documents related to this request (e.g., formal request from beneficiary).",
        "totalDocuments": "Total Documents on Record",
        "pendingReplies": "Pending Bank Replies",
        "submitRelease": "Submit Release Request",
        "processing": "Processing...",
        "cancel": "Cancel"
    },
    "runAutoRenewalModal": {
        "title": "Run Auto/Forced LG Renewal",
        "messageEligible": "This process will identify all your eligible Letters of Guarantee for auto-renewal and for forced renewal.",
        "messageDetailed": "For each eligible LG (which may differ from the list shown below), the system will automatically extend its expiry date, generate an individual instruction letter, and send an individual email notification. A single, combined PDF containing all generated instruction letters will be provided for download.",
        "successfullyRenewed": "Successfully renewed:",
        "lgs": "LGs",
        "close": "Close",
        "confirmAndRun": "Confirm & Run Renewal",
        "processing": "Processing...",
        "cancel": "Cancel"
    }
};

const arStrings = {
    "liquidateLgModal": {
        "title": "تسييل خطاب الضمان:",
        "chooseLiquidationText": "اختر تسييل كلي أو جزئي لخطاب الضمان. قد يتطلب هذا الإجراء موافقة.",
        "currentLgAmount": "مبلغ خطاب الضمان الحالي:",
        "liquidationType": "نوع التسييل",
        "fullLiquidation": "تسييل كلي (يصبح المبلغ 0)",
        "partialLiquidation": "تسييل جزئي (تخفيض المبلغ)",
        "newAmountAfterPartial": "مبلغ خطاب الضمان الجديد بعد التسييل الجزئي",
        "reasonForLiquidation": "سبب التسييل",
        "additionalNotes": "ملاحظات إضافية (اختياري)",
        "additionalNotesHint": "قدم أي ملاحظات نصية حرة إضافية لهذا التسييل.",
        "supportingDocument": "مستند داعم",
        "attachDocumentsRelated": "أرفق أي مستندات متعلقة بهذا الطلب (مثل طلب رسمي من المستفيد).",
        "submitLiquidation": "تقديم طلب التسييل",
        "processing": "جاري المعالجة...",
        "cancel": "إلغاء",
        "disabledGracePeriod": "هذا الإجراء معطل خلال فترة السماح لاشتراكك."
    },
    "recordBankReplyModal": {
        "title": "تسجيل رد البنك للتعليمات:",
        "instructionText": "سجل رد البنك على هذه التعليمات.",
        "lg": "خطاب الضمان:",
        "type": "النوع:",
        "issued": "تاريخ الإصدار:",
        "delivered": "تاريخ التسليم:",
        "bankReplyDate": "تاريخ رد البنك",
        "replyDetails": "تفاصيل الرد (اختياري)",
        "bankReplyDocument": "مستند رد البنك (اختياري)",
        "supportedFormats": "التنسيقات المدعومة: JPG, PNG, PDF. (كحد أقصى 5 ميغابايت)",
        "recordReply": "تسجيل الرد",
        "processing": "جاري المعالجة...",
        "cancel": "إلغاء"
    },
    "recordDeliveryModal": {
        "title": "تسجيل التسليم للتعليمات:",
        "instructionText": "قم بتأكيد تاريخ تسليم هذه التعليمات للبنك وأرفق أي دليل داعم.",
        "lg": "خطاب الضمان:",
        "type": "النوع:",
        "issued": "تاريخ الإصدار:",
        "deliveryDate": "تاريخ التسليم",
        "deliveryDocument": "مستند التسليم",
        "supportedFormats": "التنسيقات المدعومة: JPG, PNG, PDF. (كحد أقصى 5 ميغابايت)",
        "recordDelivery": "تسجيل التسليم",
        "processing": "جاري المعالجة...",
        "cancel": "إلغاء"
    },
    "releaseLgModal": {
        "title": "إلغاء خطاب الضمان:",
        "instructionText": "قم بتأكيد إلغاء خطاب الضمان هذا. سيؤدي هذا الإجراء إلى تغيير حالة خطاب الضمان إلى \"ملغى\" وقد يتطلب الموافقة.",
        "currentLgAmount": "مبلغ خطاب الضمان الحالي:",
        "status": "الحالة:",
        "reasonForRelease": "سبب الإلغاء",
        "additionalNotes": "ملاحظات إضافية (اختياري)",
        "supportingDocument": "مستند داعم",
        "attachDocumentsRelated": "أرفق أي مستندات متعلقة بهذا الطلب (مثل طلب رسمي من المستفيد).",
        "totalDocuments": "إجمالي المستندات المسجلة",
        "pendingReplies": "ردود البنك المعلقة",
        "submitRelease": "تقديم طلب الإلغاء",
        "processing": "جاري المعالجة...",
        "cancel": "إلغاء"
    },
    "runAutoRenewalModal": {
        "title": "تشغيل التجديد التلقائي/الإجباري لخطابات الضمان",
        "messageEligible": "ستحدد هذه العملية جميع خطابات الضمان المؤهلة للتجديد التلقائي وللتجديد الإجباري.",
        "messageDetailed": "لكل خطاب ضمان مؤهل (والذي قد يختلف عن القائمة الموضحة أدناه)، سيقوم النظام تلقائيًا بتمديد تاريخ انتهاء صلاحيته، وإنشاء خطاب تعليمات فردي، وإرسال إشعار بريد إلكتروني فردي. سيتم توفير ملف PDF واحد مجمع يحتوي على جميع خطابات التعليمات المنشأة للتنزيل.",
        "successfullyRenewed": "تم التجديد بنجاح:",
        "lgs": "خطابات ضمان",
        "close": "إغلاق",
        "confirmAndRun": "تأكيد وتشغيل التجديد",
        "processing": "جاري المعالجة...",
        "cancel": "إلغاء"
    }
};

function updateFile(filePath, newStrings) {
    if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.modals) parsed.modals = {};
        Object.assign(parsed.modals, newStrings);
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
        console.log(`Updated ${filePath}`);
    } else {
        console.error(`File not found: ${filePath}`);
    }
}

updateFile(enPath, enStrings);
updateFile(arPath, arStrings);
