const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const batch2En = {
    trialRegistrations: {
        title: "Trial Registrations",
        tabs: {
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected"
        },
        messages: {
            loadError: "Failed to load registrations: ",
            approveSuccess: "Registration for {{name}} approved successfully!",
            rejectSuccess: "Registration rejected.",
            actionError: "Failed to {{action}} registration: ",
            noDoc: "No document path available.",
            docUrlFailed: "Failed to retrieve document URL.",
            docOpenError: "Error opening document: {{error}}",
            loading: "Loading registrations...",
            noRegistrations: "No {{status}} registrations found."
        },
        table: {
            orgName: "Organization Name",
            adminEmail: "Admin Email",
            entities: "Entities",
            status: "Status",
            registeredAt: "Registered At",
            actions: "Actions"
        },
        status: {
            pendingReview: "Pending Review",
            approved: "Approved",
            rejected: "Rejected"
        },
        tooltips: {
            viewDoc: "View Commercial Register",
            viewDetails: "View Details",
            approve: "Approve Registration",
            reject: "Reject Registration"
        },
        detailsModal: {
            title: "Registration Details",
            orgName: "Organization Name",
            adminEmail: "Admin Email",
            superAdminName: "Super Admin Name",
            contactPhone: "Contact Phone",
            orgAddress: "Organization Address",
            entitiesCount: "Entities Count",
            status: "Status",
            registeredAt: "Registered At",
            registrationIp: "Registration IP",
            na: "N/A",
            docTitle: "Commercial Register Document",
            viewDocSecurely: "View Document (Securely)",
            noDocUploaded: "No document uploaded.",
            close: "Close"
        }
    },
    commonListManagement: {
        title: "Global Custom Lists Configuration",
        tabs: {
            banks: "Banks Configuration",
            currencies: "Currencies Configuration",
            countries: "Countries Configuration",
            incoterms: "Incoterms Configuration"
        }
    },
    globalConfiguration: {
        tabs: {
            systemSettings: "System Defaults",
            smtp: "SMTP Settings",
            lists: "Custom Lists",
            templates: "Templates",
            plans: "Subscription Plans",
            notifications: "Notifications"
        },
        form: {
            title: "Global Configuration",
            saveChanges: "Save Configuration",
            saving: "Saving...",
            labels: {
                companyName: "Company Name",
                supportEmail: "Support Email",
                maxTrialDays: "Max Trial Days",
                smtpHost: "SMTP Host",
                smtpPort: "SMTP Port",
                smtpUser: "SMTP User",
                smtpPassword: "SMTP Password",
                senderEmail: "Sender Email",
                tls: "Use TLS",
                ssl: "Use SSL"
            },
            messages: {
                loadError: "Failed to load configuration: ",
                saveSuccess: "Configuration updated successfully!",
                saveError: "Failed to update configuration: "
            }
        }
    }
};

const batch2Ar = {
    trialRegistrations: {
        title: "التسجيلات التجريبية",
        tabs: {
            pending: "قيد الانتظار",
            approved: "معتمد",
            rejected: "مرفوض"
        },
        messages: {
            loadError: "فشل تحميل التسجيلات: ",
            approveSuccess: "تم اعتماد تسجيل {{name}} بنجاح!",
            rejectSuccess: "تم رفض التسجيل.",
            actionError: "فشل في {{action}} التسجيل: ",
            noDoc: "مسار المستند غير متوفر.",
            docUrlFailed: "فشل استرداد رابط المستند.",
            docOpenError: "خطأ في فتح المستند: {{error}}",
            loading: "جارٍ تحميل التسجيلات...",
            noRegistrations: "لا توجد تسجيلات {{status}}."
        },
        table: {
            orgName: "اسم المؤسسة",
            adminEmail: "بريد المشرف",
            entities: "الكيانات",
            status: "الحالة",
            registeredAt: "تاريخ التسجيل",
            actions: "إجراءات"
        },
        status: {
            pendingReview: "في انتظار المراجعة",
            approved: "معتمد",
            rejected: "مرفوض"
        },
        tooltips: {
            viewDoc: "عرض السجل التجاري",
            viewDetails: "عرض التفاصيل",
            approve: "اعتماد التسجيل",
            reject: "رفض التسجيل"
        },
        detailsModal: {
            title: "تفاصيل التسجيل",
            orgName: "اسم المؤسسة",
            adminEmail: "بريد المشرف",
            superAdminName: "اسم المشرف العام",
            contactPhone: "هاتف التواصل",
            orgAddress: "عنوان المؤسسة",
            entitiesCount: "عدد الكيانات",
            status: "الحالة",
            registeredAt: "تاريخ التسجيل",
            registrationIp: "عنوان الـ IP للتسجيل",
            na: "غير متوفر",
            docTitle: "مستند السجل التجاري",
            viewDocSecurely: "عرض المستند (بأمان)",
            noDocUploaded: "لم يتم رفع مستند.",
            close: "إغلاق"
        }
    },
    commonListManagement: {
        title: "إعداد القوائم المخصصة العامة",
        tabs: {
            banks: "إعدادات البنوك",
            currencies: "إعدادات العملات",
            countries: "إعدادات الدول",
            incoterms: "إعدادات شروط التسليم (Incoterms)"
        }
    },
    globalConfiguration: {
        tabs: {
            systemSettings: "الافتراضيات النظامية",
            smtp: "إعدادات مزود البريد (SMTP)",
            lists: "القوائم المخصصة",
            templates: "القوالب",
            plans: "خطط الاشتراك",
            notifications: "الإشعارات"
        },
        form: {
            title: "التكوين العام",
            saveChanges: "حفظ التكوين",
            saving: "جارٍ الحفظ...",
            labels: {
                companyName: "اسم الشركة",
                supportEmail: "بريد الدعم",
                maxTrialDays: "الحد الأقصى لأيام التجربة",
                smtpHost: "مضيف SMTP",
                smtpPort: "منفذ SMTP",
                smtpUser: "مستخدم SMTP",
                smtpPassword: "كلمة مرور SMTP",
                senderEmail: "بريد المرسل",
                tls: "استخدام TLS",
                ssl: "استخدام SSL"
            },
            messages: {
                loadError: "فشل تحميل التكوين: ",
                saveSuccess: "تم تحديث التكوين بنجاح!",
                saveError: "فشل تحديث التكوين: "
            }
        }
    }
};

enData.pages.trialRegistrations = batch2En.trialRegistrations;
enData.pages.commonListManagement = batch2En.commonListManagement;
enData.pages.globalConfiguration = batch2En.globalConfiguration;

arData.pages.trialRegistrations = batch2Ar.trialRegistrations;
arData.pages.commonListManagement = batch2Ar.commonListManagement;
arData.pages.globalConfiguration = batch2Ar.globalConfiguration;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('Batch 2 SystemOwner loclaes updated successfully.');
