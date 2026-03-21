const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const enExtensions = {
    subscriptionPlans: {
        title: "Subscription Plans",
        formTitleNew: "Create New Subscription Plan",
        formTitleEdit: "Edit Subscription Plan",
        buttons: {
            addNew: "Add New Plan",
            cancel: "Cancel",
            create: "Create Plan",
            update: "Update Plan",
            creating: "Creating...",
            updating: "Updating..."
        },
        messages: {
            loadError: "Failed to load subscription plans. Please try again.",
            loadFormError: "Failed to load plan details for editing. Please try again.",
            confirmDelete: "Are you sure you want to soft-delete the plan \"{{name}}\"?",
            deleteSuccess: "Subscription plan \"{{name}}\" soft-deleted successfully.",
            deleteError: "Failed to soft-delete plan \"{{name}}\".",
            confirmRestore: "Are you sure you want to restore the plan \"{{name}}\"?",
            restoreSuccess: "Subscription plan \"{{name}}\" restored successfully.",
            restoreError: "Failed to restore plan \"{{name}}\".",
            createSuccess: "Subscription plan created successfully!",
            updateSuccess: "Subscription plan updated successfully!",
            saveError: "Error saving plan:",
            loading: "Loading plans...",
            loadingData: "Loading plan data...",
            noPlans: "No subscription plans found. Click \"Add New Plan\" to get started."
        },
        table: {
            planName: "Plan Name",
            duration: "Duration (Months)",
            monthlyPrice: "Monthly Price",
            annualPrice: "Annual Price",
            maxUsers: "Max Users",
            maxRecords: "Max Records",
            features: "Features",
            actions: "Actions",
            deleted: "Deleted",
            featuresList: {
                makerChecker: "M/C",
                multiEntity: "Multi-Entity",
                aiIntegration: "AI",
                imageStorage: "Images"
            },
            tooltips: {
                edit: "Edit Plan",
                delete: "Delete Plan",
                restore: "Restore Plan"
            }
        },
        form: {
            name: "Plan Name",
            description: "Description",
            duration: "Duration (Months)",
            monthlyPrice: "Monthly Price",
            annualPrice: "Annual Price",
            maxUsers: "Max Users",
            maxRecords: "Max Records",
            featuresTitle: "Features",
            featuresList: {
                makerChecker: "Maker/Checker Workflow",
                multiEntity: "Multi-Entity Support",
                aiIntegration: "AI Integration",
                imageStorage: "Image Storage"
            }
        }
    },
    systemNotifications: {
        title: "System Notifications",
        formTitleNew: "Create System Notification",
        formTitleEdit: "Edit System Notification",
        buttons: {
            create: "Create Notification",
            cancel: "Cancel",
            update: "Update Notification",
            closeReport: "Close Report"
        },
        messages: {
            loadError: "Failed to fetch system notifications.",
            loadDetailsError: "Failed to fetch notification details.",
            loadCustomersError: "Failed to load customer list.",
            uploadSuccess: "Image uploaded successfully",
            uploadMissingFields: "Upload response missing required fields",
            uploadFailed: "Failed to upload image",
            contentRequired: "Content is required",
            invalidUri: "Invalid image URI format. Please re-upload the image.",
            updateSuccess: "Notification updated successfully.",
            createSuccess: "Notification created successfully.",
            submitFailed: "Submission failed:",
            deleteSuccess: "Notification deleted successfully.",
            deleteError: "Failed to delete notification.",
            restoreSuccess: "Notification restored successfully.",
            restoreError: "Failed to restore notification.",
            toggleSuccess: "Notification successfully {{status}}.",
            toggleError: "Failed to {{status}} notification.",
            analyticsError: "Failed to load analytics data.",
            loading: "Loading notifications...",
            noNotifications: "No notifications found.",
            gatheringInsights: "Gathering insights...",
            noAnalytics: "No analytics data available.",
            noViews: "No views recorded yet."
        },
        status: {
            deleted: "Deleted",
            inactive: "Inactive",
            scheduled: "Scheduled",
            expired: "Expired",
            active: "Active",
            activated: "activated",
            deactivated: "deactivated",
            activate: "activate",
            deactivate: "deactivate"
        },
        table: {
            content: "Content",
            target: "Target",
            status: "Status",
            startDate: "Start Date",
            endDate: "End Date",
            actions: "Actions",
            tooltips: {
                activate: "Activate",
                deactivate: "Deactivate",
                edit: "Edit",
                delete: "Delete",
                restore: "Restore",
                analytics: "View Analytics"
            }
        },
        dialogs: {
            deleteTitle: "Are you sure you want to delete this notification?",
            deleteDesc: "This action will soft-delete the notification. It can be restored later.",
            restoreTitle: "Restore this notification?",
            restoreDesc: "This action will restore the deleted notification. It will be active again if it's within the date range.",
            deactivateTitle: "Deactivate Notification?",
            activateTitle: "Activate Notification?",
            deactivateDesc: "This will immediately hide the notification from all users, regardless of its date range.",
            activateDesc: "This will make the notification visible, provided it is within its start and end dates.",
            confirmDelete: "Delete",
            confirmRestore: "Restore",
            confirmDeactivate: "Deactivate",
            confirmActivate: "Activate"
        },
        analytics: {
            title: "Analytics Report",
            totalViews: "Total Views",
            uniqueViewers: "Unique Viewers",
            engagementTitle: "Viewer Engagement",
            user: "User",
            engagementViews: "Engagement (Views)",
            lastInteraction: "Last Interaction",
            userId: "User ID: {{id}}"
        },
        form: {
            notificationType: "Notification Type",
            types: {
                systemInfo: "System Announcement (Blue)",
                systemCritical: "System Critical / Alert (Red)",
                cbe: "CBE Announcement (Teal)",
                news: "Latest News (Green)",
                ad: "Advertisement (Purple)"
            },
            content: "Content",
            imageLabel: "Notification Image (Optional)",
            imageNote: "This image will appear as a banner thumbnail or a hero image in popups.",
            uploadImage: "Upload Image",
            uploading: "Uploading...",
            removeImage: "Remove image",
            link: "Link (Optional)",
            displayStyle: "Display Style",
            showAsModal: "Show as Modal Popup (Blocking)",
            actionLabel: "Action Button Label",
            actionLabelPlaceholder: "e.g., I Agree, Acknowledge",
            startDate: "Start Date",
            endDate: "End Date",
            animationType: "Animation Type",
            animations: {
                fade: "Fade In",
                slideLeft: "Slide In (Left)",
                scrollLeft: "Slide In (Right)",
                zoom: "Zoom In",
                bounce: "Bounce In"
            },
            displayFrequency: "Display Frequency",
            frequencies: {
                once: "Once",
                oncePerLogin: "Once Per Login",
                repeat: "Repeat Up to X Times"
            },
            maxDisplayCount: "Max Display Count",
            activeStatus: "Active Status",
            targetCustomers: "Target Customer(s) (Optional)",
            allCustomers: "All Customers",
            targetRoles: "Target Role(s) (Optional)",
            allRoles: "All Roles",
            targetUsers: "Target User(s) (Optional)",
            showingUsers: "Showing {{count}} users based on current filters.",
            allUsers: "All Users",
            targetText: {
                customers: "Customers ({{count}})",
                users: "Users ({{count}})",
                roles: "Roles ({{count}})",
                allUsers: "All Users"
            }
        }
    }
};

const arExtensions = {
    subscriptionPlans: {
        title: "خطط الاشتراك",
        formTitleNew: "إنشاء خطة اشتراك جديدة",
        formTitleEdit: "تعديل خطة الاشتراك",
        buttons: {
            addNew: "إضافة خطة جديدة",
            cancel: "إلغاء",
            create: "إنشاء خطة",
            update: "تحديث الخطة",
            creating: "جاري الإنشاء...",
            updating: "جاري التحديث..."
        },
        messages: {
            loadError: "فشل في تحميل خطط الاشتراك. يرجى المحاولة مرة أخرى.",
            loadFormError: "فشل في تحميل تفاصيل الخطة للتعديل. يرجى المحاولة مرة أخرى.",
            confirmDelete: "هل أنت متأكد أنك تريد الحذف الاسترجاعي للخطة \"{{name}}\"؟",
            deleteSuccess: "تم الحذف الاسترجاعي لخطة الاشتراك \"{{name}}\" بنجاح.",
            deleteError: "فشل الحذف الاسترجاعي للخطة \"{{name}}\".",
            confirmRestore: "هل أنت متأكد أنك تريد استعادة الخطة \"{{name}}\"؟",
            restoreSuccess: "تم استعادة خطة الاشتراك \"{{name}}\" بنجاح.",
            restoreError: "فشل استعادة الخطة \"{{name}}\".",
            createSuccess: "تم إنشاء خطة الاشتراك بنجاح!",
            updateSuccess: "تم تحديث خطة الاشتراك بنجاح!",
            saveError: "خطأ في حفظ الخطة:",
            loading: "جاري تحميل الخطط...",
            loadingData: "جاري تحميل بيانات الخطة...",
            noPlans: "لم يتم العثور على خطط اشتراك. انقر على \"إضافة خطة جديدة\" للبدء."
        },
        table: {
            planName: "اسم الخطة",
            duration: "المدة (شهور)",
            monthlyPrice: "السعر الشهري",
            annualPrice: "السعر السنوي",
            maxUsers: "الحد الأقصى للمستخدمين",
            maxRecords: "الحد الأقصى للسجلات",
            features: "المميزات",
            actions: "إجراءات",
            deleted: "محذوف",
            featuresList: {
                makerChecker: "صانع/مراجع",
                multiEntity: "كيانات متعددة",
                aiIntegration: "ذكاء اصطناعي",
                imageStorage: "تخزين الصور"
            },
            tooltips: {
                edit: "تعديل الخطة",
                delete: "حذف الخطة",
                restore: "استعادة الخطة"
            }
        },
        form: {
            name: "اسم الخطة",
            description: "الوصف",
            duration: "المدة (شهور)",
            monthlyPrice: "السعر الشهري",
            annualPrice: "السعر السنوي",
            maxUsers: "الحد الأقصى للمستخدمين",
            maxRecords: "الحد الأقصى للسجلات",
            featuresTitle: "المميزات",
            featuresList: {
                makerChecker: "سير عمل الصانع/المراجع",
                multiEntity: "دعم الكيانات المتعددة",
                aiIntegration: "تكامل الذكاء الاصطناعي",
                imageStorage: "تخزين الصور"
            }
        }
    },
    systemNotifications: {
        title: "إشعارات النظام",
        formTitleNew: "إنشاء إشعار نظام",
        formTitleEdit: "تعديل إشعار النظام",
        buttons: {
            create: "إنشاء إشعار",
            cancel: "إلغاء",
            update: "تحديث الإشعار",
            closeReport: "إغلاق التقرير"
        },
        messages: {
            loadError: "فشل في جلب إشعارات النظام.",
            loadDetailsError: "فشل في جلب تفاصيل الإشعار.",
            loadCustomersError: "فشل تحميل قائمة العملاء.",
            uploadSuccess: "تم رفع الصورة بنجاح",
            uploadMissingFields: "استجابة الرفع تفتقد حقول مطلوبة",
            uploadFailed: "فشل في رفع الصورة",
            contentRequired: "المحتوى مطلوب",
            invalidUri: "صيغة معرّف الصورة غير صالحة. يرجى إعادة رفع الصورة.",
            updateSuccess: "تم تحديث الإشعار بنجاح.",
            createSuccess: "تم إنشاء الإشعار بنجاح.",
            submitFailed: "فشل التقديم:",
            deleteSuccess: "تم حذف الإشعار بنجاح.",
            deleteError: "فشل في حذف الإشعار.",
            restoreSuccess: "تم استعادة الإشعار بنجاح.",
            restoreError: "فشل استعادة الإشعار.",
            toggleSuccess: "تمت {{status}} الإشعار بنجاح.",
            toggleError: "فشل في {{status}} الإشعار.",
            analyticsError: "فشل في تحميل بيانات التحليلات.",
            loading: "جاري تحميل الإشعارات...",
            noNotifications: "لم يتم العثور على إشعارات.",
            gatheringInsights: "جاري جمع الرؤى...",
            noAnalytics: "لا توجد بيانات تحليلات متاحة.",
            noViews: "لم يتم تسجيل أي مشاهدات بعد."
        },
        status: {
            deleted: "محذوف",
            inactive: "غير نشط",
            scheduled: "مجدول",
            expired: "منتهي",
            active: "نشط",
            activated: "تفعيل",
            deactivated: "إلغاء تفعيل",
            activate: "تفعيل",
            deactivate: "إلغاء تفعيل"
        },
        table: {
            content: "المحتوى",
            target: "الهدف",
            status: "الحالة",
            startDate: "تاريخ البدء",
            endDate: "تاريخ الانتهاء",
            actions: "إجراءات",
            tooltips: {
                activate: "تفعيل",
                deactivate: "إلغاء تفعيل",
                edit: "تعديل",
                delete: "حذف",
                restore: "استعادة",
                analytics: "عرض التحليلات"
            }
        },
        dialogs: {
            deleteTitle: "هل أنت متأكد أنك تريد حذف هذا الإشعار؟",
            deleteDesc: "سيؤدي هذا الإجراء إلى الحذف الاسترجاعي للإشعار. يمكن استعادته لاحقًا.",
            restoreTitle: "هل تريد استعادة هذا الإشعار؟",
            restoreDesc: "سيؤدي هذا الإجراء إلى استعادة الإشعار المحذوف. سيكون نشطًا مرة أخرى إذا كان ضمن النطاق الزمني.",
            deactivateTitle: "إلغاء تفعيل الإشعار؟",
            activateTitle: "تفعيل الإشعار؟",
            deactivateDesc: "سيؤدي هذا إلى إخفاء الإشعار فورًا عن جميع المستخدمين، بغض النظر عن النطاق الزمني.",
            activateDesc: "سيؤدي هذا إلى جعل الإشعار مرئيًا، بشرط أن يكون ضمن تاريخ البدء والانتهاء.",
            confirmDelete: "حذف",
            confirmRestore: "استعادة",
            confirmDeactivate: "إلغاء تفعيل",
            confirmActivate: "تفعيل"
        },
        analytics: {
            title: "تقرير التحليلات",
            totalViews: "إجمالي المشاهدات",
            uniqueViewers: "المشاهدين الفريدين",
            engagementTitle: "تفاعل المشاهدين",
            user: "المستخدم",
            engagementViews: "التفاعل (مشاهدات)",
            lastInteraction: "آخر تفاعل",
            userId: "معرف المستخدم: {{id}}"
        },
        form: {
            notificationType: "نوع الإشعار",
            types: {
                systemInfo: "إعلان نظام (أزرق)",
                systemCritical: "حرج / تنبيه نظام (أحمر)",
                cbe: "إعلان البنك المركزي (أزرق مخضر)",
                news: "آخر الأخبار (أخضر)",
                ad: "إعلان تجاري (أرجواني)"
            },
            content: "المحتوى",
            imageLabel: "صورة الإشعار (اختياري)",
            imageNote: "ستظهر هذه الصورة كشعار أو صورة رئيسية في النوافذ المنبثقة.",
            uploadImage: "رفع صورة",
            uploading: "جاري الرفع...",
            removeImage: "إزالة الصورة",
            link: "الرابط (اختياري)",
            displayStyle: "نمط العرض",
            showAsModal: "عرض كنافذة منبثقة (مانعة)",
            actionLabel: "تسمية زر الإجراء",
            actionLabelPlaceholder: "مثال: أوافق، أقر بذلك",
            startDate: "تاريخ البدء",
            endDate: "تاريخ الانتهاء",
            animationType: "نوع الحركة",
            animations: {
                fade: "تلاشي",
                slideLeft: "انزلاق لليسار",
                scrollLeft: "انزلاق لليمين",
                zoom: "تكبير",
                bounce: "ارتداد"
            },
            displayFrequency: "تكرار العرض",
            frequencies: {
                once: "مرة واحدة",
                oncePerLogin: "مرة لكل تسجيل دخول",
                repeat: "تكرار حتى X مرة"
            },
            maxDisplayCount: "الحد الأقصى لمرات العرض",
            activeStatus: "حالة النشاط",
            targetCustomers: "العملاء المستهدفين (اختياري)",
            allCustomers: "جميع العملاء",
            targetRoles: "الأدوار المستهدفة (اختياري)",
            allRoles: "جميع الأدوار",
            targetUsers: "المستخدمين المستهدفين (اختياري)",
            showingUsers: "يتم عرض {{count}} مستخدم بناءً على الفلاتر الحالية.",
            allUsers: "جميع المستخدمين",
            targetText: {
                customers: "عملاء ({{count}})",
                users: "مستخدمين ({{count}})",
                roles: "أدوار ({{count}})",
                allUsers: "جميع المستخدمين"
            }
        }
    }
};

enData.subscriptionPlans = enExtensions.subscriptionPlans;
arData.subscriptionPlans = arExtensions.subscriptionPlans;
enData.systemNotifications = enExtensions.systemNotifications;
arData.systemNotifications = arExtensions.systemNotifications;

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('subscriptionPlans & systemNotifications locales added.');
