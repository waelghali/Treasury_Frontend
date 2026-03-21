const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'src', 'locales');
const enPath = path.join(localesPath, 'en', 'translation.json');
const arPath = path.join(localesPath, 'ar', 'translation.json');

const enTranslations = {
    approvalMatrixModal: {
        title: "Governance & Approval Matrix",
        subtitle: "Define authorized signing paths and financial thresholds.",
        createStep: "Create Approval Step",
        triggerCondition: "1. Trigger Condition",
        triggerOptions: {
            always: "Always (Mandatory Gate)",
            amountRange: "Amount is Between...",
            amountOver: "Amount is Higher Than...",
            anyDepartment: "Any Department (Originating)",
            deptMatch: "For Specific Department",
            crossBorder: "Cross-Border / International"
        },
        minAmount: "Min (e.g. 500)",
        to: "to",
        maxAmount: "Max (e.g. 1000)",
        ccy: "Ccy",
        selectDepartment: "Select Department...",
        anyDeptNote: "This rule applies to all requests. It is typically paired with the 'Requester's Department Manager' approver.",
        crossBorderNote: "This rule will trigger for any request involving foreign banks or currencies.",
        whoApproves: "2. Who Approves?",
        approverOptions: {
            deptHead: "Requester's Department Manager",
            group: "Custom Approval Group",
            users: "Specific Individuals"
        },
        noGroupsFound: "No groups found. Create them in Organization & Teams.",
        noUsersFound: "No active users found.",
        members: "members",
        signaturesRequired: "3. Signatures Required",
        signaturesSub: "Approver(s) must sign this step.",
        insertSequence: "Insert into Sequence",
        liveSequence: "Live Approval Sequence",
        noRulesDefined: "No rules defined yet.",
        approversText: "Approvers:",
        reqSigs: "Req. Sigs:",
        saveMatrix: "Save Active Matrix"
    },
    approvalRequestDetailsModal: {
        gracePeriodTitle: "This action is disabled during your subscription's grace period.",
        title: "Review Approval Request:",
        status: {
            pending: "PENDING",
            approved: "APPROVED",
            rejected: "REJECTED"
        },
        reviewNote: "Review the details below. The data presented are based on the most recent information available, rather than the data at the time the request was submitted.",
        requestInfo: "Request Information:",
        actionType: "Action Type:",
        requestedBy: "Requested By:",
        requestedOn: "Requested On:",
        rejectionReason: "Rejection Reason:",
        approvedBy: "Approved By:",
        on: "on",
        autoStatusNote: "This request was automatically",
        lgRecordSnapshotTitle: "LG Record Details (Snapshot vs. Current)",
        loadingDetails: "Loading LG record details...",
        compareError: "Entity ID missing or mismatch.",
        changed: "Changed",
        na: "N/A",
        decreaseAmountTitle: "Decrease Amount Request Details:",
        amountToDecrease: "Amount to Decrease:",
        reason: "Reason:",
        additionalNotes: "Additional Notes:",
        noReasonProvided: "No reason provided",
        noNotesProvided: "No notes provided",
        viewSupportingDoc: "View Supporting Document",
        liquidationTitle: "LG Liquidation Request Details:",
        liquidationType: "Liquidation Type:",
        newAmountPartial: "New Amount (for partial):",
        releaseTitle: "LG Release Request Details:",
        amendmentTitle: "LG Amendment Request Details:",
        requestedAmendments: "Requested Amendments:",
        viewAmendmentLetter: "View Amendment Letter",
        activationTitle: "LG Activation Request Details:",
        paymentMethod: "Payment Method:",
        amount: "Amount:",
        paymentReference: "Payment Reference:",
        issuingBankId: "Issuing Bank ID:",
        paymentDate: "Payment Date:",
        updateOwnerTitle: "Update Internal Owner Details:",
        oldEmail: "Old Email:",
        newEmail: "New Email:",
        newPhone: "New Phone:",
        newManagerEmail: "New Manager Email:",
        changeScope: "Change Scope:",
        oldOwnerId: "Old Owner ID:",
        newOwnerId: "New Owner ID:",
        newOwnerEmailIfNew: "New Owner Email (if new):",
        affectedLgRecordId: "Affected LG Record ID:",
        affectedLgs: "Affected LGs:",
        genericActionDetails: "Generic Action Details:",
        noSpecificDetails: "No specific action details available for this type.",
        buttons: {
            withdraw: "Withdraw Request",
            withdrawing: "Withdrawing...",
            approve: "Approve",
            approving: "Approving...",
            reject: "Reject",
            rejecting: "Rejecting...",
            rejectionPlaceholder: "Reason for rejection (optional)",
            noActionsAvailable: "No actions available for this request (status is"
        }
    }
};

const arTranslations = {
    approvalMatrixModal: {
        title: "مصفوفة الحوكمة والموافقات",
        subtitle: "تحديد مسارات التوقيع المعتمدة والحدود المالية.",
        createStep: "إنشاء خطوة موافقة",
        triggerCondition: "1. شرط التفعيل",
        triggerOptions: {
            always: "دائما (بوابة إلزامية)",
            amountRange: "المبلغ يتراوح بين...",
            amountOver: "المبلغ أعلى من...",
            anyDepartment: "أي إدارة (المنشئة)",
            deptMatch: "لإدارة محددة",
            crossBorder: "عبر الحدود / دولي"
        },
        minAmount: "الحد الأدنى (مثال 500)",
        to: "إلى",
        maxAmount: "الحد الأقصى (مثال 1000)",
        ccy: "العملة",
        selectDepartment: "اختر الإدارة...",
        anyDeptNote: "ينطبق هذا القاعدة على جميع الطلبات. وعادة ما يقترن بموافق 'مدير إدارة مقدم الطلب'.",
        crossBorderNote: "سيتم تفعيل هذا القاعدة لأي طلب يتعلق ببنوك أجنبية أو عملات أجنبية.",
        whoApproves: "2. من يوافق؟",
        approverOptions: {
            deptHead: "مدير إدارة مقدم الطلب",
            group: "مجموعة موافقة مخصصة",
            users: "أفراد محددون"
        },
        noGroupsFound: "لم يتم العثور على مجموعات. قم بإنشائها في قسم المنظمة والفرق.",
        noUsersFound: "لم يتم العثور على مستخدمين نشطين.",
        members: "أعضاء",
        signaturesRequired: "3. التوقيعات المطلوبة",
        signaturesSub: "يجب على الموافق (الموافقين) توقيع هذه الخطوة.",
        insertSequence: "إدراج في التسلسل",
        liveSequence: "تسلسل الموافقة المباشر",
        noRulesDefined: "لم يتم تحديد قواعد بعد.",
        approversText: "الموافقون:",
        reqSigs: "التوقيعات المطلوبة:",
        saveMatrix: "حفظ المصفوفة النشطة"
    },
    approvalRequestDetailsModal: {
        gracePeriodTitle: "هذا الإجراء معطل خلال فترة السماح لاشتراكك.",
        title: "مراجعة طلب الموافقة:",
        status: {
            pending: "قيد الانتظار",
            approved: "تمت الموافقة",
            rejected: "مرفوض"
        },
        reviewNote: "راجع التفاصيل أدناه. تستند البيانات المقدمة إلى أحدث المعلومات المتاحة، بدلاً من البيانات في وقت تقديم الطلب.",
        requestInfo: "معلومات الطلب:",
        actionType: "نوع الإجراء:",
        requestedBy: "مقدم الطلب:",
        requestedOn: "تاريخ الطلب:",
        rejectionReason: "سبب الرفض:",
        approvedBy: "تمت الموافقة بواسطة:",
        on: "في",
        autoStatusNote: "تم أتمتة حالة هذا الطلب إلى",
        lgRecordSnapshotTitle: "تفاصيل سجل خطاب الضمان (اللقطة مقابل الحالي)",
        loadingDetails: "جاري تحميل تفاصيل سجل خطاب الضمان...",
        compareError: "معرف الكيان مفقود أو غير متطابق.",
        changed: "تم التغيير",
        na: "غير متوفر",
        decreaseAmountTitle: "تفاصيل طلب تخفيض المبلغ:",
        amountToDecrease: "المبلغ المراد تخفيضه:",
        reason: "السبب:",
        additionalNotes: "ملاحظات إضافية:",
        noReasonProvided: "لم يتم تقديم سبب",
        noNotesProvided: "لم يتم تقديم ملاحظات",
        viewSupportingDoc: "عرض المستند الداعم",
        liquidationTitle: "تفاصيل طلب تسييل خطاب الضمان:",
        liquidationType: "نوع التسييل:",
        newAmountPartial: "المبلغ الجديد (للجزئي):",
        releaseTitle: "تفاصيل طلب الإفراج عن خطاب الضمان:",
        amendmentTitle: "تفاصيل طلب تعديل خطاب الضمان:",
        requestedAmendments: "التعديلات المطلوبة:",
        viewAmendmentLetter: "عرض خطاب التعديل",
        activationTitle: "تفاصيل طلب تفعيل خطاب الضمان:",
        paymentMethod: "طريقة الدفع:",
        amount: "المبلغ:",
        paymentReference: "الرقم المرجعي للدفع:",
        issuingBankId: "معرف البنك المصدر:",
        paymentDate: "تاريخ الدفع:",
        updateOwnerTitle: "تحديث تفاصيل المالك الداخلي:",
        oldEmail: "البريد الإلكتروني القديم:",
        newEmail: "البريد الإلكتروني الجديد:",
        newPhone: "رقم الهاتف الجديد:",
        newManagerEmail: "البريد الإلكتروني للمدير الجديد:",
        changeScope: "نطاق التغيير:",
        oldOwnerId: "معرف المالك القديم:",
        newOwnerId: "معرف المالك الجديد:",
        newOwnerEmailIfNew: "البريد الإلكتروني للمالك الجديد (إذا كان جديداً):",
        affectedLgRecordId: "معرف سجل خطاب الضمان المتأثر:",
        affectedLgs: "خطابات الضمان المتأثرة:",
        genericActionDetails: "تفاصيل الإجراء العامة:",
        noSpecificDetails: "لا تتوفر تفاصيل إجراء محددة لهذا النوع.",
        buttons: {
            withdraw: "سحب الطلب",
            withdrawing: "جاري السحب...",
            approve: "موافقة",
            approving: "جاري الموافقة...",
            reject: "رفض",
            rejecting: "جاري الرفض...",
            rejectionPlaceholder: "سبب الرفض (اختياري)",
            noActionsAvailable: "لا توجد إجراءات متاحة لهذا الطلب (الحالة هي"
        }
    }
};

function updateFile(filePath, newKeys) {
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    content.modals = { ...(content.modals || {}), ...newKeys };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${filePath}`);
}

updateFile(enPath, enTranslations);
updateFile(arPath, arTranslations);
console.log('Modals locales updated successfully.');
