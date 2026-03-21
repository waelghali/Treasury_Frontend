const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '..', 'src', 'locales', 'en', 'translation.json');
const arPath = path.join(__dirname, '..', 'src', 'locales', 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

// Modifying Pages -> FacilitiesPage
enData.pages.facilities = {
    title: "Bank Facilities",
    subtitle: "Global credit lines and issuance governance",
    hideArchived: "Hide Archived",
    showArchived: "Show Archived",
    createFacility: "Create Facility",
    totalExposure: "Total Exposure",
    egpEq: "EGP-Eq",
    activeLines: "Active Lines",
    facilities: "Facilities",
    multiCurrency: "Multi-Currency",
    enabled: "Enabled",
    syncingData: "Syncing Facility Data...",
    noFacilities: "No facilities found. Initialize a new credit line to begin.",
    utilization: "Utilization",
    limit: "Limit",
    crossBorder: "Cross-Border",
    fxProtection: "FX Protection",
    nextReview: "Next Review",
    subLimitAllocation: "Sub-Limit Allocation",
    generalAllocation: "General Allocation",
    moreAllocations: "+{{count}} More Allocations",
    facilityInactive: "Facility Inactive / Archived"
};

arData.pages.facilities = {
    title: "التسهيلات البنكية",
    subtitle: "خطوط الائتمان العالمية وحوكمة الإصدار",
    hideArchived: "إخفاء المؤرشف",
    showArchived: "إظهار المؤرشف",
    createFacility: "إنشاء تسهيل",
    totalExposure: "إجمالي الانكشاف",
    egpEq: "معادل جنيه مصري",
    activeLines: "خطوط نشطة",
    facilities: "تسهيلات",
    multiCurrency: "متعدد العملات",
    enabled: "مفعل",
    syncingData: "جاري مزامنة بيانات التسهيلات...",
    noFacilities: "لم يتم العثور على تسهيلات. ابدأ بإنشاء خط ائتمان جديد.",
    utilization: "الاستخدام",
    limit: "الحد",
    crossBorder: "عابر للحدود",
    fxProtection: "حماية صرف العملات",
    nextReview: "المراجعة القادمة",
    subLimitAllocation: "تخصيص الحد الفرعي",
    generalAllocation: "تخصيص عام",
    moreAllocations: "+{{count}} تخصيصات إضافية",
    facilityInactive: "التسهيل غير نشط / مؤرشف"
};

// Modifying Pages -> IssuanceFormConfigPage
enData.pages.issuanceFormConfig = {
    title: "Request Form Configuration",
    subtitle: "Control which fields are visible or mandatory for your users when requesting an LG.",
    saveLayout: "Save Layout",
    strictGovernanceRule: "Strict Governance Rule:",
    ruleDescription: "Core financial fields (Amount, Currency, Maturity Date, Beneficiary, LG Type, Issuing Entity) are locked by the system and cannot be hidden. This ensures matrix re-evaluations and exposure calculations always function correctly.",
    visible: "Visible",
    mandatory: "Mandatory",
    customFieldsTitle: "Custom Fields (Max 2)",
    enable: "Enable",
    fieldLabel: "Field Label (e.g., Cost Center)",
    dataType: "Data Type",
    text: "Text",
    number: "Number",
    date: "Date"
};

arData.pages.issuanceFormConfig = {
    title: "تكوين نموذج الطلب",
    subtitle: "تحكم في الحقول المرئية أو الإلزامية للمستخدمين عند طلب خطاب ضمان.",
    saveLayout: "حفظ التخطيط",
    strictGovernanceRule: "قاعدة حوكمة صارمة:",
    ruleDescription: "الحقول المالية الأساسية (المبلغ، العملة، تاريخ الاستحقاق، المستفيد، نوع خطاب الضمان، كيان الإصدار) مقفلة من قبل النظام ولا يمكن إخفاؤها. هذا يضمن عمل تقييمات المصفوفة وحسابات الانكشاف بشكل صحيح دائماً.",
    visible: "مرئي",
    mandatory: "إلزامي",
    customFieldsTitle: "حقول مخصصة (بحد أقصى 2)",
    enable: "تفعيل",
    fieldLabel: "تسمية الحقل (مثل: مركز التكلفة)",
    dataType: "نوع البيانات",
    text: "نص",
    number: "رقم",
    date: "تاريخ"
};

// Modifying Pages -> IssuanceRequestsPage
enData.pages.issuanceRequests = {
    title: "Issuance Requests",
    testPathB: "Test Path B: Generate Invite",
    searchPlaceholder: "Search beneficiary or requestor...",
    allStatuses: "All Statuses",
    draft: "Draft",
    pendingApproval: "Pending Approval",
    readyForBank: "Ready for Bank",
    issued: "Issued",
    rejected: "Rejected",
    tableHeaders: {
        idRequestor: "ID / Requestor",
        beneficiary: "Beneficiary",
        amount: "Amount",
        status: "Status",
        actions: "Actions"
    },
    noRequests: "No requests found matching your filters.",
    generateModalTitle: "Generate Unique Invite Link",
    requestorEmail: "Requestor Email",
    linkHint: "Link will only work for this email domain.",
    assignDepartment: "Assign to Department",
    createLinkBtn: "Create Tokenized Link",
    secureInviteUrl: "Secure Invite URL",
    copyToTest: "Copy to Test",
    back: "Back",
    pasteHint: "Paste this into a new browser tab to test the direct form access."
};

arData.pages.issuanceRequests = {
    title: "طلبات الإصدار",
    testPathB: "اختبار مسار ب: إنشاء دعوة",
    searchPlaceholder: "البحث عن مستفيد أو طالب...",
    allStatuses: "جميع الحالات",
    draft: "مسودة",
    pendingApproval: "في انتظار الموافقة",
    readyForBank: "جاهز للبنك",
    issued: "مُصدر",
    rejected: "مرفوض",
    tableHeaders: {
        idRequestor: "الرقم / الطالب",
        beneficiary: "المستفيد",
        amount: "المبلغ",
        status: "الحالة",
        actions: "الإجراءات"
    },
    noRequests: "لم يتم العثور على طلبات تطابق عوامل التصفية الخاصة بك.",
    generateModalTitle: "إنشاء رابط دعوة فريد",
    requestorEmail: "البريد الإلكتروني للطالب",
    linkHint: "سيعمل الرابط فقط لنطاق البريد الإلكتروني هذا.",
    assignDepartment: "تخصيص للقسم",
    createLinkBtn: "إنشاء رابط مشفر",
    secureInviteUrl: "رابط دعوة آمن",
    copyToTest: "نسخ للاختبار",
    back: "رجوع",
    pasteHint: "الصق هذا في علامة تبويب متصفح جديدة لاختبار الوصول المباشر للنموذج."
};

// Modifying Pages -> LGCategoryForm
enData.pages.lgCategoryForm = {
    createUniversal: "Create New Universal Category",
    createLg: "Create New LG Category",
    editUniversal: "Edit Universal Category",
    editLg: "Edit LG Category",
    universalWarning: "You are editing a system-wide (universal) category. Changes will affect all customers.",
    categoryName: "Category Name",
    code: "Code (1-2 Alphanumeric Chars)",
    extraFieldName: "Extra Field Name (e.g., 'Project Code')",
    isExtraMandatory: "Is Extra Field Mandatory?",
    communicationList: "Communication List (Comma-separated emails)",
    communicationHint: "Emails in this list will receive notifications for LGs in this category.",
    appliesToAll: "Applies to All Entities for this Customer",
    selectEntities: "Select Specific Entities (Leave unchecked to apply to all)",
    noEntities: "No entities found for this customer. All categories will apply to all entities by default.",
    cancel: "Cancel",
    updating: "Updating...",
    updateLgCategory: "Update LG Category",
    creating: "Creating...",
    createLgCategory: "Create LG Category"
};

arData.pages.lgCategoryForm = {
    createUniversal: "إنشاء فئة عامة جديدة",
    createLg: "إنشاء فئة خطاب ضمان جديدة",
    editUniversal: "تعديل فئة عامة",
    editLg: "تعديل فئة خطاب ضمان",
    universalWarning: "أنت تقوم بتعديل فئة على مستوى النظام (عامة). ستؤثر التغييرات على جميع العملاء.",
    categoryName: "اسم الفئة",
    code: "الكود (1-2 أحرف أبجدية رقمية)",
    extraFieldName: "اسم الحقل الإضافي (مثل 'كود المشروع')",
    isExtraMandatory: "هل الحقل الإضافي إلزامي؟",
    communicationList: "قائمة الاتصال (رسائل بريد إلكتروني مفصولة بفواصل)",
    communicationHint: "رسائل البريد الإلكتروني في هذه القائمة ستتلقى إشعارات لخطابات الضمان في هذه الفئة.",
    appliesToAll: "ينطبق على جميع كيانات هذا العميل",
    selectEntities: "تحديد كيانات محددة (اتركه غير محدد للتطبيق على الجميع)",
    noEntities: "لم يتم العثور على كيانات لهذا العميل. ستنطبق جميع الفئات على جميع الكيانات افتراضيًا.",
    cancel: "إلغاء",
    updating: "جاري التحديث...",
    updateLgCategory: "تحديث فئة خطاب الضمان",
    creating: "جاري الإنشاء...",
    createLgCategory: "إنشاء فئة خطاب الضمان"
};


fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('Locales updated for Batch 2 pages.');
