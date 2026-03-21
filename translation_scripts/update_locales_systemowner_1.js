const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const systemOwnerLocalesEn = {
    systemOwnerDashboard: {
        metrics: {
            activeCustomers: "Active Customers",
            activeUsers: "Active Users",
            expiringSoon: "Expiring Soon LGs",
            next30Days: "Next 30 days",
            totalValue: "Total LG Value"
        },
        recentActivity: {
            title: "Recent Activity",
            empty: "No recent activity found."
        },
        quickActions: {
            title: "Quick Actions",
            addCustomer: {
                title: "Add Customer",
                description: "Create new customer profile"
            },
            addSubscription: {
                title: "Add New Subscriptions",
                description: "Create new subscription plans"
            },
            addTemplate: {
                title: "Add New Template",
                description: "Create new template"
            },
            setGlobal: {
                title: "Set Global Configurations",
                description: "Define system-wide settings and lists"
            }
        },
        systemUsage: {
            title: "System Usage Overview",
            description: "A high-level summary of business traction, growth, and adoption.",
            empty: "No system usage data available.",
            totalCustomers: "Total Customers",
            totalUsers: "Total Users",
            totalLgs: "Total LGs Managed",
            instructionsIssued: "Total Instructions Issued",
            emailsSent: "Total Emails Sent"
        }
    },
    customerManagement: {
        title: "Customer Management",
        onboardButton: "Onboard New Customer",
        empty: "No customers found. Click \"Onboard New Customer\" to get started.",
        table: {
            customerName: "Customer Name",
            contactEmail: "Contact Email",
            plan: "Plan",
            entities: "Entities",
            users: "Users",
            actions: "Actions"
        },
        badges: {
            deleted: "Deleted"
        },
        tooltips: {
            viewDetails: "View Details",
            restore: "Restore Customer",
            delete: "Delete Customer"
        },
        confirmations: {
            delete: "Are you sure you want to soft-delete the customer \"{{name}}\"? This will also soft-delete all associated entities and users.",
            restore: "Are you sure you want to restore the customer \"{{name}}\"? This will also reactivate associated entities and users."
        },
        messages: {
            deletedSuccess: "Customer \"{{name}}\" soft-deleted successfully.",
            restoredSuccess: "Customer \"{{name}}\" restored successfully.",
            deleteFailed: "Failed to soft-delete customer \"{{name}}\".",
            restoreFailed: "Failed to restore customer \"{{name}}\"."
        }
    },
    customerDetails: {
        title: "Customer Details",
        back: "Back to Customers",
        notFound: "Customer not found.",
        subscriptionHealth: {
            title: "Subscription Health",
            currentPlan: "Current Plan:",
            periodDetails: "Period Details",
            startDate: "Start Date:",
            expiryDate: "Expiry Date:",
            customExpiry: "Custom Expiry Date (Optional)",
            setCustom: "Set Custom Expiry",
            renewStandard: "Renew Standard Duration",
            defaultExtend: "No date selected: will extend for {{months}} months.",
            processing: "Processing...",
            usageLimits: "Usage Limits",
            activeUsers: "Active Users",
            activeRecords: "Active LG Records"
        },
        basicInfo: {
            title: "Basic Information",
            editButton: "Edit Customer Details",
            hideEdit: "Hide Edit Form",
            editTitle: "Edit Customer",
            fields: {
                orgName: "Organization Name",
                address: "Address",
                email: "Contact Email",
                phone: "Contact Phone",
                plan: "Subscription Plan",
                maxUsers: "Max Users",
                maxRecords: "Max Records",
                multiEntity: "Multi-Entity",
                yes: "Yes",
                no: "No",
                adminEmail: "Admin Email",
                adminPassword: "Admin Password",
                mainEntity: "Main Entity"
            },
            note: "Note: This user will be created with the 'Corporate Admin' role.",
            entitiesRule: "Every customer must have at least one entity. More entities can be added if the selected subscription plan supports multi-entity.",
            addEntity: "Add Another Entity",
            oneEntityLimit: "Your selected plan supports only one entity. To add more, please upgrade your subscription plan.",
            onboarding: "Onboarding...",
            onboardTitle: "Onboard Customer",
            onboardPageTitle: "Onboard New Customer",
            customerInfo: "Customer Information",
            initialAdmin: "Initial Corporate Admin User",
            customerEntities: "Customer Entities"
        },
        messages: {
            renewConfirmStandard: "Are you sure you want to renew for {{months}} months?",
            renewConfirmCustom: "Are you sure you want to set the expiry date to {{date}}?",
            renewSuccess: "Subscription updated successfully!",
            renewFailed: "Renewal failed: {{error}}",
            updateSuccess: "Customer details updated successfully!",
            updateFailed: "Error updating customer: {{error}}"
        }
    }
};

const systemOwnerLocalesAr = {
    systemOwnerDashboard: {
        metrics: {
            activeCustomers: "العملاء النشطين",
            activeUsers: "المستخدمين النشطين",
            expiringSoon: "خطابات تنتهي قريبا",
            next30Days: "خلال 30 يوما",
            totalValue: "القيمة الإجمالية"
        },
        recentActivity: {
            title: "النشاط الأخير",
            empty: "لا يوجد نشاط أخير مسجل."
        },
        quickActions: {
            title: "إجراءات سريعة",
            addCustomer: {
                title: "إضافة عميل",
                description: "إنشاء ملف عميل جديد"
            },
            addSubscription: {
                title: "إضافة اشتراك جديد",
                description: "إنشاء خطة اشتراك جديدة"
            },
            addTemplate: {
                title: "إضافة قالب جديد",
                description: "إنشاء قالب جديد"
            },
            setGlobal: {
                title: "تعيين التكوينات العامة",
                description: "تحديد إعدادات النظام والقوائم"
            }
        },
        systemUsage: {
            title: "نظرة عامة على استخدام النظام",
            description: "ملخص عالي المستوى لجر الأعمال والنمو والاعتماد.",
            empty: "لا تتوفر بيانات استخدام النظام.",
            totalCustomers: "إجمالي العملاء",
            totalUsers: "إجمالي المستخدمين",
            totalLgs: "إجمالي الخطابات المدارة",
            instructionsIssued: "إجمالي التعليمات المصدرة",
            emailsSent: "إجمالي رسائل البريد المرسلة"
        }
    },
    customerManagement: {
        title: "إدارة العملاء",
        onboardButton: "تأهيل عميل جديد",
        empty: "لا يوجد عملاء. انقر على \"تأهيل عميل جديد\" للبدء.",
        table: {
            customerName: "اسم العميل",
            contactEmail: "بريد التواصل",
            plan: "الخطة",
            entities: "الكيانات",
            users: "المستخدمين",
            actions: "إجراءات"
        },
        badges: {
            deleted: "محذوف"
        },
        tooltips: {
            viewDetails: "عرض التفاصيل",
            restore: "استعادة العميل",
            delete: "حذف العميل"
        },
        confirmations: {
            delete: "هل أنت متأكد أنك تريد الحذف المبدئي للعميل \"{{name}}\"؟ سيتم أيضاً حذف الكيانات والمستخدمين المرتبطين به.",
            restore: "هل أنت متأكد أنك تريد استعادة العميل \"{{name}}\"؟ سيتم أيضاً تفعيل الكيانات والمستخدمين المرتبطين به."
        },
        messages: {
            deletedSuccess: "تم حذف العميل \"{{name}}\" بنجاح.",
            restoredSuccess: "تم استعادة العميل \"{{name}}\" بنجاح.",
            deleteFailed: "فشل حذف العميل \"{{name}}\".",
            restoreFailed: "فشل استعادة العميل \"{{name}}\"."
        }
    },
    customerDetails: {
        title: "تفاصيل العميل",
        back: "العودة إلى العملاء",
        notFound: "العميل غير موجود.",
        subscriptionHealth: {
            title: "صحة الاشتراك",
            currentPlan: "الخطة الحالية:",
            periodDetails: "تفاصيل الفترة",
            startDate: "تاريخ البدء:",
            expiryDate: "تاريخ الانتهاء:",
            customExpiry: "تاريخ الانتهاء المخصص (اختياري)",
            setCustom: "تعيين انتهاء مخصص",
            renewStandard: "تجديد المدة القياسية",
            defaultExtend: "لم يتم تحديد تاريخ: سيتم التمديد لمدة {{months}} شهور.",
            processing: "جارٍ المعالجة...",
            usageLimits: "حدود الاستخدام",
            activeUsers: "المستخدمين النشطين",
            activeRecords: "سجلات الخطابات النشطة"
        },
        basicInfo: {
            title: "المعلومات الأساسية",
            editButton: "تعديل تفاصيل العميل",
            hideEdit: "إخفاء نموذج التعديل",
            editTitle: "تعديل العميل",
            fields: {
                orgName: "اسم المؤسسة",
                address: "العنوان",
                email: "بريد التواصل",
                phone: "هاتف التواصل",
                plan: "خطة الاشتراك",
                maxUsers: "الحد الأقصى للمستخدمين",
                maxRecords: "الحد الأقصى للسجلات",
                multiEntity: "الأنشطة المتعددة",
                yes: "نعم",
                no: "لا",
                adminEmail: "بريد المشرف",
                adminPassword: "كلمة مرور المشرف",
                mainEntity: "النشاط الرئيسي"
            },
            note: "ملاحظة: سيتم إنشاء هذا المستخدم بصلاحية 'مشرف الشركة'.",
            entitiesRule: "يجب أن يكون لكل عميل نشاط واحد على الأقل. يمكن إضافة المزيد من الأنشطة إذا كانت خطة الاشتراك تدعم الأنشطة المتعددة.",
            addEntity: "إضافة نشاط آخر",
            oneEntityLimit: "خطتك المحددة تدعم نشاطاً واحداً فقط. لإضافة المزيد، يرجى ترقية خطة الاشتراك.",
            onboarding: "جارٍ التأهيل...",
            onboardTitle: "تأهيل العميل",
            onboardPageTitle: "تأهيل عميل جديد",
            customerInfo: "معلومات العميل",
            initialAdmin: "مشرف الشركة الأولي",
            customerEntities: "أنشطة العميل"
        },
        messages: {
            renewConfirmStandard: "هل أنت متأكد أنك تريد التجديد لمدة {{months}} شهور؟",
            renewConfirmCustom: "هل أنت متأكد أنك تريد تعيين تاريخ الانتهاء إلى {{date}}؟",
            renewSuccess: "تم تحديث الاشتراك بنجاح!",
            renewFailed: "فشل التجديد: {{error}}",
            updateSuccess: "تم تحديث تفاصيل العميل بنجاح!",
            updateFailed: "خطأ في تحديث العميل: {{error}}"
        }
    }
};

enData.pages.systemOwnerDashboard = systemOwnerLocalesEn.systemOwnerDashboard;
enData.pages.customerManagement = systemOwnerLocalesEn.customerManagement;
enData.pages.customerDetails = systemOwnerLocalesEn.customerDetails;

arData.pages.systemOwnerDashboard = systemOwnerLocalesAr.systemOwnerDashboard;
arData.pages.customerManagement = systemOwnerLocalesAr.customerManagement;
arData.pages.customerDetails = systemOwnerLocalesAr.customerDetails;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('SystemOwner loclaes updated successfully.');
