const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const enPath = path.join(localesDir, 'en', 'translation.json');
const arPath = path.join(localesDir, 'ar', 'translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));

enData.pages.customerDetails.basicInfo.fields.entityName = "Entity Name";
enData.pages.customerDetails.basicInfo.fields.code = "Code (Optional)";
enData.pages.customerDetails.basicInfo.fields.commercialRegister = "Commercial Register Number";
enData.pages.customerDetails.basicInfo.fields.taxId = "Tax ID";
enData.pages.customerDetails.basicInfo.fields.contactPerson = "Contact Person (Optional)";
enData.pages.customerDetails.basicInfo.fields.contactEmailOpt = "Contact Email (Optional)";
enData.pages.customerDetails.basicInfo.fields.cancel = "Cancel";

arData.pages.customerDetails.basicInfo.fields.entityName = "اسم النشاط";
arData.pages.customerDetails.basicInfo.fields.code = "الرمز (اختياري)";
arData.pages.customerDetails.basicInfo.fields.commercialRegister = "رقم السجل التجاري";
arData.pages.customerDetails.basicInfo.fields.taxId = "الرقم الضريبي";
arData.pages.customerDetails.basicInfo.fields.contactPerson = "مسؤول التواصل (اختياري)";
arData.pages.customerDetails.basicInfo.fields.contactEmailOpt = "بريد التواصل (اختياري)";
arData.pages.customerDetails.basicInfo.fields.cancel = "إلغاء";

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');

console.log('Locales updated successfully 1.1.');
