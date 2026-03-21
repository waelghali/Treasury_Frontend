const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesPath, 'en', 'translation.json');
const arPath = path.join(localesPath, 'ar', 'translation.json');

const enTranslations = {
    dashboard: {
        title: "Reports Dashboard",
        noReports: "No reports available for your role.",
        selectReport: "Select a report to view detailed insights."
    },
    myLGDashboard: {
        title: "My LG Dashboard",
        description: "A personalized overview of your assigned LGs and pending tasks.",
        kpis: {
            myLGs: "My LGs",
            lgsNearExpiry: "LGs Near Expiry",
            undeliveredInstructions: "Undelivered Instructions"
        },
        recentActions: {
            title: "Recent Actions",
            noneFound: "No recent actions found."
        },
        messages: {
            loadSuccess: "Report data loaded successfully!",
            loadError: "Error fetching report: ",
            noData: "No report data available."
        }
    }
};

const arTranslations = {
    dashboard: {
        title: "لوحة تحكم التقارير",
        noReports: "لا توجد تقارير متاحة لدورك.",
        selectReport: "حدد تقريرا لعرض الرؤى التفصيلية."
    },
    myLGDashboard: {
        title: "لوحة تحكم خطابات الضمان الخاصة بي",
        description: "نظرة عامة مخصصة على خطابات الضمان المعينة لك والمهام المعلقة.",
        kpis: {
            myLGs: "خطابات الضمان الخاصة بي",
            lgsNearExpiry: "خطابات ضمان تقترب من الانتهاء",
            undeliveredInstructions: "تعليمات غير مسلمة"
        },
        recentActions: {
            title: "الإجراءات الأخيرة",
            noneFound: "لم يتم العثور على إجراءات حديثة."
        },
        messages: {
            loadSuccess: "تم تحميل بيانات التقرير بنجاح!",
            loadError: "خطأ في جلب التقرير: ",
            noData: "لا تتوفر بيانات تقرير."
        }
    }
};


function updateFile(filePath, newKeys) {
    let content = {};
    if (fs.existsSync(filePath)) {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    content.reports = newKeys; // Namespace the keys under 'reports'

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${filePath}`);
}

updateFile(enPath, enTranslations);
updateFile(arPath, arTranslations);
console.log('Reports locales updated successfully.');
