// frontend/src/components/Showcase/showcaseCatalog.js
// Bilingual (EN + AR) Interactive Platform Tree & Process Walkthrough Catalog
// Every capability, governance rule, and SLA behavior below is verified 100% against `app/`.
//
// V2 Roadmap Extension Slots (Reserved — DO NOT block V1 rollout):
// 1. `infoPins?: [{ id, xPct, yPct, wPct, hPct, titleEn, titleAr, bodyEn, bodyAr }]`
//    -> Secondary clickable field explainers on any step (e.g., clicking "LG Category" explains use & benefit).
// 2. `detailGuideEn? / detailGuideAr?` + `step{N}_detail_{en|ar}.mp3`
//    -> Optional "Summary vs. Detailed" depth toggle in the side guide & voice reader.
// 3. `kbTopicKey?: string`
//    -> Context anchor for V2 public read-only AI Q&A endpoint grounded strictly on `app/services/system_knowledge_base.py`.

// Cross-Platform Governance, Security & Enterprise Foundation (Interactive Root Trunk)
export const PLATFORM_FOUNDATION_PILLARS = [
  {
    id: 'governance',
    iconKey: 'users',
    audioKey: 'foundation_governance',
    shortEn: 'Maker-Checker & Escalations',
    shortAr: 'المراجع والمعتمد والتصعيد',
    tagEn: 'Platform Governance · Risk-Smart Control',
    tagAr: 'حوكمة المنصة · رقابة ذكية وتصعيد آلي',
    headlineEn: 'Risk-Smart Maker-Checker Control, Proactive Reminders & Escalations',
    headlineAr: 'حوكمة ذكية للمراجع والمعتمد، تنبيهات استباقية، وتصعيد تلقائي للتأخير',
    pitchEn:
      'Grow enforces strict Maker-Checker matrices—blocking self-approval—wherever risk or bank liability is affected, such as LG releases, reductions, liquidations, new credit issuances, and pre-broadcast RFQs, while safe, company-favorable Custody LG extensions execute directly without delay. Automated multi-stage timers trigger reminders for expiries, unprinted letters, and overdue bank replies—escalating inaction to line managers and Corporate Admins before rights lapse.',
    pitchAr:
      'تطبق منصة Grow رقابة المراجع والمعتمد الصارمة مع منع الاعتماد الذاتي على الإجراءات المؤثرة على المخاطر أو الالتزامات—مثل الإفراج أو التخفيض أو التسييل أو اعتماد طلبات الإصدار وعروض الأسعار—بينما يُنفذ تمديد الضمانات الواردة مباشرة دون انتظار اعتماد لتفادي أي تأخير في حماية حق الشركة. وتُرسل المنصة تنبيهات استباقية للاستحقاقات والطباعة وردود البنوك مع تصعيد آلي للمديرين ومسؤولي النظام عند التأخر.',
    outcomesEn: [
      'Strict Maker-Checker on risk-bearing actions; direct execution for safe Custody extensions',
      'Proactive reminders for expiries, unprinted letters & overdue bank replies',
      'Automatic escalation to line managers, Checkers & Corporate Admins on delayed actions',
    ],
    outcomesAr: [
      'اعتماد مزدوج للإجراءات عالية المخاطر وتنفيذ مباشر لتمديد الضمانات الواردة دون تأخير',
      'تنبيهات استباقية لمواعيد الانتهاء وتأخر الطباعة أو التسليم أو ردود البنوك',
      'تصعيد آلي للمدير المباشر والمعتمدين ومسؤولي النظام عند تأخر الإجراءات',
    ],
  },
  {
    id: 'security',
    iconKey: 'lock',
    audioKey: 'foundation_security',
    shortEn: 'Per-Company AES-256 & Safe AI',
    shortAr: 'تشفير مستقل وذكاء محمي',
    tagEn: 'Platform Security · Bank-Grade Isolation',
    tagAr: 'أمن المعلومات · عزل وتشفير مصرفي',
    headlineEn: 'Per-Company AES-256-GCM Encryption, Isolated Vaults & Privacy-Shielded AI',
    headlineAr: 'تشفير AES-256 مستقل لكل شركة، عزل تام للمستندات، وذكاء اصطناعي يحمي السرية',
    pitchEn:
      'Sensitive financial rates and bank statement fields are sealed with per-company AES-256-GCM envelope keys, while guarantee scans are encrypted inside tenant-isolated cloud storage with optional dedicated buckets per enterprise customer. Document AI and rule learning operate under strict privacy guardrails and PII tokenization, with every user action recorded in immutable audit logs.',
    pitchAr:
      'تُحمى الأسعار المالية وبيانات كشوف الحسابات الحساسة بمفاتيح تشفير AES-256-GCM مستقلة لكل شركة، وتُحفظ صور الضمانات مشفّرة في خزائن سحابية معزولة مع إمكانية تخصيص حاوية تخزين مستقلة لكل عميل. ويعمل الذكاء الاصطناعي وتعلّم القواعد مع ترميز البيانات الحساسة وحماية السرية، وتوثيق كل حركة في سجل مراجعة غير قابل للتعديل.',
    outcomesEn: [
      'Per-company AES-256-GCM envelope keys & encrypted document storage',
      'Privacy-shielded AI OCR & zero-knowledge PII tokenization',
      'Immutable user, timestamp & cryptographic SHA-256 audit logs',
    ],
    outcomesAr: [
      'مفاتيح تشفير AES-256-GCM مستقلة لكل شركة وتخزين مشفّر للمستندات',
      'مسح ذكي محمي للمستندات مع ترميز وإخفاء بيانات الهوية الحساسة',
      'سجل مراجعة شامل وغير قابل للتعديل لكافة المستخدمين والحركات',
    ],
  },
  {
    id: 'verification',
    iconKey: 'qrcode',
    audioKey: 'foundation_verification',
    shortEn: 'QR + Code Verified Letters',
    shortAr: 'خطابات موثقة بـ QR وكود تحقق',
    tagEn: 'External Trust · Anti-Forgery Control',
    tagAr: 'موثوقية المراسلات البنكية · منع التزوير',
    headlineEn: 'Tamper-Evident Bank Instruction Letters with Instant QR + Security Code Verification',
    headlineAr: 'خطابات تعليمات بنكية مؤمّنة ضد التزوير بتحقق فوري عبر QR وكود تحقق',
    pitchEn:
      'Every outgoing bank letter—whether extending, reducing, releasing, or liquidating a guarantee—carries an HMAC-SHA256 signed QR code and split security code so receiving banks can verify authenticity on the public portal in seconds, while Grow tracks print/delivery escalations, bank receiving stamps, and AI bank-reply verification.',
    pitchAr:
      'يحمل كل خطاب صادر للبنك—سواء للتمديد أو التخفيض أو الإفراج أو التسييل—رمز استجابة سريعة QR موقّعاً رقمياً وكود تحقق يتيح للبنك التأكد الفوري من صحة الخطاب عبر بوابة التحقق، مع تتبع الطباعة وتصعيد التأخير وتوثيق ختم استلام البنك والمطابقة الذكية لردود البنوك.',
    outcomesEn: [
      'HMAC-SHA256 signed QR code + split security code authenticity verification',
      'Automated print/delivery reminders, escalations & bank receiving-stamp proof',
      'AI cross-check of bank replies against your original instruction',
    ],
    outcomesAr: [
      'تحقق فوري من صحة الخطاب برمز QR موقّع رقمياً وكود تحقق مؤمّن',
      'تذكيرات وتصعيد تلقائي للطباعة والتسليم وتوثيق ختم استلام البنك',
      'مطابقة ذكية لإشعارات رد البنك مع التعليمات الصادرة',
    ],
  },
  {
    id: 'enterprise',
    iconKey: 'layers',
    audioKey: 'foundation_enterprise',
    shortEn: 'Multi-Entity & Rapid Migration',
    shortAr: 'إدارة المجموعات والترحيل السريع',
    tagEn: 'Enterprise Scale · Day-One Readiness',
    tagAr: 'جاهزية المجموعات · تشغيل خلال ساعات',
    headlineEn: 'Multi-Subsidiary Visibility, Executive Dashboards & Bulk Portfolio Migration',
    headlineAr: 'رؤية موحدة لشركات المجموعة، تقارير تنفيذية، وترحيل ذكي للمحافظ القائمة',
    pitchEn:
      'Built for holding groups and multi-entity corporates, Grow unifies subsidiary entity permissions, departments, corporate projects, custom LG categories, and approval groups with group-wide exposure dashboards—paired with a smart Migration Hub that maps, validates, and imports legacy Excel trackers and PDF archives in hours instead of months.',
    pitchAr:
      'صُممت المنصة للشركات القابضة والمجموعات متعددة الكيانات لتوحيد صلاحيات الشركات التابعة والإدارات والمشاريع وتصنيفات الضمانات ومجموعات الاعتماد مع لوحات تعرضات مجمّعة، إلى جانب مركز ترحيل ذكي يفحص ويستورد سجلات الإكسيل وأرشيف الـ PDF التاريخي خلال ساعات بدلاً من شهور.',
    outcomesEn: [
      'Holding-group & subsidiary-entity access control and consolidated reporting',
      'Configurable departments, corporate projects, LG categories & approval groups',
      'Smart Bulk Migration Hub to validate and onboard existing portfolios rapidly',
    ],
    outcomesAr: [
      'صلاحيات مستقلة لكل شركة تابعة مع تقارير مجمّعة للإدارة العليا',
      'تخصيص مرن للإدارات والمشاريع وتصنيفات الضمانات ومجموعات الاعتماد',
      'مركز ترحيل ذكي لفحص واستيراد المحافظ القائمة والبدء السريع',
    ],
  },
];

export const PLATFORM_MODULES = [
  {
    id: 'custody',
    accent: 'blue',
    badgeEn: 'Module 01',
    badgeAr: 'الوحدة ٠١',
    titleEn: 'LG Custody',
    titleAr: 'حفظ خطابات الضمان الواردة',
    subtitleEn: 'Incoming supplier & contractor guarantees',
    subtitleAr: 'إدارة وحماية الضمانات المستلمة من الموردين والمقاولين',
    summaryEn: 'Protect every incoming supplier & contractor guarantee from expiry loss, hidden claim traps, and unauthorized release.',
    summaryAr: 'حماية شاملة لخطابات الضمان المستلمة من الموردين والمقاولين ضد فوات الاستحقاق وشروط المصادرة المقيدة.',
    cardBulletsEn: [
      'AI OCR extraction & upfront Smart Claim trap alerts',
      'Automated expiry reminders & management escalations',
      'Direct extensions, Maker-Checker releases & QR bank letters',
    ],
    cardBulletsAr: [
      'مسح ذكي فوري وكشف مبكر لشروط التسييل المقيدة',
      'تنبيهات استحقاق استباقية وتصعيد آلي للإدارة',
      'تمديد مباشر واعتماد مزدوج للإفراج وخطابات QR موثقة',
    ],
    storyDurationEn: '75s Executive Story',
    storyDurationAr: 'قصة تنفيذية · ٧٥ ثانية',
    executivePitch: {
      audioKey: 'pitch_custody',
      tagEn: 'Decision-Maker Brief · Contract & Financial Risk Protection',
      tagAr: 'ملخص لصانع القرار · حماية الحقوق التعاقدية والمالية',
      headlineEn: 'Never Lose Financial Security to a Missed Expiry or Hidden Claim Trap',
      headlineAr: 'حماية كاملة للغطاء المالي للشركة من ضياع مواعيد الانتهاء أو شروط المصادرة المقيدة',
      pitchEn:
        'For CFOs and Treasurers safeguarding millions in supplier and contractor guarantees, one missed expiry date in an Excel sheet means losing your financial protection overnight. Grow digitizes incoming guarantees with AI in seconds, exposes conditional claim wording upfront, executes safe protective extensions directly without approval bottlenecks while enforcing strict Maker-Checker control on every release, reduction, amendment, or liquidation—backed by automated reminders and escalations whenever an owner action, letter delivery, or bank reply is delayed.',
      pitchAr:
        'بالنسبة للمديرين الماليين ومديري الخزانة المسؤولين عن ضمانات بملايين الجنيهات، فإن فوات موعد انتهاء ضمان واحد في جداول الإكسيل يعني ضياع حق الشركة المالي فوراً. تقوم وحدة الحفظ برقمنة الضمانات الواردة بالذكاء الاصطناعي خلال ثوانٍ، وكشف شروط التسييل المقيدة مبكراً، وتنفيذ طلبات التمديد الحمائية مباشرة دون تعطيل، مع فرض رقابة المراجع والمعتمد الصارمة على كل إفراج أو تخفيض أو تعديل أو تسييل، وإرسال تنبيهات وتصعيد آلي عند تأخر مسؤول المشروع أو التسليم أو رد البنك.',
      outcomesEn: [
        'Zero missed expiries via automated owner reminders & line-manager / admin escalations',
        'AI OCR onboarding & upfront Smart Claim trap detection in seconds',
        'Direct fast-track extensions + strict Maker-Checker on releases, reductions & claims',
      ],
      outcomesAr: [
        'صفر ضمانات منسية بفضل التنبيهات المبكرة والتصعيد الآلي للمديرين ومسؤولي النظام',
        'رقمنة فورية بالمسح الذكي مع كشف مبكر لشروط التسييل المقيدة',
        'تنفيذ مباشر للتمديد دون تعطيل + اعتماد مزدوج صارم للإفراج والتخفيض والتسييل',
      ],
    },
    branches: [
      {
        id: 'custody-scan-record',
        code: '1.1',
        status: 'live',
        durationEn: '7 Interactive Steps · ~1 min',
        durationAr: '٧ خطوات تفاعلية · دقيقة واحدة',
        titleEn: 'Scan Vendor LGs & Expose Claim Traps in Seconds',
        titleAr: 'مسح ضمانات الموردين وكشف فخاخ المصادرة خلال ثوانٍ',
        descEn: 'Upload any scanned guarantee to extract every field automatically, expose conditional claim traps on Day 1, and bind manager escalations.',
        descAr: 'ارفع صورة الضمان لاستخراج كافة البيانات تلقائياً، وكشف شروط المصادرة المقيدة من اليوم الأول، وربط سلسلة التصعيد الإداري.',
      },
      {
        id: 'custody-action-center',
        code: '1.2',
        status: 'live',
        durationEn: '5 Interactive Steps · ~1.5 min',
        durationAr: '٥ خطوات تفاعلية · دقيقة ونصف',
        titleEn: 'Never Miss an Expiry Cutoff or Overdue Bank Reply',
        titleAr: 'رادار الاستحقاق والتمديد الفوري واستعجال البنوك',
        descEn: 'Replace fragile spreadsheets with 4 live action queues, cutoff-protected bulk renewals, zero-delay extensions, and 1-click bank chasers.',
        descAr: 'استبدل جداول الإكسيل بأربع قوائم مهام حية، وتجديد جماعي يحمي المهل الحرجة، وتمديد فوري، وخطابات استعجال البنوك بضغطة واحدة.',
      },
      {
        id: 'custody-lifecycle-letter',
        code: '1.3',
        status: 'live',
        durationEn: '6 Interactive Steps · ~2 min',
        durationAr: '٦ خطوات تفاعلية · دقيقتان',
        titleEn: 'Maker-Checker Releases & Anti-Forgery QR Bank Letters',
        titleAr: 'حوكمة الإفراج والتخفيض وخطابات البنوك المؤمّنة بـ QR',
        descEn: 'Require dual sign-off before releasing or reducing a guarantee, and seal every bank letter with instant QR + Security Code verification.',
        descAr: 'فرض اعتماد المراجع والمعتمد قبل الإفراج أو التخفيض أو التسييل، وتأمين خطابات البنوك بتحقق فوري عبر رمز QR وكود الأمان.',
      },
      {
        id: 'custody-delivery-reply',
        code: '1.4',
        status: 'live',
        durationEn: '6 Interactive Steps · ~2 min',
        durationAr: '٦ خطوات تفاعلية · دقيقتان',
        titleEn: 'Verify Bank Receiving Stamps & Audit Bank Replies',
        titleAr: 'إثبات ختم استلام البنك ومطابقة إشعار التعديل الرسمي',
        descEn: 'Close the risk gap after printing: verify physical bank stamps, catch date mismatches in 1 click, and audit bank replies side by side.',
        descAr: 'سد الفجوة الرقابية بعد الطباعة: فحص ختم استلام البنك، ومطابقة التواريخ بضغطة واحدة، ومراجعة إشعارات البنوك في شاشة مزدوجة.',
      },
    ],
  },
  {
    id: 'issuance',
    accent: 'purple',
    badgeEn: 'Module 02',
    badgeAr: 'الوحدة ٠٢',
    titleEn: 'LG Issuance',
    titleAr: 'إصدار خطابات الضمان الصادرة',
    subtitleEn: 'Outgoing corporate guarantees & bank credit facilities',
    subtitleAr: 'إصدار ضمانات الشركة لصالح العملاء وإدارة التسهيلات البنكية',
    summaryEn: 'Digitize and unify outgoing LG requests with customizable forms, flexible approval matrices, 0–100 bank scoring, and LG position matching.',
    summaryAr: 'رقمنة وتوحيد طلبات الضمانات الصادرة بنماذج ومصفوفة اعتماد قابلة للتخصيص، ومفاضلة البنوك، ومطابقة مراكز الضمانات.',
    cardBulletsEn: [
      'Unified intake with customizable form & approval matrix',
      '0–100 bank facility scoring & AI contract/wording checks',
      'Auto-filled bank PDF forms & Bank LG Position matching',
    ],
    cardBulletsAr: [
      'توحيد الطلبات بنموذج ومصفوفة اعتماد قابلة للتخصيص',
      'مفاضلة التسهيلات (٠–١٠٠) وفحص ذكي للعقود والصياغة',
      'تعبئة آلية لنماذج البنوك ومطابقة مراكز الضمانات البنكية',
    ],
    storyDurationEn: '75s Executive Story',
    storyDurationAr: 'قصة تنفيذية · ٧٥ ثانية',
    executivePitch: {
      audioKey: 'pitch_issuance',
      tagEn: 'Decision-Maker Brief · Unified LG Intake, Governance & Bank Execution',
      tagAr: 'ملخص لصانع القرار · توحيد طلبات الإصدار وحوكمة التسهيلات البنكية',
      headlineEn: 'Unify Outgoing LG Requests, Custom Approvals & Smart Bank Facility Scoring',
      headlineAr: 'توحيد طلبات إصدار الضمانات ومصفوفة الاعتماد والمفاضلة الذكية بين التسهيلات',
      pitchEn:
        'Handling outgoing guarantee requests over email causes missing documents, duplicate submissions, and inconsistent bank selection. Grow digitizes and unifies all internal LG issuance requests in one central portal with a fully customizable request form and sequential approval matrix, scores eligible bank facilities from 0 to 100 across commission and cash margin terms, auto-fills official bank PDF forms, and reconciles Bank LG Position reports against your register.',
      pitchAr:
        'إدارة طلبات إصدار خطابات الضمان عبر البريد الإلكتروني تؤدي لنقص المستندات وتكرار الطلبات وتباين اختيار البنوك. تُرقمن هذه الوحدة كافة طلبات الإدارات وتوحّدها في مكان واحد بنموذج طلب ومصفوفة اعتماد قابلة للتخصيص الكامل، وتفاضل لحظياً بين التسهيلات البنكية (٠–١٠٠) حسب شروط العمولة والغطاء، وتملأ نماذج البنوك الرسمية تلقائياً مع مطابقة تقارير مراكز الضمانات البنكية.',
      outcomesEn: [
        'Centralized intake with customizable request form & multi-step approval matrix',
        '0–100 bank facility scoring + zero-typing official bank PDF form generation',
        'Automated Bank LG Position reconciliation to catch variances & open expired LGs',
      ],
      outcomesAr: [
        'توحيد كافة طلبات الإصدار بنموذج طلب ومصفوفة موافقات قابلة للتخصيص الكامل',
        'مفاضلة التسهيلات (٠–١٠٠) مع تعبئة آلية لاستمارات البنوك الرسمية',
        'مطابقة آلية لتقارير مراكز الضمانات لدى البنوك لكشف أي فروق أو ضمانات مفتوحة',
      ],
    },
    branches: [
      {
        id: 'issuance-intake',
        code: '2.1',
        status: 'live',
        durationEn: '6 Steps · ~2 min',
        durationAr: '٦ خطوات · دقيقتان',
        titleEn: 'Department Portal, Wording Trap Check & Approvals',
        titleAr: 'بوابة الإدارات وكشف مخاطر الصياغة والموافقة الائتمانية',
        descEn: 'Unify department LG requests without email chaos, verify contracts with AI, block duplicate commissions, and catch risky client wording before you sign.',
        descAr: 'توحيد طلبات الإدارات دون فوضى البريد، ومطابقة العقود ذكياً، ومنع تكرار العمولات، وكشف شروط العملاء الخطرة قبل التوقيع.',
      },
      {
        id: 'issuance-facility-scoring',
        code: '2.2',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Save Cash Margin with 0–100 Bank Facility Scoring',
        titleAr: 'توفير الغطاء النقدي والمفاضلة الذكية بين البنوك (٠–١٠٠)',
        descEn: 'Rank banks automatically across commission, 0% cash margin, real historical turnaround speed, and scarce FX line protection — then reserve headroom instantly.',
        descAr: 'ترتيب البنوك تلقائياً حسب أقل عمولة، وإعفاء الغطاء النقدي، وسرعة البنك الفعلية تاريخياً، وحماية الخطوط النادرة.',
      },
      {
        id: 'issuance-bank-form',
        code: '2.3',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Auto-Filled Official Bank PDF & Issued LG Audit',
        titleAr: 'تعبئة استمارة البنك الرسمية وفحص أصل الضمان الصادر',
        descEn: 'Populate official Arabic & English bank PDF forms in 1 click, track branch delivery, and audit the bank’s issued guarantee before client handoff.',
        descAr: 'تعبئة استمارات البنوك الرسمية بالعربية والإنجليزية بضغطة واحدة، وفحص أصل الضمان الصادر قبل تسليمه للعميل.',
      },
      {
        id: 'issuance-position-recon',
        code: '2.4',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Catch Expired LGs Still Charging Bank Fees',
        titleAr: 'كشف الضمانات المنتهية التي ما زالت تحجز السقف وتخصم عمولات',
        descEn: 'Upload bank LG position reports to uncover expired guarantees the bank left open — stopping silent commission bleed and reclaiming trapped credit limits.',
        descAr: 'مطابقة تقارير مراكز البنوك لكشف الضمانات المنتهية المفتوحة لدى البنك لإيقاف نزيف العمولات وتحرير السقف الائتماني.',
      },
    ],
  },
  {
    id: 'quotations',
    accent: 'emerald',
    badgeEn: 'Module 03',
    badgeAr: 'الوحدة ٠٣',
    titleEn: 'FX & T-Bill Quotations',
    titleAr: 'عروض أسعار العملات وأذون الخزانة',
    subtitleEn: 'Sealed-bid multi-bank FX Spot & T-Bill competition',
    subtitleAr: 'منافسة مصرفية مشفرة ومغلقة للعملات الفورية وأذون الخزانة',
    summaryEn: 'Replace phone FX & T-Bill shopping with flexible CBE-aligned scenarios, sealed multi-bank bidding, and All-In net ranking.',
    summaryAr: 'استبدال التفاوض الهاتفي بمنافسة مصرفية مرنة تتوافق مع متطلبات البنك المركزي وترسية بالصافي الشامل.',
    cardBulletsEn: [
      'Flexible Execution vs. Indicative & CBE-aligned scenarios',
      'Zero-password OTP dealer desk & AES-256 sealed bidding',
      'All-In net award, live market + CBE check & HMAC receipts',
    ],
    cardBulletsAr: [
      'مرونة كاملة للسيناريوهات المتوافقة مع متطلبات البنك المركزي',
      'غرفة تداول بدون كلمة مرور وتشفير تام للعروض حتى الإغلاق',
      'ترسية بالصافي ومقارنة بأسعار السوق والمركزي وشهادة تدقيق',
    ],
    storyDurationEn: '75s Executive Story',
    storyDurationAr: 'قصة تنفيذية · ٧٥ ثانية',
    executivePitch: {
      audioKey: 'pitch_quotations',
      tagEn: 'Decision-Maker Brief · Best Execution & Yield Governance',
      tagAr: 'ملخص لصانع القرار · حوكمة أفضل تنفيذ وتعظيم العائد',
      headlineEn: 'Capture Every Basis Point with Auditable Multi-Bank Competition',
      headlineAr: 'تحقيق أفضل سعر تنفيذ صافي بمنافسة مصرفية فورية وقابلة للمراجعة',
      pitchEn:
        'Shopping FX Spot and Sovereign T-Bill rates over phone calls or chat leaves basis points on the table and gives boards and auditors zero proof of best execution. Grow adapts to every Central Bank of Egypt scenario—supporting Execution versus Indicative benchmark roles, selective document visibility, and alternative value dates—dispatches multi-pair FX Spot and T-Bill RFQs simultaneously via zero-password OTP dealer links, keeps every quote sealed with AES-256 encryption until window close, ranks bids by true All-In net cost benchmarked against both live market rates and Central Bank fixings, lets treasurers cherry-pick winning banks per currency leg, and seals Best Execution Audit Certificates plus bank-scoped HMAC-SHA256 Deal Receipts.',
      pitchAr:
        'التفاوض الهاتفي على أسعار العملات الفورية وأذون الخزانة يفقد الشركة نقاطاً سعرية مؤثرة ولا يترك أي إثبات رقابي على عدالة التنفيذ. تغطي هذه الوحدة كافة السيناريوهات المتوافقة مع متطلبات البنك المركزي المصري، وترسل طلبات العملات متعددة الأزواج وأذون الخزانة لكافة البنوك في لحظة واحدة عبر روابط مشفّرة بدون كلمة مرور، وتحفظ العروض مشفرة بالكامل حتى إغلاق النافذة، ثم ترتبها بالصافي الشامل مع مقارنتها بأسعار السوق اللحظية ومؤشر البنك المركزي، وتتيح ترسية كل عملة لأفضل بنك مع إصدار شهادة تدقيق وإيصالات صفقة معزولة وموقعة رقمياً.',
      outcomesEn: [
        'All-In net-of-tariff & TVM ranking checked against live market & CBE rates',
        'Zero-password dealer desk, fat-finger guardrails & AES-256 sealed bidding',
        'Multi-leg cherry-pick award, Best Execution Audit Pack & scoped HMAC-SHA256 receipts',
      ],
      outcomesAr: [
        'ترتيب بالصافي الشامل ومقارنة بأسعار السوق اللحظية ومؤشر البنك المركزي',
        'غرفة تداول بدون كلمة مرور بضوابط منع أخطاء الإدخال وتشفير تام حتى الإغلاق',
        'ترسية مجزأة لأفضل بنك لكل عملة مع شهادة تدقيق وإيصالات تنفيذ رقمية معزولة',
      ],
    },
    branches: [
      {
        id: 'quotations-rfq-broadcast',
        code: '3.1',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Launch Simultaneous Multi-Bank FX & T-Bill RFQs',
        titleAr: 'طرح متزامن لسلة العملات الفورية وأذون الخزانة للبنوك',
        descEn: 'Send multi-currency FX Spot baskets or Sovereign T-Bill tenders to all relationship banks at the exact same second with automatic fee & settlement adjustments.',
        descAr: 'إرسال طلبات تسعير العملات وأذون الخزانة لكافة البنوك في لحظة واحدة مع احتساب العمولات وفروق تواريخ التسوية تلقائياً.',
      },
      {
        id: 'quotations-dealer-desk',
        code: '3.2',
        status: 'live',
        durationEn: '4 Steps · ~1.5 min',
        durationAr: '٤ خطوات · دقيقة ونصف',
        titleEn: 'Zero-Password Bank Dealer Link & Rate Typo Shield',
        titleAr: 'رابط تسعير فوري لمتداول البنك بدون كلمة مرور وحماية الأخطاء',
        descEn: 'Banks quote on Day 1 via OTP email links with zero IT setup, real-time protection against decimal/swap typos, and complete bid secrecy until 00:00.',
        descAr: 'مشاركة البنوك من اليوم الأول برابط OTP بدون إعداد تقني، مع حماية فورية من أخطاء كتابة السعر وسرية تامة للعروض.',
      },
      {
        id: 'quotations-net-award',
        code: '3.3',
        status: 'live',
        durationEn: '6 Steps · ~2 min',
        durationAr: '٦ خطوات · دقيقتان',
        titleEn: 'Cherry-Pick Winning Banks & Seal Best-Execution Proof',
        titleAr: 'اختيار أفضل بنك لكل عملة وإصدار شهادة أفضل تنفيذ للمراجعين',
        descEn: 'Unseal quotes ranked by true net cost, award each currency leg to its cheapest bank, verify against Central Bank & live rates, and print your audit certificate.',
        descAr: 'فك تشفير العروض مرتبة بالصافي، وترسية كل عملة لأفضل بنك، ومقارنتها بالسوق والمركزي وإصدار شهادة التدقيق.',
      },
    ],
  },
  {
    id: 'reconciliation',
    accent: 'amber',
    badgeEn: 'Module 04',
    badgeAr: 'الوحدة ٠٤',
    titleEn: 'Bank Auto-Reconciliation',
    titleAr: 'المطابقة البنكية الذكية',
    subtitleEn: 'Zero-config statements, sweeps, AI rules & ERP GL',
    subtitleAr: 'استيراد الكشوف والتحويلات البينية والتعلم الذاتي وقيود ERP',
    summaryEn: 'Turn days of manual multi-bank statement matching into minutes of AI classification, sweep pairing, and balanced ERP journals.',
    summaryAr: 'تحويل أيام مطابقة كشوف البنوك اليدوية إلى دقائق من التصنيف الذكي وربط التحويلات وتصدير قيود ERP.',
    cardBulletsEn: [
      'Zero-setup Arabic/English import & balance continuity check',
      'Auto-paired cross-bank sweeps, wire fees & reversals',
      'Continuously self-learning rules & locked ERP GL export',
    ],
    cardBulletsAr: [
      'استيراد فوري للكشوف العربية والإنجليزية وفحص تسلسل الأرصدة',
      'ربط آلي للتحويلات البينية وفروق العمولات والمرتدات',
      'نظام يتعلم ويتطور باستمرار مع تصدير مقفول لقيود الـ ERP',
    ],
    storyDurationEn: '75s Executive Story',
    storyDurationAr: 'قصة تنفيذية · ٧٥ ثانية',
    executivePitch: {
      audioKey: 'pitch_reconciliation',
      tagEn: 'Decision-Maker Brief · Faster Month-End Close & Cash Control',
      tagAr: 'ملخص لصانع القرار · تسريع الإقفال المالي وضبط النقدية',
      headlineEn: 'Turn Days of Manual Statement Matching Into Minutes of Exception Governance',
      headlineAr: 'تحويل أيام المطابقة اليدوية المرهقة إلى دقائق من الرقابة الدقيقة على الاستثناءات',
      pitchEn:
        'Finance teams lose days every month matching multi-bank statements, chasing wire fee differences across inter-account transfers, and posting bank charges manually. Grow ingests Arabic and English bank statements with zero setup, auto-classifies bank fees, taxes, payroll, interest, and bounced cheques, pairs liquidity sweeps and error reversals automatically, learns recurring counterparty rules from user confirmations under PII tokenization, flags ambiguous memos cleanly for human review, and exports accounting entries through customizable ERP and General Ledger profiles.',
      pitchAr:
        'تستنزف الفرق المالية أياماً كل شهر في مطابقة كشوف الحسابات المتعددة وتتبع فروق عمولات التحويلات البينية وتسجيل المصروفات يدوياً. تستورد هذه الوحدة كشوف الحسابات العربية والإنجليزية فوراً دون إعدادات مسبقة، وتصنف العمولات والضرائب والرواتب والفوائد والشيكات المرتدة، وتربط التحويلات البينية والقيود العكسية تلقائياً، وتتعلم القواعد المتكررة من تأكيدات المستخدم مع حماية سرية البيانات، وتفرز المعلقات الغامضة للمراجعة البشرية قبل تصدير القيود بقوالب مخصصة لنظام الـ ERP.',
      outcomesEn: [
        'Zero-setup classification of bank charges, taxes, payroll & bounced collections',
        'Automatic pairing of inter-account sweeps (even with wire fee deductions) & reversals',
        'Self-learning rule induction, clean exception review & customizable ERP/GL exports',
      ],
      outcomesAr: [
        'تصنيف فوري للمصروفات البنكية والضرائب والرواتب والمرتدات دون إعدادات مسبقة',
        'ربط ذكي للتحويلات البينية حتى مع خصم عمولات التحويل البنكي والقيود العكسية',
        'تعلّم ذاتي للقواعد المتكررة وفرز واضح للاستثناءات وتصدير مخصص لقيود الـ ERP',
      ],
    },
    branches: [
      {
        id: 'recon-zero-config',
        code: '4.1',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Zero-Setup Import, Balance Check & Instant Fee Rules',
        titleAr: 'استيراد الكشوف وفحص سلامة الأرصدة وتصنيف العمولات فوراً',
        descEn: 'Import any Arabic or English statement, catch missing rows via opening-to-closing math, and classify bank fees, taxes & payroll in 1 click.',
        descAr: 'رفع كشوف البنوك العربية والإنجليزية، وكشف أي سطور ناقصة رياضياً، وتصنيف العمولات والضرائب والرواتب بضغطة واحدة.',
      },
      {
        id: 'recon-sweeps-reversals',
        code: '4.2',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Cross-Bank Sweeps, Returned Wires & Split ERP Match',
        titleAr: 'ربط التحويلات البينية والمرتدات والمطابقة مع فواتير ERP',
        descEn: 'Pair inter-bank transfers even when wire fees deduct along the way, clear returned wires to 0.00, and match open ERP invoices side by side.',
        descAr: 'ربط التحويلات بين البنوك حتى مع خصم عمولات التحويل، وتصفية المرتدات، ومطابقة فواتير العملاء والموردين جنباً إلى جنب.',
      },
      {
        id: 'recon-rules-privacy',
        code: '4.3',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Teach Rules in 1 Click — With 100% Company Data Privacy',
        titleAr: 'تعلّم القواعد بضغطة واحدة مع سرية تامة لبيانات الشركة',
        descEn: 'Classify a new vendor once and Grow remembers forever — while keeping every name, IBAN, and amount strictly inside your encrypted company vault.',
        descAr: 'صنّف المورد الجديد مرة واحدة ليتذكره النظام دائماً، مع بقاء كافة الأسماء والحسابات والمبالغ مشفرة داخل خزينة شركتك.',
      },
      {
        id: 'recon-erp-export',
        code: '4.4',
        status: 'live',
        durationEn: '5 Steps · ~1.5 min',
        durationAr: '٥ خطوات · دقيقة ونصف',
        titleEn: 'Balanced Double-Entry Journals for SAP, Oracle & Excel',
        titleAr: 'تصدير قيود يومية مزدوجة متوازنة لأنظمة SAP وOracle',
        descEn: 'Expand bank lines into balanced Cash + Customer/Vendor + Bank Fee journal entries and lock exported batches so nothing is ever posted twice.',
        descAr: 'تحويل حركات الكشف إلى قيود يومية متوازنة شاملة فروق العمولات مع قفل الدفعات لمنع تكرار الترحيل للأستاذ العام.',
      },
    ],
  },
];

// 4-Chapter Hands-Free Visual Executive Stories (Platform Overview + 4 Module Executive Stories)
// Audio files live under `/demo/audio/stories/<storyId>/ch{1..4}_{en|ar}.mp3`
export const VISUAL_STORIES = {
  platform_intro: {
    id: 'platform_intro',
    kind: 'platform',
    accent: 'blue',
    durationBadgeEn: '65s Platform Overview',
    durationBadgeAr: 'عرض المنصة · ٦٥ ثانية',
    navLabelEn: 'Platform Overview',
    navLabelAr: 'نظرة عامة على المنصة',
    titleEn: 'Grow in 65 Seconds — Complete Corporate Treasury Control',
    titleAr: 'منصة Grow في ٦٥ ثانية — تحكم شامل في الخزانة المؤسسية',
    subtitleEn: 'Four high-impact treasury modules on one governed, bank-grade platform — zero ERP overhaul required.',
    subtitleAr: 'أربع وحدات خزانة متكاملة بحوكمة مصرفية وتشفير مستقل لكل شركة — دون تعقيد أو تعديل نظام الـ ERP.',
    handoffTitleEn: 'Where Would You Like to Go Deeper?',
    handoffTitleAr: 'أي وحدة تود استكشافها الآن؟',
    handoffSubtitleEn: 'Watch a 75-second executive story for any module, or jump straight into hands-on workflows on real screens.',
    handoffSubtitleAr: 'شاهد القصة التنفيذية لأي وحدة في ٧٥ ثانية، أو جرب مسارات العمل التفاعلية بنفسك على شاشات النظام.',
    chapters: [
      {
        chapter: 1,
        shortTabEn: '01 · LG Custody',
        shortTabAr: '٠١ · الضمانات الواردة',
        badgeEn: 'Module 01 · AI Scan, Reminders & Escalations',
        badgeAr: 'الوحدة ٠١ · المسح الذكي والتنبيهات والتصعيد الآلي',
        metricEn: 'Zero Missed Expiries',
        metricAr: 'صفر ضمانات منسية',
        headlineEn: 'Protect Incoming Guarantees with Automated Reminders & Escalations',
        headlineAr: 'حماية الضمانات الواردة بتنبيهات استباقية وتصعيد آلي قبل الاستحقاق',
        captionEn:
          'Grow unifies corporate treasury in four specialized modules—starting with LG Custody, which scans incoming vendor guarantees with AI, exposes restrictive claim wording upfront, drives automated expiry reminders and management escalations so no guarantee slips, fast-tracks protective extensions, and seals releases with QR-verified bank letters.',
        captionAr:
          'توحّد منصة Grow عمليات الخزانة المؤسسية في أربع وحدات متخصصة؛ تبدأ بوحدة حفظ الضمانات الواردة التي تمسح ضمانات المقاولين بالذكاء الاصطناعي، وتكشف شروط المصادرة المقيدة مبكراً، وتُطلق تنبيهات استباقية وتصعيداً آلياً للإدارة قبل أي استحقاق، وتنفذ التمديد الحمائي مباشرة مع تأمين الإفراج بخطابات QR موثقة.',
        image: '/demo/shots/custody_scan/step4_bank_smart_claim.png',
        url: 'app.growbusinessdevelopment.com/end-user/lg-records/new#bank-data',
        focusOrigin: '58% 67%',
        spotlight: { xPct: 23.5, yPct: 61.2, wPct: 73.0, hPct: 11.8 },
        deepDiveModuleId: 'custody',
        deepDiveBranchId: 'custody-scan-record',
        deepDiveCode: '1.1',
        deepDiveLabelEn: 'Try LG Custody (1.1)',
        deepDiveLabelAr: 'جرّب وحدة الحفظ (١.١)',
      },
      {
        chapter: 2,
        shortTabEn: '02 · LG Issuance',
        shortTabAr: '٠٢ · الضمانات الصادرة',
        badgeEn: 'Module 02 · Unified Intake, Custom Matrix & 0–100 Scoring',
        badgeAr: 'الوحدة ٠٢ · توحيد الطلبات ومصفوفة الاعتماد ومفاضلة البنوك',
        metricEn: 'Unified & Governed Issuance',
        metricAr: 'توحيد الطلبات وحوكمة التنفيذ',
        headlineEn: 'Unify Outgoing LG Requests, Custom Approvals & Bank Facility Scoring',
        headlineAr: 'توحيد طلبات إصدار الضمانات ومصفوفة الاعتماد ومفاضلة التسهيلات',
        captionEn:
          'Second, LG Issuance digitizes and unifies all outgoing guarantee requests in one place—with a fully customizable request form and configurable approval matrix. AI verifies contracts and wording risks, scores bank facilities from zero to one hundred across fees and margin terms, auto-fills official bank PDF forms, and reconciles Bank LG Position reports.',
        captionAr:
          'ثانياً، تُرقمن وحدة إصدار الضمانات الصادرة كافة طلبات الإدارات وتوحّدها في مكان واحد بنموذج طلب ومصفوفة اعتماد قابلة للتخصيص الكامل؛ مع فحص ذكي للعقود والصياغة، ومفاضلة لحظية للتسهيلات من صفر إلى مائة، وتعبئة آلية لاستمارات البنوك، ومطابقة تقارير مراكز الضمانات البنكية.',
        image: '/demo/shots/issuance_2_2/step_03_smart_facility_scoring.png',
        url: 'app.growbusinessdevelopment.com/end-user/issuance/requests#facility-scoring',
        focusOrigin: '78% 60%',
        spotlight: { xPct: 65.5, yPct: 44.0, wPct: 26.5, hPct: 34.0 },
        deepDiveModuleId: 'issuance',
        deepDiveBranchId: 'issuance-facility-scoring',
        deepDiveCode: '2.2',
        deepDiveLabelEn: 'Try Facility Scoring (2.2)',
        deepDiveLabelAr: 'جرّب تقييم التسهيلات (٢.٢)',
      },
      {
        chapter: 3,
        shortTabEn: '03 · FX & T-Bills',
        shortTabAr: '٠٣ · العملات والأذون',
        badgeEn: 'Module 03 · Flexible CBE Scenarios & Sealed Multi-Bank Bidding',
        badgeAr: 'الوحدة ٠٣ · مرونة متوافقة مع المركزي ومنافسة مصرفية مشفرة',
        metricEn: 'Live Market & CBE Checked',
        metricAr: 'مقارنة بالسوق اللحظي والمركزي',
        headlineEn: 'Flexible Multi-Bank FX & T-Bill Bidding Built for CBE Scenarios',
        headlineAr: 'منافسة مصرفية مرنة للعملات وأذون الخزانة تغطي متطلبات البنك المركزي',
        captionEn:
          'Third, FX and T-Bill Quotations replaces phone shopping with flexible, auditable multi-bank competition tailored to Central Bank of Egypt scenarios—supporting Execution versus Indicative benchmark roles, selective document visibility, and alternative value dates. Banks quote via zero-password links into AES-256 sealed bidding, then rank on All-In net cost checked against live market and CBE rates.',
        captionAr:
          'ثالثاً، تستبدل وحدة عروض العملات وأذون الخزانة التفاوض الهاتفي بمنافسة مصرفية موثقة ومرنة بالكامل تغطي مختلف السيناريوهات المتوافقة مع متطلبات البنك المركزي المصري—من الفصل بين بنوك التنفيذ وبنوك التسعير الاسترشادي والتحكم في إتاحة المستندات وتواريخ التسوية؛ مع تسعير مشفر بلا كلمة مرور وترسية بالصافي مقارَنة بأسعار السوق اللحظية ومؤشر المركزي.',
        image: '/demo/shots/quotations_3_3/step_01_provisional_net_standings.png',
        url: 'app.growbusinessdevelopment.com/end-user/quotations/results#net-standings',
        focusOrigin: '50% 50%',
        spotlight: { xPct: 5.5, yPct: 18.0, wPct: 89.0, hPct: 64.0 },
        deepDiveModuleId: 'quotations',
        deepDiveBranchId: 'quotations-net-award',
        deepDiveCode: '3.3',
        deepDiveLabelEn: 'Try Net Award & Benchmarks (3.3)',
        deepDiveLabelAr: 'جرّب الترسية والمقارنة السعرية (٣.٣)',
      },
      {
        chapter: 4,
        shortTabEn: '04 · Bank Auto-Recon',
        shortTabAr: '٠٤ · المطابقة البنكية',
        badgeEn: 'Module 04 · Continuously Evolving AI & Balanced ERP Journals',
        badgeAr: 'الوحدة ٠٤ · نظام يتعلم ويتطور باستمرار + قيود يومية متوازنة',
        metricEn: 'Learns & Evolves as You Go',
        metricAr: 'يتعلم ويتطور مع كل دورة',
        headlineEn: 'Self-Evolving Bank Reconciliation & Balanced ERP Journals in Minutes',
        headlineAr: 'مطابقة بنكية تتعلم وتتطور باستمرار وتصدّر قيوداً متوازنة خلال دقائق',
        captionEn:
          'Fourth, Bank Auto-Reconciliation ingests Arabic and English bank statements with zero setup, pairs cross-bank sweeps even when wire fees are deducted, continuously learns and evolves with every review under per-company AES-256 privacy, and exports balanced double-entry ERP journals. Choose any module next to watch its story or explore hands-on.',
        captionAr:
          'رابعاً، تستورد وحدة المطابقة البنكية الذكية كشوف الحسابات العربية والإنجليزية دون إعدادات مسبقة، وتربط التحويلات البينية حتى مع خصم عمولات التحويل، وتتعلم وتتطور باستمرار مع كل دورة مطابقة بتشفير مستقل لكل شركة، وتصدّر قيود يومية مزدوجة متوازنة لنظام الـ ERP. اختر أي وحدة الآن لمشاهدة قصتها أو تجربتها تفاعلياً.',
        image: '/demo/shots/recon_4_4/step_04_live_balanced_journal_preview.png',
        url: 'app.growbusinessdevelopment.com/corporate-admin/reconciliation/export#preview',
        focusOrigin: '58% 53%',
        spotlight: { xPct: 21.25, yPct: 30.22, wPct: 76.75, hPct: 46.56 },
        deepDiveModuleId: 'reconciliation',
        deepDiveBranchId: 'recon-erp-export',
        deepDiveCode: '4.4',
        deepDiveLabelEn: 'Try GL Export (4.4)',
        deepDiveLabelAr: 'جرّب تصدير القيود (٤.٤)',
      },
    ],
  },

  custody: {
    id: 'custody',
    kind: 'module',
    moduleId: 'custody',
    accent: 'blue',
    durationBadgeEn: '75s Executive Story',
    durationBadgeAr: 'قصة تنفيذية · ٧٥ ثانية',
    navLabelEn: '01 · LG Custody',
    navLabelAr: '٠١ · الضمانات الواردة',
    titleEn: 'Module 01: LG Custody — Protect Every Incoming Guarantee',
    titleAr: 'الوحدة ٠١: حفظ خطابات الضمان الواردة — حماية كاملة لحقوق الشركة',
    subtitleEn: 'Safeguard supplier & contractor guarantees where your company is the Beneficiary.',
    subtitleAr: 'حماية الضمانات البنكية المستلمة من الموردين والمقاولين لصالح شركتكم كمستفيد.',
    handoffTitleEn: 'Explore LG Custody Hands-On (4 Live Workflows)',
    handoffTitleAr: 'جرّب مسارات وحدة حفظ الضمانات الواردة بنفسك (٤ جولات تفاعلية)',
    handoffSubtitleEn: 'Click any workflow below to test the exact screens, sample bank PDFs, and hotspots—or continue to Module 02.',
    handoffSubtitleAr: 'اختر أي مسار أدناه لتجربة الشاشات الفعلية والمستندات البنكية خطوة بخطوة، أو انتقل لقصة الوحدة الثانية.',
    chapters: [
      {
        chapter: 1,
        shortTabEn: '1. AI Scan & Trap Check',
        shortTabAr: '١. المسح وكشف الشروط',
        badgeEn: 'AI OCR + Smart Claim Trap Detection',
        badgeAr: 'مسح ذكي + كشف شروط التسييل المقيدة',
        metricEn: 'Seconds vs. Manual Typing',
        metricAr: 'رقمنة خلال ثوانٍ',
        headlineEn: 'Eliminate Spreadsheet Risk & Expose Hidden Claim Traps Day One',
        headlineAr: 'إنهاء مخاطر الإكسيل وكشف شروط المصادرة المقيدة منذ اللحظة الأولى',
        captionEn:
          'Missing a single expiry date in an Excel sheet can wipe out millions in supplier performance security overnight. In LG Custody, your team uploads any incoming guarantee scan and Grow’s AI extracts every field in seconds—highlighting conditional claim wording upfront and binding project owners with automatic management escalations.',
        captionAr:
          'فوات موعد انتهاء ضمان واحد في جداول الإكسيل قد يُفقد الشركة ملايين الجنيهات من غطاء حسن التنفيذ فوراً. في وحدة حفظ الضمانات الواردة، يرفع فريقك صورة الضمان فيستخرج الذكاء الاصطناعي كافة البيانات خلال ثوانٍ، ويكشف شروط التسييل المقيدة مبكراً، ويربط مسؤول المشروع بسلسلة تصعيد آلي للإدارة.',
        image: '/demo/shots/custody_scan/step4_bank_smart_claim.png',
        url: 'app.growbusinessdevelopment.com/end-user/lg-records/new#bank-data',
        focusOrigin: '58% 67%',
        spotlight: { xPct: 23.5, yPct: 61.2, wPct: 73.0, hPct: 11.8 },
        deepDiveModuleId: 'custody',
        deepDiveBranchId: 'custody-scan-record',
        deepDiveCode: '1.1',
        deepDiveLabelEn: 'Try AI Scan & Intake (1.1)',
        deepDiveLabelAr: 'جرّب المسح الذكي (١.١)',
      },
      {
        chapter: 2,
        shortTabEn: '2. Reminders & Escalations',
        shortTabAr: '٢. التنبيهات والتصعيد الآلي',
        badgeEn: 'Automated Reminders, Escalations & Direct Extension',
        badgeAr: 'تنبيهات استباقية وتصعيد آلي وتمديد حمائي مباشر',
        metricEn: 'Zero Missed Cutoffs',
        metricAr: 'صفر مواعيد فائتة',
        headlineEn: 'Automated Reminders, Management Escalations & Fast-Track Extensions',
        headlineAr: 'تنبيهات استباقية وتصعيد آلي للإدارة وتمديد حمائي دون تعطيل',
        captionEn:
          'A live four-queue Action Center tracks upcoming renewals, pending prints, branch deliveries, and overdue bank replies—backed by automated owner reminders and multi-stage management escalations before any cutoff date. Because extending a vendor guarantee protects your company, Grow executes protective extensions directly with zero approval delay.',
        captionAr:
          'يراقب مركز الإجراءات الحي أربع قوائم تشمل التجديدات والطباعة والتسليم وردود البنوك المتأخرة، مدعوماً بتنبيهات استباقية للمسؤولين وتصعيد آلي متدرج للإدارة قبل فوات أي مهلة؛ مع تنفيذ التمديد الحمائي مباشرة دون انتظار طوابير الاعتماد.',
        image: '/demo/shots/custody_action_center/step1_action_center_radar.png',
        url: 'app.growbusinessdevelopment.com/end-user/action-center',
        focusOrigin: '58% 78%',
        spotlight: { xPct: 21.5, yPct: 66.2, wPct: 76.0, hPct: 28.5 },
        deepDiveModuleId: 'custody',
        deepDiveBranchId: 'custody-action-center',
        deepDiveCode: '1.2',
        deepDiveLabelEn: 'Try Action Center (1.2)',
        deepDiveLabelAr: 'جرّب مركز الإجراءات (١.٢)',
      },
      {
        chapter: 3,
        shortTabEn: '3. Maker-Checker & QR',
        shortTabAr: '٣. الاعتماد وختم QR',
        badgeEn: 'Strict Maker-Checker + HMAC QR & Security Code',
        badgeAr: 'اعتماد مزدوج صارم + ختم QR وكود أمان رباعي',
        metricEn: 'Anti-Forgery Bank Portal',
        metricAr: 'حماية كاملة ضد التزوير',
        headlineEn: 'Lock Down Releases, Reductions & Claims with QR-Sealed Letters',
        headlineAr: 'حوكمة الإفراج والتخفيض والتسييل بخطابات مؤمّنة ضد التزوير',
        captionEn:
          'Whenever an action reduces your financial protection—such as a milestone reduction, release, or liquidation—Grow blocks self-approval, requires supporting evidence, and enforces Maker-Checker sign-off. Approved bank letters carry a digitally signed QR code and split security code that bank officers verify online in seconds.',
        captionAr:
          'عندما يؤثر الإجراء على الغطاء المالي للشركة—مثل التخفيض المرحلي أو الإفراج أو التسييل—يمنع النظام الاعتماد الذاتي ويلزم بإرفاق المستندات المؤيدة واعتماد المراجع والمعتمد. وتصدر خطابات البنوك مختومة برمز QR موقّع رقمياً وكود أمان يتحقق منه موظف البنك فوراً عبر بوابة التحقق.',
        image: '/demo/shots/custody_lifecycle/step5_qr_bank_instruction_letter.png',
        url: 'app.growbusinessdevelopment.com/end-user/lg-records/instructions/view-letter',
        focusOrigin: '50% 88%',
        spotlight: { xPct: 31.92, yPct: 86.18, wPct: 36.15, hPct: 10.0 },
        deepDiveModuleId: 'custody',
        deepDiveBranchId: 'custody-lifecycle-letter',
        deepDiveCode: '1.3',
        deepDiveLabelEn: 'Try QR Bank Letters (1.3)',
        deepDiveLabelAr: 'جرّب خطابات الـ QR (١.٣)',
      },
      {
        chapter: 4,
        shortTabEn: '4. Stamp & Bank Reply AI',
        shortTabAr: '٤. ختم التسليم ورد البنك',
        badgeEn: 'Split-Screen AI Bank Amendment Inspector',
        badgeAr: 'عارض الفحص المزدوج لمطابقة رد البنك بالذكاء الاصطناعي',
        metricEn: 'Closed-Loop Audit Trail',
        metricAr: 'إغلاق كامل للدورة الرقابية',
        headlineEn: 'Verify Bank Receiving Stamps & Cross-Check Bank Replies with AI',
        headlineAr: 'التحقق الذكي من ختم استلام البنك ومطابقة إشعار التعديل الرسمي',
        captionEn:
          'Printing a bank letter is never the finish line. Grow audits physical bank receiving stamps for date accuracy and cross-checks incoming bank amendment advices side by side against your original instruction—ensuring no guarantee expires or changes silently before closing the audit loop.',
        captionAr:
          'طباعة الخطاب ليست نهاية المطاف؛ فالمنصة تفحص ختم استلام البنك الفعلي لمطابقة التواريخ، وتراجع إشعار البنك الرسمي جنباً إلى جنب مع تعليماتكم الأصلية بالذكاء الاصطناعي، لضمان عدم تعديل أو سقوط أي ضمان بصمت وإغلاق الدورة الرقابية بالكامل.',
        image: '/demo/shots/custody_delivery_reply/step5_split_document_ai_inspector.png',
        url: 'app.growbusinessdevelopment.com/end-user/lg-records/details#ai-inspector',
        focusOrigin: '50% 52%',
        spotlight: { xPct: 12.08, yPct: 25.0, wPct: 76.0, hPct: 62.0 },
        deepDiveModuleId: 'custody',
        deepDiveBranchId: 'custody-delivery-reply',
        deepDiveCode: '1.4',
        deepDiveLabelEn: 'Try Reply Inspector (1.4)',
        deepDiveLabelAr: 'جرّب مطابقة رد البنك (١.٤)',
      },
    ],
  },

  issuance: {
    id: 'issuance',
    kind: 'module',
    moduleId: 'issuance',
    accent: 'purple',
    durationBadgeEn: '75s Executive Story',
    durationBadgeAr: 'قصة تنفيذية · ٧٥ ثانية',
    navLabelEn: '02 · LG Issuance',
    navLabelAr: '٠٢ · الضمانات الصادرة',
    titleEn: 'Module 02: LG Issuance — Unified Intake, Custom Governance & Smart Bank Execution',
    titleAr: 'الوحدة ٠٢: إصدار خطابات الضمان الصادرة — توحيد الطلبات وحوكمة التنفيذ البنكي',
    subtitleEn: 'Govern outgoing corporate guarantees where your company is the Applicant across bank facilities.',
    subtitleAr: 'إدارة ضمانات الشركة الصادرة لصالح العملاء بنماذج ومصفوفة اعتماد مخصصة ومفاضلة ذكية بين البنوك.',
    handoffTitleEn: 'Explore LG Issuance Hands-On (4 Live Workflows)',
    handoffTitleAr: 'جرّب مسارات وحدة إصدار الضمانات الصادرة بنفسك (٤ جولات تفاعلية)',
    handoffSubtitleEn: 'Test any outgoing issuance workflow step by step—from customizable intake and 0–100 scoring to Bank LG Position reconciliation.',
    handoffSubtitleAr: 'اختر أي مسار أدناه لتجربة بوابة الطلبات الموحدة والمفاضلة بين البنوك وتعبئة النماذج ومطابقة مراكز الضمانات.',
    chapters: [
      {
        chapter: 1,
        shortTabEn: '1. Unified Intake & Matrix',
        shortTabAr: '١. توحيد الطلبات والاعتماد',
        badgeEn: 'Customizable Request Form + Configurable Approval Matrix',
        badgeAr: 'نموذج طلب مخصص + مصفوفة موافقات مرنة + فحص العقود والصياغة',
        metricEn: 'Centralized Digital Intake',
        metricAr: 'رقمنة وتوحيد كافة الطلبات',
        headlineEn: 'Digitize & Unify LG Requests with Customizable Forms and Approvals',
        headlineAr: 'رقمنة وتوحيد طلبات الإصدار بنموذج طلب ومصفوفة اعتماد قابلة للتخصيص',
        captionEn:
          'Instead of scattered department emails, LG Issuance digitizes and unifies all outgoing guarantee requests in one central portal—with a fully customizable request form and sequential approval matrix by amount, department, or risk, while AI verifies contracts, blocks duplicates, and flags risky beneficiary wording.',
        captionAr:
          'بدلاً من تشتت الطلبات عبر الإيميلات، تُرقمن وحدة الإصدار كافة طلبات الإدارات وتوحّدها في بوابة مركزية بنموذج طلب ومصفوفة موافقات قابلة للتخصيص الكامل حسب المبلغ أو الإدارة أو المخاطر، بينما يطابق الذكاء الاصطناعي العقود ويمنع التكرار ويكشف فخاخ الصياغة.',
        image: '/demo/shots/issuance_2_1/step_05_applicant_trap_scan.png',
        url: 'app.growbusinessdevelopment.com/end-user/issuance/requests#wording-trap-scan',
        focusOrigin: '36% 56%',
        spotlight: { xPct: 7.99, yPct: 51.33, wPct: 54.4, hPct: 14.0 },
        deepDiveModuleId: 'issuance',
        deepDiveBranchId: 'issuance-intake',
        deepDiveCode: '2.1',
        deepDiveLabelEn: 'Try Intake & Trap Scan (2.1)',
        deepDiveLabelAr: 'جرّب بوابة الطلبات (٢.١)',
      },
      {
        chapter: 2,
        shortTabEn: '2. 0–100 Bank Scoring',
        shortTabAr: '٢. مفاضلة البنوك الذكية',
        badgeEn: '0–100 Live Commission, Margin Terms & SLA Ranking',
        badgeAr: 'ترتيب لحظي (٠–١٠٠) حسب شروط العمولة والغطاء وسرعة البنك',
        metricEn: 'Optimal Facility Selection',
        metricAr: 'اختيار التسهيل الأنسب لحظياً',
        headlineEn: 'Compare & Score Eligible Bank Facilities 0–100 in Real Time',
        headlineAr: 'مقارنة ومفاضلة لحظية بين التسهيلات البنكية المتاحة من ٠ إلى ١٠٠',
        captionEn:
          'Choosing which bank line should issue a new guarantee shouldn’t rely on guesswork. Grow evaluates every eligible bank facility from zero to one hundred across commission tariffs, cash margin terms, actual bank turnaround speed, and sub-limit utilization—reserving facility headroom atomically upon selection.',
        captionAr:
          'اختيار البنك الأنسب لإصدار الضمان لم يعد يعتمد على التقدير الشخصي؛ إذ تقيّم المنصة كافة التسهيلات المؤهلة من صفر إلى مائة حسب شروط العمولة ونسبة الغطاء وسرعة تنفيذ البنك الفعلية وإتاحة الحدود الفرعية، مع حجز الرصيد الائتماني لحظياً.',
        image: '/demo/shots/issuance_2_2/step_03_smart_facility_scoring.png',
        url: 'app.growbusinessdevelopment.com/end-user/issuance/requests#facility-scoring',
        focusOrigin: '78% 60%',
        spotlight: { xPct: 65.5, yPct: 44.0, wPct: 26.5, hPct: 34.0 },
        deepDiveModuleId: 'issuance',
        deepDiveBranchId: 'issuance-facility-scoring',
        deepDiveCode: '2.2',
        deepDiveLabelEn: 'Try 0–100 Scoring (2.2)',
        deepDiveLabelAr: 'جرّب التقييم الذكي (٢.٢)',
      },
      {
        chapter: 3,
        shortTabEn: '3. Auto-Fill Bank PDF',
        shortTabAr: '٣. استمارة البنك الآلية',
        badgeEn: 'Zero-Typing Official Bank PDF Form + AI Copy Check',
        badgeAr: 'تعبئة آلية لنموذج البنك الرسمي + فحص أصل الضمان الصادر',
        metricEn: 'Zero Retyping Errors',
        metricAr: 'صفر أخطاء تعبئة يدوية',
        headlineEn: 'Auto-Fill Official Bank PDF Forms & Verify the Issued LG Scan',
        headlineAr: 'تعبئة استمارات البنوك الرسمية تلقائياً ومطابقة الضمان الصادر بالذكاء الاصطناعي',
        captionEn:
          'Instead of retyping paper bank forms by hand, Grow populates the selected bank’s official PDF application and legal wording annex in one click, tracks branch delivery, and cross-checks the bank’s final issued guarantee scan with AI to catch tariff or expiry discrepancies immediately.',
        captionAr:
          'بدلاً من إعادة كتابة استمارات البنوك الورقية يدوياً، تملأ المنصة نموذج الـ PDF الرسمي للبنك المختار وملحق الصياغة بضغطة واحدة، وتتتبع التسليم للفرع، ثم تطابق صورة الضمان الصادر من البنك بالذكاء الاصطناعي لكشف أي اختلاف في المبلغ أو الصلاحية فوراً.',
        image: '/demo/shots/issuance_2_3/step_02_autofill_confirm_issue.png',
        url: 'app.growbusinessdevelopment.com/end-user/issuance/requests#confirm-bank-form',
        focusOrigin: '52% 62%',
        spotlight: { xPct: 26.0, yPct: 22.0, wPct: 50.0, hPct: 72.0 },
        deepDiveModuleId: 'issuance',
        deepDiveBranchId: 'issuance-bank-form',
        deepDiveCode: '2.3',
        deepDiveLabelEn: 'Try Auto-Filled Form (2.3)',
        deepDiveLabelAr: 'جرّب تعبئة الاستمارة (٢.٣)',
      },
      {
        chapter: 4,
        shortTabEn: '4. LG Position Recon',
        shortTabAr: '٤. مطابقة مراكز الضمانات',
        badgeEn: 'Automated Bank LG Position Report Reconciliation',
        badgeAr: 'مطابقة آلية لتقارير مراكز خطابات الضمان لدى البنوك',
        metricEn: 'Full Position Visibility',
        metricAr: 'تطابق دقيق مع سجلات البنك',
        headlineEn: 'Govern Lifecycle Maintenance & Reconcile Bank LG Position Reports',
        headlineAr: 'حوكمة تعديلات الضمانات ومطابقة تقارير مراكز الضمانات البنكية',
        captionEn:
          'Post-issuance lifecycle stays governed end to end: guarantee returns execute directly, extensions and amount increases route through your approval matrix, and periodic Bank LG Position reports reconcile automatically against your register to flag amount variances, unrecorded items, or expired guarantees still open at the bank.',
        captionAr:
          'تستمر الحوكمة طوال دورة حياة الضمان الصادر؛ حيث تُنفذ إجراءات رد وإلغاء الضمان مباشرة، وتمر التمديدات والزيادات عبر مصفوفة الاعتماد، وتُطابق المنصة تقارير مراكز الضمانات الواردة من البنوك تلقائياً مع سجلاتكم لكشف أي فروق مبالغ أو ضمانات منتهية ما زالت مفتوحة لدى البنك.',
        image: '/demo/shots/issuance_2_4/step_03_position_variance_matrix.png',
        url: 'app.growbusinessdevelopment.com/end-user/issuance/reconciliation#session-results',
        focusOrigin: '58% 56%',
        spotlight: { xPct: 21.0, yPct: 44.0, wPct: 76.0, hPct: 24.0 },
        deepDiveModuleId: 'issuance',
        deepDiveBranchId: 'issuance-position-recon',
        deepDiveCode: '2.4',
        deepDiveLabelEn: 'Try Position Recon (2.4)',
        deepDiveLabelAr: 'جرّب مطابقة المراكز (٢.٤)',
      },
    ],
  },

  quotations: {
    id: 'quotations',
    kind: 'module',
    moduleId: 'quotations',
    accent: 'emerald',
    durationBadgeEn: '75s Executive Story',
    durationBadgeAr: 'قصة تنفيذية · ٧٥ ثانية',
    navLabelEn: '03 · FX & T-Bills',
    navLabelAr: '٠٣ · العملات والأذون',
    titleEn: 'Module 03: FX & T-Bill Quotations — Capture Every Basis Point',
    titleAr: 'الوحدة ٠٣: عروض العملات وأذون الخزانة — تحقيق أفضل سعر تنفيذ صافي',
    subtitleEn: 'Sealed-bid multi-bank FX Spot & Sovereign T-Bill competition with All-In net ranking and audit proof.',
    subtitleAr: 'منافسة مصرفية مشفرة للعملات الفورية وأذون الخزانة بالصافي الشامل مع شهادة تدقيق معتمدة.',
    handoffTitleEn: 'Explore FX & T-Bill Quotations Hands-On (3 Live Workflows)',
    handoffTitleAr: 'جرّب مسارات عروض العملات وأذون الخزانة بنفسك (٣ جولات تفاعلية)',
    handoffSubtitleEn: 'Walk through the Treasurer RFQ desk, the Bank Dealer OTP console, and the All-In Net Award & Audit Pack.',
    handoffSubtitleAr: 'جرب شاشة طرح الممارسة، وشاشة متداول البنك بدون كلمة مرور، وشاشة الترسية وشهادة التدقيق.',
    chapters: [
      {
        chapter: 1,
        shortTabEn: '1. Flexible CBE Scenarios',
        shortTabAr: '١. مرونة سيناريوهات المركزي',
        badgeEn: 'Execution vs. Indicative Roles + Bank Tariff & TVM Matrix',
        badgeAr: 'مرونة التنفيذ والاسترشادي + مصفوفة العمولات وتواريخ التسوية',
        metricEn: 'CBE-Aligned Flexibility',
        metricAr: 'توافق كامل مع متطلبات المركزي',
        headlineEn: 'Flexible Multi-Bank Tenders Built Around CBE Scenarios',
        headlineAr: 'طرح مصرفي مرن يغطي كافة السيناريوهات المتوافقة مع متطلبات البنك المركزي',
        captionEn:
          'Shopping FX deals or Treasury Bills by phone leaves basis points on the table. Grow adapts to every Central Bank of Egypt scenario—supporting Execution versus Indicative benchmark banks per leg, selective supporting-document visibility, alternative value dates, and upfront bank fee and Time-Value-of-Money normalization.',
        captionAr:
          'التفاوض الهاتفي يُفقد الشركة نقاطاً سعرية مؤثرة؛ لذا تغطي المنصة كافة السيناريوهات المتوافقة مع متطلبات البنك المركزي المصري—من تحديد بنوك التنفيذ الفعلي وبنوك التسعير الاسترشادي لكل عملة، والتحكم في إتاحة المستندات وتواريخ التسوية، واحتساب عمولات كل بنك مسبقاً.',
        image: '/demo/shots/quotations_3_1/step_02_tariff_and_tvm_matrix.png',
        url: 'app.growbusinessdevelopment.com/end-user/quotations/active#bank-tariffs-tvm',
        focusOrigin: '76% 50%',
        spotlight: { xPct: 56.16, yPct: 8.0, wPct: 40.44, hPct: 84.0 },
        deepDiveModuleId: 'quotations',
        deepDiveBranchId: 'quotations-rfq-broadcast',
        deepDiveCode: '3.1',
        deepDiveLabelEn: 'Try RFQ Builder (3.1)',
        deepDiveLabelAr: 'جرّب بناء الطرح (٣.١)',
      },
      {
        chapter: 2,
        shortTabEn: '2. Zero-Password Desk',
        shortTabAr: '٢. غرفة تداول بلا حساب',
        badgeEn: 'Domain-Locked OTP Dealer Desk + Fat-Finger Guardrails',
        badgeAr: 'دخول برمز تحقق بدون كلمة مرور + منع أخطاء الإدخال السعري',
        metricEn: 'Zero Bank Onboarding Friction',
        metricAr: 'مشاركة فورية من البنوك',
        headlineEn: 'Bank Dealers Quote in Seconds — Zero Passwords or Portal Setup',
        headlineAr: 'تسعير فوري من متداولي البنوك بدون حسابات أو كلمات مرور معقدة',
        captionEn:
          'Banks hate creating portal passwords. Grow authenticates bank dealers in seconds via domain-locked one-time codes into an encrypted bidding desk—complete with live fat-finger guardrails that block misplaced decimals and inverted currency legs before a mistaken quote ever hits your blotter.',
        captionAr:
          'تتجنب البنوك دائماً تعقيدات إنشاء الحسابات وكلمات المرور؛ لذلك توثق المنصة هوية متداول البنك خلال ثوانٍ برمز تحقق مرتبط بنطاق البنك، داخل شاشة تسعير مشفرة مزودة بضوابط ذكية تمنع أخطاء العلامة العشرية أو عكس أسعار العملات قبل إرسال العرض.',
        image: '/demo/shots/quotations_3_2/step_03_fat_finger_guardrail.png',
        url: 'app.growbusinessdevelopment.com/public-quotation/fncb-desk#rate-guardrail',
        focusOrigin: '50% 48%',
        spotlight: { xPct: 28.0, yPct: 24.0, wPct: 44.0, hPct: 48.0 },
        deepDiveModuleId: 'quotations',
        deepDiveBranchId: 'quotations-dealer-desk',
        deepDiveCode: '3.2',
        deepDiveLabelEn: 'Try Dealer Guardrails (3.2)',
        deepDiveLabelAr: 'جرّب شاشة المتداول (٣.٢)',
      },
      {
        chapter: 3,
        shortTabEn: '3. Sealed Live Floor',
        shortTabAr: '٣. التشفير والمتابعة الحية',
        badgeEn: 'AES-256 Sealed Quotes + Real-Time Floor Participation',
        badgeAr: 'تشفير تام للأسعار حتى الإغلاق + متابعة حية لمشاركة البنوك',
        metricEn: 'Zero Early Price Leakage',
        metricAr: 'سرية كاملة للأسعار حتى الإغلاق',
        headlineEn: 'Track Live Bank Participation While Every Rate Stays Sealed',
        headlineAr: 'تابع مشاركة البنوك لحظياً بينما تظل كافة الأسعار مشفرة حتى الإغلاق',
        captionEn:
          'While the bidding countdown is open, every submitted quote stays strictly sealed with AES-256 encryption until the clock hits zero—preventing premature rate leakage while your treasury desk tracks live dealer connections and locked-in quotes in real time, and dealers freely update their own sealed quotes as the market moves.',
        captionAr:
          'طوال سريان العد التنازلي للطرح، تظل كافة العروض المقدمة مشفرة بالكامل بتقنية AES-256 حتى لحظة الإغلاق—مما يمنع أي كشف مبكر للأسعار، بينما يتابع فريق الخزانة اتصال البنوك وعدد العروض المسجلة لحظياً مع إمكانية تحديث كل متداول لعرضه المشفر قبل انتهاء المهلة.',
        image: '/demo/shots/quotations_3_1/step_05_blind_live_floor.png',
        url: 'app.growbusinessdevelopment.com/end-user/quotations/results#live-telemetry',
        focusOrigin: '58% 18%',
        spotlight: { xPct: 21.25, yPct: 10.0, wPct: 77.5, hPct: 9.5 },
        deepDiveModuleId: 'quotations',
        deepDiveBranchId: 'quotations-rfq-broadcast',
        deepDiveCode: '3.1',
        deepDiveLabelEn: 'See Sealed Live Floor (3.1)',
        deepDiveLabelAr: 'شاهد شاشة المتابعة الحية (٣.١)',
      },
      {
        chapter: 4,
        shortTabEn: '4. Net Award & Audit Pack',
        shortTabAr: '٤. الترسية وشهادة التدقيق',
        badgeEn: 'Cherry-Pick Per Leg + Live Market & CBE Check + HMAC Receipts',
        badgeAr: 'ترسية مجزأة لكل عملة + مقارنة بالسوق اللحظي والمركزي + شهادة تدقيق',
        metricEn: 'Board-Ready Audit Proof',
        metricAr: 'توثيق رقابي كامل للمراجعين',
        headlineEn: 'Cherry-Pick Winners by Net Rate & Seal Best-Execution Proof',
        headlineAr: 'ترسية كل عملة لأفضل بنك بالصافي وإصدار شهادة تدقيق فورية',
        captionEn:
          'The instant the window closes, Grow ranks bids by All-In net cost, benchmarks quotes against both live market rates and Central Bank fixings, lets you cherry-pick the winning bank per currency leg, and generates a Best Execution Audit Certificate plus bank-scoped cryptographic Deal Execution Receipts.',
        captionAr:
          'فور إغلاق نافذة التسعير، ترتب المنصة العروض بالصافي الشامل، وتقارنها بأسعار السوق اللحظية ومؤشر البنك المركزي معاً، وتتيح ترسية كل عملة لأفضل بنك على حدة، مع إصدار شهادة تدقيق أفضل تنفيذ للمراجعين وإيصالات صفقة رقمية معزولة لكل بنك فائز.',
        image: '/demo/shots/quotations_3_3/step_04_best_execution_audit_pack.png',
        url: 'app.growbusinessdevelopment.com/end-user/quotations/results#audit-certificate',
        focusOrigin: '50% 48%',
        spotlight: { xPct: 18.61, yPct: 6.0, wPct: 62.78, hPct: 88.0 },
        deepDiveModuleId: 'quotations',
        deepDiveBranchId: 'quotations-net-award',
        deepDiveCode: '3.3',
        deepDiveLabelEn: 'Try Award & Audit Pack (3.3)',
        deepDiveLabelAr: 'جرّب الترسية والتدقيق (٣.٣)',
      },
    ],
  },

  reconciliation: {
    id: 'reconciliation',
    kind: 'module',
    moduleId: 'reconciliation',
    accent: 'amber',
    durationBadgeEn: '75s Executive Story',
    durationBadgeAr: 'قصة تنفيذية · ٧٥ ثانية',
    navLabelEn: '04 · Bank Auto-Recon',
    navLabelAr: '٠٤ · المطابقة البنكية',
    titleEn: 'Module 04: Bank Auto-Reconciliation — Close in Minutes, Not Days',
    titleAr: 'الوحدة ٠٤: المطابقة البنكية الذكية — إقفال شهري في دقائق بدلاً من أيام',
    subtitleEn: 'Zero-config Arabic/English statements, sweep pairing, Zero-PII self-learning rules, and balanced ERP journals.',
    subtitleAr: 'استيراد الكشوف العربية والإنجليزية، وربط التحويلات البينية، والتعلم الذاتي، وتصدير قيود ERP المتوازنة.',
    handoffTitleEn: 'Explore Bank Auto-Reconciliation Hands-On (4 Live Workflows)',
    handoffTitleAr: 'جرّب مسارات المطابقة البنكية الذكية بنفسك (٤ جولات تفاعلية)',
    handoffSubtitleEn: 'Test zero-config import, cross-bank sweep pairing, self-learning rules, and balanced SAP/Oracle journal export.',
    handoffSubtitleAr: 'جرب الاستيراد الذكي، وربط التحويلات البينية والمرتدات، والقواعد ذاتية التعلم، وتصدير قيود اليومية.',
    chapters: [
      {
        chapter: 1,
        shortTabEn: '1. Zero-Config Import',
        shortTabAr: '١. استيراد وفحص الأرصدة',
        badgeEn: 'Arabic/English Auto-Detect + Balance Continuity Audit',
        badgeAr: 'قراءة الكشوف العربية والإنجليزية + فحص تسلسل الأرصدة',
        metricEn: 'Zero Template Mapping',
        metricAr: 'بدون قوالب أو إعدادات مسبقة',
        headlineEn: 'Import Any Bank Statement Instantly with Mathematical Continuity Proof',
        headlineAr: 'استيراد فوري لكشوف أي بنك مع فحص رياضي صارم لتسلسل الأرصدة',
        captionEn:
          'Finance teams lose days every month formatting multi-bank Excel files and decoding cryptic Arabic and English memos. Grow auto-detects statement columns with zero setup, verifies opening-to-closing mathematical balance continuity, and classifies fees, taxes, payroll, and collections with explainable AI badges.',
        captionAr:
          'تستنزف الفرق المالية أياماً كل شهر في تنسيق كشوف البنوك وفك رموز القيود العربية والإنجليزية. تكتشف المنصة أعمدة أي كشف حساب تلقائياً دون إعدادات مسبقة، وتتحقق رياضياً من تسلسل الرصيد الافتتاحي والختامي، وتصنف العمولات والضرائب والرواتب والتحصيلات بشارات مفسّرة.',
        image: '/demo/shots/recon_4_1/step_04_multitier_ai_badges.png',
        url: 'app.growbusinessdevelopment.com/corporate-admin/reconciliation/workspace/21#classified',
        focusOrigin: '58% 45%',
        spotlight: { xPct: 21.88, yPct: 22.06, wPct: 76.12, hPct: 46.06 },
        deepDiveModuleId: 'reconciliation',
        deepDiveBranchId: 'recon-zero-config',
        deepDiveCode: '4.1',
        deepDiveLabelEn: 'Try Zero-Config Import (4.1)',
        deepDiveLabelAr: 'جرّب الاستيراد الذكي (٤.١)',
      },
      {
        chapter: 2,
        shortTabEn: '2. Sweeps & Wire Fees',
        shortTabAr: '٢. التحويلات وفروق الرسوم',
        badgeEn: 'Cross-Bank Sweep Pairing + Automatic Corridor Fee Split',
        badgeAr: 'ربط التحويلات البينية بين البنوك + معالجة عمولة التحويل تلقائياً',
        metricEn: 'Auto-Cleared Transfers',
        metricAr: 'تسوية آلية للتحويلات والمرتدات',
        headlineEn: 'Pair Cross-Bank Transfers Even When Wire Fees Shave the Amount',
        headlineAr: 'ربط التحويلات بين حسابات البنوك حتى عند خصم عمولات التحويل',
        captionEn:
          'Inter-bank transfers break traditional matching whenever corridor wire fees reduce the incoming credit. Grow pairs outgoing and incoming liquidity sweeps across banks automatically, isolates exact RTGS fee deductions, nets returned wires to zero, and reconciles ERP invoices with fee tolerances.',
        captionAr:
          'تفشل المطابقة التقليدية في التحويلات بين البنوك بمجرد خصم عمولة التحويل من المبلغ المستلم. تربط المنصة التحويلات الصادرة والواردة عبر البنوك تلقائياً مع فصل فرق عمولة التحويل بدقة، وتصفّي الحوالات المرتدة، وتطابق فواتير الـ ERP مع معالجة فروق الرسوم.',
        image: '/demo/shots/recon_4_2/step_02_sweep_pair_verification_modal.png',
        url: 'app.growbusinessdevelopment.com/corporate-admin/reconciliation/workspace#verify-sweep',
        focusOrigin: '50% 50%',
        spotlight: { xPct: 18.47, yPct: 13.47, wPct: 63.06, hPct: 73.94 },
        deepDiveModuleId: 'reconciliation',
        deepDiveBranchId: 'recon-sweeps-reversals',
        deepDiveCode: '4.2',
        deepDiveLabelEn: 'Try Sweeps & ERP Match (4.2)',
        deepDiveLabelAr: 'جرّب التحويلات البينية (٤.٢)',
      },
      {
        chapter: 3,
        shortTabEn: '3. Learns & Evolves',
        shortTabAr: '٣. يتعلم ويتطور باستمرار',
        badgeEn: 'Continuously Evolving AI + Per-Company AES-256 Vaults',
        badgeAr: 'تعلّم وتطوّر ذاتي مستمر + تشفير AES-256 مستقل لكل شركة',
        metricEn: 'Evolves as You Go',
        metricAr: 'دقة تتطور مع كل دورة',
        headlineEn: 'A System That Continuously Learns & Evolves as You Work',
        headlineAr: 'نظام ذكي يتعلم ويتطور باستمرار مع كل دورة مطابقة',
        captionEn:
          'Every time your team confirms a vendor, customer, or bank pattern, Grow learns and evolves automatically—inducing recurring rules in one click, self-monitoring rule precision over time, and encrypting counterparty names inside per-company AES-256 vaults with zero PII exposure.',
        captionAr:
          'مع كل تأكيد لتصنيف مورد أو عميل أو حركة بنكية، يتعلم النظام ويتطور تلقائياً؛ فيستنتج قواعد التكرار بضغطة واحدة، ويراقب دقتها ويحدّثها ذاتياً بمرور الوقت، مع حفظ أسماء الأطراف مشفرة بمفاتيح مستقلة لكل شركة وحماية تامة للخصوصية.',
        image: '/demo/shots/recon_4_3/step_02_online_learned_self_healed_rules.png',
        url: 'app.growbusinessdevelopment.com/corporate-admin/reconciliation/rules#custom-rules',
        focusOrigin: '58% 48%',
        spotlight: { xPct: 21.18, yPct: 20.67, wPct: 76.82, hPct: 55.67 },
        deepDiveModuleId: 'reconciliation',
        deepDiveBranchId: 'recon-rules-privacy',
        deepDiveCode: '4.3',
        deepDiveLabelEn: 'Try Self-Learning Rules (4.3)',
        deepDiveLabelAr: 'جرّب التعلم الذاتي (٤.٣)',
      },
      {
        chapter: 4,
        shortTabEn: '4. Balanced ERP Export',
        shortTabAr: '٤. قيود ERP المتوازنة',
        badgeEn: '3-Leg Balanced GL Preview + Duplicate-Posting Batch Lock',
        badgeAr: 'معاينة قيود اليومية الثلاثية المتوازنة + قفل منع تكرار الترحيل',
        metricEn: 'SAP / Oracle / Excel Ready',
        metricAr: 'جاهز للترحيل الفوري للـ ERP',
        headlineEn: 'Export Balanced Double-Entry GL Journals & Lock Against Re-Posting',
        headlineAr: 'تصدير قيود يومية مزدوجة متوازنة وقفل الدفعة ضد تكرار الترحيل',
        captionEn:
          'Once exceptions are reviewed, Grow expands every bank movement into balanced Cash, Customer or Vendor Offset, and Bank Fee Variance journal legs—formatted to your SAP, Oracle, or Dynamics layout and locked on download so no batch can ever be double-posted.',
        captionAr:
          'فور مراجعة الاستثناءات، يحوّل النظام كل حركة بنكية إلى قيد يومية متوازن يشمل البنك وحساب العميل أو المورد وسطر فرق العمولة، منسقاً حسب قالب نظام الـ ERP لديكم، مع قفل الدفعة عند التحميل لمنع تكرار ترحيل أي قيد مرتين.',
        image: '/demo/shots/recon_4_4/step_04_live_balanced_journal_preview.png',
        url: 'app.growbusinessdevelopment.com/corporate-admin/reconciliation/export#preview',
        focusOrigin: '58% 53%',
        spotlight: { xPct: 21.25, yPct: 30.22, wPct: 76.75, hPct: 46.56 },
        deepDiveModuleId: 'reconciliation',
        deepDiveBranchId: 'recon-erp-export',
        deepDiveCode: '4.4',
        deepDiveLabelEn: 'Try GL Journal Export (4.4)',
        deepDiveLabelAr: 'جرّب تصدير القيود (٤.٤)',
      },
    ],
  },
};

// Detailed Bilingual Walkthrough Narrative for Pilot #1 (Branch 1.1: AI Scan & Record New LG)
export const PILOT_BRANCH_STEPS = {
  'custody-scan-record': [
    {
      step: 1,
      shortTabEn: '1. Upload Workspace',
      shortTabAr: '١. شاشة الإدخال الذكي',
      roleEn: 'Operations Specialist (Maker)',
      roleAr: 'أخصائي عمليات الخزانة (مُعدّ)',
      headlineEn: 'Start from a Single Clean Dropzone — No Manual Typing',
      headlineAr: 'ابدأ من نافذة رفع ذكية واحدة — بدون إدخال يدوي مرهق',
      guideEn: 'When a supplier or contractor delivers a new Letter of Guarantee, your team opens Record New LG. Instead of typing 15+ fields by hand, they simply upload the PDF or image scan.',
      guideAr: 'عند استلام خطاب ضمان جديد من مقاول أو مورد، يفتح فريق الخزانة شاشة تسجيل ضمان جديد، وبدلاً من كتابة عشرات الحقول يدوياً يرفع ملف الـ PDF أو الصورة مباشرة.',
      actionLabelEn: 'Click "Upload & Scan"',
      actionLabelAr: 'اضغط "Upload & Scan"',
      highlightsEn: ['Supports PDF & scanned images', 'Eliminates manual data-entry typos'],
      highlightsAr: ['يدعم ملفات PDF والصور الممسوحة', 'يمنع أخطاء الإدخال اليدوي'],
      suggestDocPreview: true,
    },
    {
      step: 2,
      shortTabEn: '2. Trigger AI Scan',
      shortTabAr: '٢. تشغيل المسح الذكي',
      roleEn: 'Operations Specialist (Maker)',
      roleAr: 'أخصائي عمليات الخزانة (مُعدّ)',
      headlineEn: 'Attach the Bank Instrument & Launch AI OCR',
      headlineAr: 'إرفاق أصل خطاب الضمان وتشغيل محرك الذكاء الاصطناعي',
      guideEn: 'Here we attached an EGP 4,500,000 Performance Guarantee issued by First National Corporate Bank (FNCB) on behalf of NorthStar Electromechanical. One click on "Scan Now" sends it through Grow’s privacy-shielded OCR & AI parser.',
      guideAr: 'تم إرفاق خطاب ضمان حسن تنفيذ بقيمة ٤,٥٠٠,٠٠٠ ج.م صادر من البنك الوطني لتمويل الشركات (FNCB). بضغطة واحدة على "Scan Now" يبدأ المحرك الذكي قراءة المستند وتحليله.',
      actionLabelEn: 'Click "Scan Now"',
      actionLabelAr: 'اضغط "Scan Now"',
      highlightsEn: ['FNCB Performance LG · EGP 4.5M', 'Encrypted document handling'],
      highlightsAr: ['خطاب ضمان FNCB بقيمة ٤.٥ مليون ج.م', 'معالجة مشفرة وآمنة للمستندات'],
      suggestDocPreview: true,
    },
    {
      step: 3,
      shortTabEn: '3. Extracted LG Data',
      shortTabAr: '٣. استخراج البيانات والبنود',
      roleEn: 'AI Document Engine → Maker Review',
      roleAr: 'محرك الذكاء الاصطناعي ← مراجعة المُعدّ',
      headlineEn: 'Every Core Field & Contract Purpose Populated Automatically',
      headlineAr: 'تعبئة كافة البيانات الأساسية وغرض التعاقد تلقائياً',
      guideEn: 'In seconds, Grow populates Beneficiary Entity, Applicant (NorthStar Electromechanical), LG Number (LG-FNCB-2026-8840), Amount (4,500,000), Currency, Issue & Expiry Dates, LG Type, and the full underlying contract purpose.',
      guideAr: 'خلال ثوانٍ يملأ النظام اسم الشركة المستفيدة، والمقاول، ورقم الضمان، والمبلغ والعملة، وتواريخ الإصدار والانتهاء، ونوع الضمان، والغرض التعاقدي بالكامل.',
      actionLabelEn: 'Review "Bank Data" Section',
      actionLabelAr: 'راجع قسم بيانات البنك "Bank Data"',
      highlightsEn: ['Entity & LG Type matched to DB', 'Contract ref & purpose extracted'],
      highlightsAr: ['مطابقة الكيان ونوع الضمان تلقائياً', 'استخراج رقم العقد والغرض بدقة'],
      suggestDocPreview: false,
    },
    {
      step: 4,
      shortTabEn: '4. Claim Trap Shield',
      shortTabAr: '٤. كشف شروط التسييل',
      roleEn: 'Upfront Claim Protection Shield',
      roleAr: 'حماية حق المطالبة والمصادرة',
      headlineEn: 'Captures Mandatory Claim Wording Before It Costs You Millions',
      headlineAr: 'التقاط جملة الإقرار الإلزامية مسبقاً لحماية حق التسييل',
      guideEn: 'Opening Bank Data shows First National Corporate Bank (FNCB), its address, hotline, and URDG 758 rule already matched—plus the amber Smart Claim box pre-saving the exact breach declaration required so a bank can never reject your claim on a technicality.',
      guideAr: 'عند فتح بيانات البنك تظهر بيانات بنك FNCB وعنوانه وقواعد URDG 758 جاهزة تلقائياً، مع حفظ جملة الإقرار الإلزامي المطلوبة عند التسييل مسبقاً حتى لا يرفض البنك مطالبة الشركة بسبب نقص في الصياغة.',
      actionLabelEn: 'Open "Internal Data" Section',
      actionLabelAr: 'افتح قسم البيانات الداخلية "Internal Data"',
      highlightsEn: ['Bank contact data auto-filled', 'Saves mandatory claim text so claims never fail'],
      highlightsAr: ['تعبئة عنوان وهاتف البنك تلقائياً', 'حفظ الصياغة الإلزامية لضمان قبول طلب التسييل'],
      suggestDocPreview: false,
    },
    {
      step: 5,
      shortTabEn: '5. Internal Governance',
      shortTabAr: '٥. المسؤول والتصعيد الآلي',
      roleEn: 'Operations Specialist (Maker)',
      roleAr: 'أخصائي عمليات الخزانة (مُعدّ)',
      headlineEn: 'Bind Project Owner, Proactive Reminders & Escalation Chain',
      headlineAr: 'ربط مسؤول المشروع وتفعيل التنبيهات المبكرة وسلسلة التصعيد',
      guideEn: 'Selecting the project owner (project.owner@apexglobal.com) automatically binds their contact details and line manager—activating multi-stage expiry reminders and automatic management escalations if renewal decisions are ever delayed.',
      guideAr: 'بمجرد اختيار مسؤول المشروع تُربط بياناته ومديره المباشر تلقائياً لتفعيل التنبيهات الاستباقية قبل الانتهاء والتصعيد الآلي للإدارة ومسؤولي النظام عند تأخر إجراء التجديد، ثم يُحفظ السجل بضغطة واحدة.',
      actionLabelEn: 'Click "Save LG Record"',
      actionLabelAr: 'اضغط حفظ السجل "Save LG Record"',
      highlightsEn: ['Auto-bound reminders & manager escalation chain', 'Custom project category & contract reference'],
      highlightsAr: ['تنبيهات استباقية وسلسلة تصعيد تلقائية للمدير', 'ربط تصنيف المشروع ورقم العقد'],
      suggestDocPreview: false,
    },
    {
      step: 6,
      shortTabEn: '6. Custody Register',
      shortTabAr: '٦. سجل الحفظ والرادار',
      roleEn: 'Custody Portfolio & SLA Radar',
      roleAr: 'محفظة الضمانات ورادار المتابعة',
      headlineEn: 'Live in Custody with Automated Expiry & Bank-Reply Monitoring',
      headlineAr: 'إدراج مشفّر في المحفظة تحت مراقبة الاستحقاق وردود البنوك',
      guideEn: 'The guarantee is now indexed in Manage LG Records with a unique Custody Serial—continuously watched by Grow’s daily radar for upcoming maturities, print/delivery reminders, and overdue bank replies before rights lapse.',
      guideAr: 'يظهر الضمان فوراً في سجل الحفظ برقم تسلسلي فريد تحت المراقبة اليومية الآلية لمواعيد الاستحقاق وتذكيرات الطباعة والتسليم وتأخر ردود البنوك قبل سقوط أي حق مالي. اضغط أيقونة العرض لفتح ملف الضمان.',
      actionLabelEn: 'Click "View" Icon on LG-FNCB-2026-8840',
      actionLabelAr: 'اضغط أيقونة العرض لخطاب الضمان',
      highlightsEn: ['Daily expiry & overdue bank-reply SLA radar', 'Encrypted vault PDF & Excel portfolio export'],
      highlightsAr: ['مراقبة يومية للاستحقاق وتأخر ردود البنوك', 'حفظ مشفّر وتصدير فوري لتقارير المحفظة'],
      suggestDocPreview: false,
    },
    {
      step: 7,
      shortTabEn: '7. Live LG Cockpit',
      shortTabAr: '٧. لوحة التحكم والحوكمة',
      roleEn: 'Risk-Smart Lifecycle Control',
      roleAr: 'حوكمة ذكية لدورة حياة الضمان',
      headlineEn: 'Full Lifecycle Control — Direct Extensions, Maker-Checker & QR Letters',
      headlineAr: 'تحكم كامل بدورة الحياة — تمديد مباشر، اعتماد مزدوج، وخطابات QR',
      guideEn: 'Inside the LG Cockpit, treasurers see the live validity countdown, encrypted scan, and 1-click actions—where safe protective Extensions execute directly without delay, while Release, Decrease, Amendment, and Liquidation enforce strict Maker-Checker approval, QR-verified letters, and delivery/reply escalations.',
      guideAr: 'داخل لوحة الضمان يظهر عداد الصلاحية والمستند المشفّر وإجراءات دورة الحياة—حيث يُنفذ التمديد مباشرة دون تأخير لحماية حق الشركة، بينما يخضع الإفراج والتخفيض والتعديل والتسييل لاعتماد المراجع والمعتمد وخطابات QR الموثقة وتصعيد التأخير.',
      actionLabelEn: 'Continue to Tour 1.2: Action Center & Expiry Radar →',
      actionLabelAr: 'انتقل للجولة ١.٢: مركز الإجراءات والرادار ←',
      highlightsEn: [
        'Direct fast-track Extensions; Maker-Checker on Release, Decrease & Claim',
        'QR + Security Code bank letters & delivery/reply escalations',
      ],
      highlightsAr: [
        'تنفيذ مباشر للتمديد واعتماد مزدوج للإفراج والتخفيض والتسييل',
        'خطابات بنكية موثقة بـ QR وتصعيد تأخر التسليم أو رد البنك',
      ],
      suggestDocPreview: true,
    },
  ],

  'custody-action-center': [
    {
      step: 1,
      shortTabEn: '1. Action Radar',
      shortTabAr: '١. رادار المهام',
      roleEn: 'Proactive SLA & Escalation Engine',
      roleAr: 'محرك المتابعة والتصعيد الاستباقي',
      headlineEn: 'One Live Action Center Replacing Static Excel Trackers',
      headlineAr: 'مركز مهام استباقي موحد بدلاً من جداول الإكسيل ومخاطر السهو',
      guideEn:
        'Grow unifies four live operational queues—Pending Prints, Due Renewals, Awaiting Delivery, and Overdue Bank Replies—while multi-stage timers notify project owners ahead of expiry and automatically escalate inaction to line managers and Corporate Admins.',
      guideAr:
        'تجمع المنصة أربع قوائم تشغيلية حية: خطابات بانتظار الطباعة، وضمانات مستحقة التجديد، وتعليمات بانتظار التسليم، وردود بنوك متأخرة—مع إشعارات مبكرة لمسؤولي المشاريع وتصعيد تلقائي للمديرين ومسؤولي النظام عند التأخر.',
      actionLabelEn: 'Click "Auto Renewal" to Run Batch',
      actionLabelAr: 'اضغط "Auto Renewal" لمعاينة التجديد الجماعي',
      highlightsEn: [
        '4 live queues: Prints, Renewals, Delivery & Bank Replies',
        'Multi-stage owner reminders & manager/admin escalations',
      ],
      highlightsAr: [
        '٤ قوائم حية: الطباعة، التجديد، التسليم، وردود البنوك',
        'تنبيهات مبكرة للمسؤول وتصعيد تلقائي للمديرين عند التأخر',
      ],
      suggestDocPreview: false,
    },
    {
      step: 2,
      shortTabEn: '2. Auto-Renewal',
      shortTabAr: '٢. التجديد الجماعي',
      roleEn: 'Bulk Renewal & Cutoff Guardrail',
      roleAr: 'محرك التجديد الجماعي وحماية المهلة',
      headlineEn: 'Bulk Auto-Renewal Engine with Mandatory Cutoff Protection',
      headlineAr: 'محرك التجديد الجماعي مع قفل حماية الضمانات الحرجة',
      guideEn:
        'Grow automatically flags eligible expiring guarantees, locks urgent Mandatory Forced renewals within the critical cutoff window (≤ 15 days) while pre-selecting Proactive Auto-Renew items, calculates suggested new expiry dates, and compiles one combined PDF batch with full reprint history.',
      guideAr:
        'يفرز النظام الضمانات المقتربة من الانتهاء تلقائياً، ويؤمّن التجديدات الإلزامية العاجلة قرب انتهاء المهلة إلى جانب التجديدات الاستباقية، مع حساب التواريخ المقترحة وإصدار ملف PDF مجمع قابل لإعادة الطباعة في أي وقت.',
      actionLabelEn: 'Click "Confirm & Extend" to View Fast-Track Extension',
      actionLabelAr: 'اضغط "Confirm & Extend" لمعاينة التمديد الفوري',
      highlightsEn: [
        'Mandatory Forced lock near cutoff vs. Proactive Auto-Renew',
        'Combined print-ready PDF batch & full reprint audit history',
      ],
      highlightsAr: [
        'تمييز تلقائي للتجديد الإلزامي الحرج عن التجديد الاستباقي',
        'إصدار ملف PDF مجمع للطباعة مع سجل كامل لإعادة الطباعة',
      ],
      suggestDocPreview: false,
    },
    {
      step: 3,
      shortTabEn: '3. Direct Extend',
      shortTabAr: '٣. تمديد فوري',
      roleEn: 'Risk-Smart Fast-Track Execution',
      roleAr: 'تنفيذ حمائي مباشر بدون انتظار',
      headlineEn: 'Direct Protective Extension — Zero Maker-Checker Bottleneck',
      headlineAr: 'تمديد حمائي مباشر — بدون تعطيل في طوابير الاعتماد',
      guideEn:
        'Because extending an incoming guarantee protects your company without surrendering security, Grow executes Custody extensions directly without Maker-Checker delay—immediately generating a QR-sealed extension instruction letter (previewable in the "Extension PDF" tab).',
      guideAr:
        'لأن تمديد خطاب الضمان الوارد يحمي حق الشركة المالي دون التنازل عن أي غطاء، تنفذ المنصة التمديد مباشرة دون انتظار اعتماد المراجع والمعتمد، وتصدر فوراً خطاب تمديد موثقاً برمز QR (متاح في تبويب "خطاب التمديد").',
      actionLabelEn: 'Click "Extend LG" to Issue Instruction',
      actionLabelAr: 'اضغط "Extend LG" لإصدار خطاب التمديد فوراً',
      highlightsEn: [
        'Zero approval delay on company-favorable Custody extensions',
        'Instant QR + Security Code sealed bank extension letter',
      ],
      highlightsAr: [
        'تنفيذ مباشر للتمديد دون تأخير في دورة الموافقات',
        'إصدار فوري لخطاب تمديد بنكي مختوم برمز QR وكود أمان',
      ],
      suggestDocPreview: true,
    },
    {
      step: 4,
      shortTabEn: '4. Reply Radar',
      shortTabAr: '٤. رادار الردود',
      roleEn: 'Delivery & Bank-Reply SLA Tracker',
      roleAr: 'متابعة التسليم وتأخر ردود البنوك',
      headlineEn: 'Live Tracking for Undelivered Letters & Overdue Bank Replies',
      headlineAr: 'رادار حي للتعليمات غير المسلمة وردود البنوك المتأخرة',
      guideEn:
        'Printing a letter is only half the cycle. Action Center monitors every instruction awaiting branch delivery ("Days Pending") and tracks delivered instructions still awaiting written bank confirmation so nothing stalls silently at a bank counter.',
      guideAr:
        'طباعة الخطاب ليست نهاية الدورة؛ فالنظام يرصد كل خطاب لم يُسلم بعد لفرع البنك مع عداد أيام التأخير، ويتابع التعليمات المسلمة التي لم يصل رد البنك الرسمي بشأنها.',
      actionLabelEn: 'Click "Bulk Reminders" to Chase Overdue Banks',
      actionLabelAr: 'اضغط "Bulk Reminders" لإصدار استعجالات البنوك',
      highlightsEn: [
        'Separate SLA counters for courier delivery vs. bank reply',
        'Automated escalations before guarantee validity lapses',
      ],
      highlightsAr: [
        'عدادات مستقلة لتأخر التسليم وتأخر رد البنك الرسمي',
        'تصعيد آلي قبل فوات صلاحية الضمان أو سقوط الحق',
      ],
      suggestDocPreview: false,
    },
    {
      step: 5,
      shortTabEn: '5. Bank Chasers',
      shortTabAr: '٥. استعجال البنوك',
      roleEn: 'Automated Bank Follow-Up',
      roleAr: 'إصدار خطابات الاستعجال الرسمية',
      headlineEn: 'One-Click Official QR Bank Reminder Letters',
      headlineAr: 'إصدار خطابات استعجال رسمية للبنوك بضغطة واحدة',
      guideEn:
        'With a single click, Grow compiles all instructions exceeding your configured bank-reply SLA window and generates formal, QR-verified Bank Reminder Letters ready to print and dispatch to relationship banks.',
      guideAr:
        'بضغطة واحدة يحصر النظام كافة التعليمات التي تجاوزت مهلة الرد المحددة، ويصدر خطابات استعجال مصرفية رسمية موثقة برمز QR جاهزة للطباعة والإرسال للبنوك.',
      actionLabelEn: 'Continue to Tour 1.3: Lifecycle & QR Bank Letter →',
      actionLabelAr: 'انتقل للجولة ١.٣: الحوكمة وخطابات الـ QR ←',
      highlightsEn: [
        'Automatic detection of instructions past bank-reply SLA',
        'Consolidated QR-authenticated bank chaser PDF output',
      ],
      highlightsAr: [
        'حصر تلقائي للتعليمات المتجاوزة لمهلة رد البنك',
        'ملف استعجال رسمي موحد وموثق برمز QR للطباعة الفورية',
      ],
      suggestDocPreview: false,
    },
  ],

  'custody-lifecycle-letter': [
    {
      step: 1,
      shortTabEn: '1. AI Clause Audit',
      shortTabAr: '١. فحص النص بالذكاء',
      roleEn: 'AI Beneficiary Protection Check',
      roleAr: 'فاحص حماية المستفيد بالذكاء الاصطناعي',
      headlineEn: 'AI Beneficiary Protection Check & Governed Lifecycle Cockpit',
      headlineAr: 'فحص شروط حماية المستفيد بالذكاء الاصطناعي ولوحة الحوكمة',
      guideEn:
        'Inside the LG Cockpit, Grow’s AI Beneficiary Protection Check audits Arabic or English guarantee text to confirm URDG 758 and unconditional first-demand payment rights while warning early when physical original presentation is required. Above, the action bar governs Amend, Decrease, Release, and Liquidate.',
      guideAr:
        'داخل ملف الضمان يفحص الذكاء الاصطناعي نص الضمان بالعربية أو الإنجليزية لتأكيد التغطية بقواعد URDG 758 والدفع غير المشروط عند أول طلب، مع التحذير المبكر من شرط تقديم أصل الخطاب الورقي. اضغط تخفيض المبلغ بالأعلى.',
      actionLabelEn: 'Click "Decrease Amt" in the Lifecycle Bar',
      actionLabelAr: 'اضغط "Decrease Amt" لبدء تخفيض مرحلي',
      highlightsEn: [
        'AI clause check confirms unconditional payment & flags hurdles',
        'Central cockpit for Amend, Decrease, Release & Liquidate',
      ],
      highlightsAr: [
        'فحص ذكي يؤكد الدفع غير المشروط ويكشف قيود المطالبة مبكراً',
        'شريط موحد لإدارة التعديل والتخفيض والإفراج والتسييل',
      ],
      suggestDocPreview: false,
    },
    {
      step: 2,
      shortTabEn: '2. Maker Request',
      shortTabAr: '٢. طلب التخفيض',
      roleEn: 'Operations Specialist (Maker)',
      roleAr: 'أخصائي عمليات الخزانة (مُعدّ)',
      headlineEn: 'Risk-Smart Governance & Supporting Evidence Attachment',
      headlineAr: 'حوكمة المخاطر وإلزامية إرفاق المستندات المؤيدة',
      guideEn:
        'Unlike safe extensions, reducing, releasing, amending, or liquidating a guarantee impacts your financial security (and on Liquidation, Grow auto-injects mandatory claim wording). Reducing LG-8840 from EGP 4.5M to EGP 3.0M attaches the signed Milestone Certificate and routes strictly to Maker-Checker approval.',
      guideAr:
        'على عكس التمديد، يخضع التخفيض والإفراج والتعديل والتسييل لاعتماد المراجع والمعتمد الصارم (مع إدراج نص المطالبة الإلزامي تلقائياً عند التسييل). هنا نرفق شهادة الإنجاز المرحلي لتخفيض الضمان بمبلغ ١.٥ مليون ج.م وإحالته للاعتماد.',
      actionLabelEn: 'Click "Submit Decrease Request"',
      actionLabelAr: 'اضغط "Submit Decrease Request" لإحالة الطلب للاعتماد',
      highlightsEn: [
        'Calculates remaining balance (EGP 3,000,000.00) live',
        'Attaches Milestone Certificate & routes to Checker queue',
      ],
      highlightsAr: [
        'حساب فوري للرصيد المتبقي بعد التخفيض (٣,٠٠٠,٠٠٠ ج.م)',
        'إرفاق شهادة الإنجاز المرحلي وإحالة إلزامية للمعتمد',
      ],
      suggestDocPreview: false,
    },
    {
      step: 3,
      shortTabEn: '3. Checker Queue',
      shortTabAr: '٣. طابور الاعتماد',
      roleEn: 'Corporate Admin / Checker',
      roleAr: 'مسؤول الشركة / المعتمد',
      headlineEn: 'Zero Self-Approval: Independent Sign-Off in the Approval Center',
      headlineAr: 'فصل صارم في الصلاحيات ومنع الاعتماد الذاتي',
      guideEn:
        'No single user can both request and approve a guarantee reduction or release. Signing in as Corporate Admin surfaces the pending LG Decrease Amount request in the Approval Center with Maker identity, submission timestamp, and automatic escalation timers if review stalls.',
      guideAr:
        'لا يمكن لمستخدم واحد طلب واعتماد تخفيض أو إفراج الضمان بمفرده؛ فعند الدخول بحساب المعتمد يظهر طلب التخفيض معلقاً في مركز الموافقات مع هوية مُقدّم الطلب وتوقيت التقديم وتصعيد آلي في حال تأخر المراجعة.',
      actionLabelEn: 'Click the "View" Eye Icon to Inspect Request',
      actionLabelAr: 'اضغط أيقونة الفحص لمراجعة تفاصيل الطلب',
      highlightsEn: [
        'Strict Maker ≠ Checker segregation of duties',
        'Automated approval reminders & SLA escalation tracking',
      ],
      highlightsAr: [
        'منع الاعتماد الذاتي وفصل تام بين المُعدّ والمعتمد',
        'تذكيرات وتصعيد آلي عند تأخر البت في طلبات الاعتماد',
      ],
      suggestDocPreview: false,
    },
    {
      step: 4,
      shortTabEn: '4. Snapshot Review',
      shortTabAr: '٤. فحص وموافقة',
      roleEn: 'Corporate Admin / Checker',
      roleAr: 'مسؤول الشركة / المعتمد',
      headlineEn: 'Supporting Evidence & Snapshot-vs-Current Integrity Check',
      headlineAr: 'معاينة المستند المؤيد وفحص سلامة بيانات الضمان قبل الاعتماد',
      guideEn:
        'The Checker reviews the exact EGP 1,500,000 decrease details, contractual justification, 1-click Supporting Document link, and a live Snapshot-vs-Current comparison grid proving no guarantee fields drifted after submission.',
      guideAr:
        'يراجع المعتمد تفاصيل التخفيض بمبلغ ١.٥ مليون ج.م ومبررات الطلب ورابط فتح شهادة الإنجاز المرفقة، مع جدول مقارنة حالة السجل وقت التقديم بالحالة الحالية لضمان عدم تغيّر أي بيانات.',
      actionLabelEn: 'Click "Approve" to Authorize & Issue Letter',
      actionLabelAr: 'اضغط "Approve" للاعتماد وإصدار خطاب البنك',
      highlightsEn: [
        '1-click access to encrypted Milestone Completion Certificate',
        'Snapshot vs. Current integrity check prevents mid-flight drift',
      ],
      highlightsAr: [
        'فتح فوري لشهادة الإنجاز المرفقة من داخل نافذة الاعتماد',
        'مقارنة Snapshot بالحالة الحالية لمنع أي تعارض في البيانات',
      ],
      suggestDocPreview: false,
    },
    {
      step: 5,
      shortTabEn: '5. QR Bank Letter',
      shortTabAr: '٥. خطاب الـ QR',
      roleEn: 'Tamper-Evident Bank Output',
      roleAr: 'محرك الخطابات البنكية المؤمّنة',
      headlineEn: 'Auto-Generated Bank Letter with QR Seal & 4-Digit Security Code',
      headlineAr: 'إصدار خطاب البنك مختوماً برمز QR وكود أمان رباعي',
      guideEn:
        'Approval immediately generates the formal Decrease Amount letter to First National Corporate Bank, injecting a non-bypassable authenticity footer with an HMAC-SHA256 signed QR code and 4-digit Security Code (also inspectable in the "QR Letter PDF" tab).',
      guideAr:
        'فور الاعتماد يصدر النظام خطاب التخفيض الرسمي الموجه لبنك FNCB مختوماً بشريط تحقق إجباري يضم رمز QR موقعاً رقمياً بـ HMAC-SHA256 وكود أمان رباعي (متاح أيضاً في تبويب "خطاب البنك الموثق").',
      actionLabelEn: 'Click the QR Security Footer to Test Bank Verification',
      actionLabelAr: 'اضغط على شريط الـ QR بالأسفل لتجربة تحقق موظف البنك',
      highlightsEn: [
        'HMAC-SHA256 signed QR token + split 4-digit Security Code',
        'Non-bypassable security footer injected into every print/PDF',
      ],
      highlightsAr: [
        'رمز QR موقع رقمياً مع كود أمان رباعي منفصل بالتذييل',
        'شريط أمان إجباري غير قابل للحذف في الطباعة أو الـ PDF',
      ],
      suggestDocPreview: true,
    },
    {
      step: 6,
      shortTabEn: '6. Public Verify',
      shortTabAr: '٦. بوابة التحقق',
      roleEn: 'Receiving Bank Officer (Public Portal)',
      roleAr: 'موظف البنك المستلم (بوابة التحقق العامة)',
      headlineEn: 'Instant Anti-Forgery Verification on the Public Bank Portal',
      headlineAr: 'بوابة التحقق الفوري لموظفي البنوك ضد أي تلاعب ورقي',
      guideEn:
        'Scanning the QR code opens Grow’s public portal. Entering the last 2 characters of the LG number from the letter body ("40") plus the 4-digit Security Code from the footer defeats cut-and-paste tampering—displaying "VERIFIED GENUINE CORPORATE INSTRUCTION" for the amended EGP 3,000,000 balance.',
      guideAr:
        'عند مسح رمز الـ QR تفتح بوابة التحقق العامة، ويدخل موظف البنك آخر رقمين من رقم الضمان بمتن الخطاب (40) مع كود الأمان الرباعي بالتذييل لمنع أي قص أو تزوير، فتظهر شهادة خضراء تؤكد صحة التعليمات والرصيد المعدل (٣ ملايين ج.م).',
      actionLabelEn: 'Continue to Tour 1.4: Delivery & AI Bank Reply →',
      actionLabelAr: 'انتقل للجولة ١.٤: إثبات التسليم والتحقق الذكي من رد البنك ←',
      highlightsEn: [
        'Zero-login public portal built for bank trade-finance desks',
        'Split body + footer challenge defeats cut-and-paste forgery',
      ],
      highlightsAr: [
        'بوابة عامة فورية لموظفي البنوك دون الحاجة لحساب دخول',
        'ربط متن الخطاب بالتذييل يمنع أي محاولة قص أو تلاعب ورقي',
      ],
      suggestDocPreview: false,
    },
  ],

  'custody-delivery-reply': [
    {
      step: 1,
      shortTabEn: '1. In-Flight Banner',
      shortTabAr: '١. متابعة التسليم',
      roleEn: 'Operations Specialist (Maker)',
      roleAr: 'أخصائي عمليات الخزانة',
      headlineEn: 'Live In-Flight Instruction Banner Inside Every LG Cockpit',
      headlineAr: 'شريط تتبع حي للتعليمات الجارية داخل ملف الضمان',
      guideEn:
        'As soon as an instruction letter is issued, an amber In-Flight Instruction banner stays pinned inside the guarantee cockpit showing "Awaiting Bank Delivery"—ensuring printed letters never vanish in courier transit.',
      guideAr:
        'بمجرد إصدار خطاب التعليمات يظل شريط التنبيه الذهبي مثبتاً بأعلى ملف الضمان بحالة "بانتظار التسليم للبنك" لضمان عدم ضياع أي خطاب مطبوع أثناء المراسلة.',
      actionLabelEn: 'Click "Record Delivery" to Upload Stamped Copy',
      actionLabelAr: 'اضغط "Record Delivery" لرفع صورة ختم الاستلام',
      highlightsEn: [
        'Pinned cockpit banner tracks open instructions in real time',
        'Prevents printed bank letters from stalling unrecorded',
      ],
      highlightsAr: [
        'شريط تتبع واضح بأعلى ملف الضمان لكل تعليمة مفتوحة',
        'يمنع بقاء الخطابات المطبوعة معلقة دون إثبات تسليم',
      ],
      suggestDocPreview: false,
    },
    {
      step: 2,
      shortTabEn: '2. AI Stamp Check',
      shortTabAr: '٢. فحص ختم البنك',
      roleEn: 'Bank Delivery Proof Verifier',
      roleAr: 'فاحص أختام الاستلام البنكية',
      headlineEn: 'Verifies Physical Bank Receiving Stamp & Fixes Date Typos in 1 Click',
      headlineAr: 'التحقق الذكي من ختم استلام البنك ومطابقة التاريخ بضغطة واحدة',
      guideEn:
        'Uploading the bank-stamped copy runs 4 instant checks: blocks duplicate receipt reuse, confirms LG number and FNCB bank identity, and reads the physical branch receiving stamp—catching that the bank stamped 2026-11-13 while 2026-11-14 was typed, with a 1-click "Align Date" fix.',
      guideAr:
        'عند رفع الصورة المختومة يمنع النظام إعادة استخدام إيصال قديم، ويطابق رقم الضمان واسم البنك وختم وارد الفرع الفعلي—مكتشفاً أن تاريخ ختم البنك هو ١٣ نوفمبر بينما أُدخل ١٤ نوفمبر مع زر مطابقة التاريخ بضغطة واحدة.',
      actionLabelEn: 'Click "Align Date to 2026-11-13" to Confirm',
      actionLabelAr: 'اضغط "Align Date to 2026-11-13" لاعتماد تاريخ الختم الفعلي',
      highlightsEn: [
        'Verifies physical bank receiving stamp & blocks duplicate uploads',
        'Catches stamp-vs-typed date mismatch with 1-click alignment',
      ],
      highlightsAr: [
        'فحص آلي لختم وارد الفرع ورقم الضمان ومنع تكرار الإيصالات',
        'اكتشاف فرق التاريخ بين الختم والإدخال ومطابقته بضغطة واحدة',
      ],
      suggestDocPreview: false,
    },
    {
      step: 3,
      shortTabEn: '3. Awaiting Reply',
      shortTabAr: '٣. بانتظار رد البنك',
      roleEn: 'Automated Bank Follow-Up Timer',
      roleAr: 'مؤقت متابعة الرد البنكي',
      headlineEn: 'Banner Advances to "Delivered — Awaiting Bank Reply"',
      headlineAr: 'انتقال الحالة تلقائياً إلى "تم التسليم — بانتظار رد البنك"',
      guideEn:
        'Once the stamped receipt is sealed in the encrypted vault, the cockpit banner turns teal ("Delivered — Awaiting Bank Reply") and starts counting bank turnaround days until the official amendment advice arrives.',
      guideAr:
        'فور حفظ إيصال التسليم المختوم في الأرشيف المشفر يتحول الشريط تلقائياً إلى حالة "تم التسليم — بانتظار رد البنك" ويبدأ احتساب مهلة الرد حتى وصول الإشعار الرسمي.',
      actionLabelEn: 'Click "Record Bank Reply" to Verify Bank Advice',
      actionLabelAr: 'اضغط "Record Bank Reply" لفحص إشعار البنك الرسمي',
      highlightsEn: [
        'Stamped delivery proof archived in encrypted document vault',
        'Automatic transition to bank-reply SLA monitoring',
      ],
      highlightsAr: [
        'أرشفة مشفرة لصورة إيصال التسليم المختوم من البنك',
        'تفعيل تلقائي لعداد متابعة وصول إشعار البنك الرسمي',
      ],
      suggestDocPreview: false,
    },
    {
      step: 4,
      shortTabEn: '4. AI Reply Audit',
      shortTabAr: '٤. مطابقة رد البنك',
      roleEn: 'AI Bank Reply Verification Engine',
      roleAr: 'محرك المطابقة الذكية لردود البنوك',
      headlineEn: 'AI Cross-Check & Banking Calendar Tolerance Intelligence',
      headlineAr: 'مطابقة إشعار البنك بالذكاء الاصطناعي وفهم فروق أيام العمل',
      guideEn:
        'Uploading FNCB’s Official Extension Advice (viewable in "Bank Reply PDF") verifies LG number, bank seal, and amended terms. Because the bank shifted expiry +2 days to the next business day (2027-05-28), Grow flags a friendly ≤ 3-day Calendar Convention Variance—whereas major amount/date deviations route to Corporate Admin approval.',
      guideAr:
        'عند رفع إشعار التمديد الرسمي من بنك FNCB (متاح في تبويب "رد البنك الرسمي") يطابق الذكاء الاصطناعي رقم الضمان والختم والشروط؛ ولأن البنك رحّل الانتهاء يومين لأقرب يوم عمل مصرفي يصنفه النظام كفرق تقويم مسموح (≤ ٣ أيام)، بينما تُحال الفروق الجوهرية لاعتماد المسؤول.',
      actionLabelEn: 'Click "Inspect Scan" to Open Split-Screen Auditor',
      actionLabelAr: 'اضغط "Inspect Scan" لفتح عارض الفحص المزدوج',
      highlightsEn: [
        'Smart ≤ 3-day banking calendar convention tolerance alignment',
        'Major amount or > 3-day bank discrepancies escalate to Admin',
      ],
      highlightsAr: [
        'معالجة ذكية لفروق عطلات البنوك (حتى ٣ أيام تقويمية)',
        'إحالة تلقائية للفروق الجوهرية في المبلغ أو التاريخ لاعتماد المسؤول',
      ],
      suggestDocPreview: true,
    },
    {
      step: 5,
      shortTabEn: '5. Split Inspector',
      shortTabAr: '٥. الفحص المزدوج',
      roleEn: 'Side-by-Side Visual & AI Auditor',
      roleAr: 'عارض المراجعة البصرية والذكية المزدوج',
      headlineEn: 'Split-Screen Document & AI Verification Inspector',
      headlineAr: 'عارض الفحص المزدوج لمستند البنك ونتائج التحقق الذكي',
      guideEn:
        'The split-screen Document Inspector displays the scanned FNCB Official Extension Advice side by side with all 4 verified AI checks and the +2d calendar variance—allowing 1-click alignment of the guarantee expiry to 2027-05-28.',
      guideAr:
        'تعرض نافذة الفحص المزدوجة صورة إشعار البنك الرسمي جنباً إلى جنب مع نقاط التحقق الأربع وفرق التقويم المصرفي، مما يتيح اعتماد ومطابقة تاريخ الصلاحية المؤكد من البنك بضغطة واحدة.',
      actionLabelEn: 'Click "Accept & Align to 2027-05-28"',
      actionLabelAr: 'اضغط "Accept & Align to 2027-05-28" لاعتماد تاريخ البنك',
      highlightsEn: [
        'Side-by-side bank scan + structured AI audit checklist',
        '1-click alignment updates LG master expiry accurately',
      ],
      highlightsAr: [
        'عرض مزدوج لصورة إشعار البنك وقائمة الفحص الذكي',
        'تحديث فوري ودقيق لتاريخ انتهاء الضمان الأساسي بضغطة واحدة',
      ],
      suggestDocPreview: false,
    },
    {
      step: 6,
      shortTabEn: '6. Closed Loop',
      shortTabAr: '٦. الأرشيف المتكامل',
      roleEn: 'Immutable Audit & Vault Timeline',
      roleAr: 'السجل التاريخي والأرشيف المشفر',
      headlineEn: 'Closed-Loop Lifecycle History & Auditor-Ready Evidence Trail',
      headlineAr: 'إغلاق الدورة الرقابية وأرشفة كافة المستندات في سجل واحد',
      guideEn:
        'The guarantee now reflects 194 days remaining (May 28th, 2027), and Lifecycle History links every step—LG Expiry Aligned to Bank Convention, Record Bank Reply, Stamped Delivery Receipt, and Original QR Instruction—in one tamper-evident audit timeline.',
      guideAr:
        'يظهر الضمان الآن بصلاحية محدثة (٢٨ مايو ٢٠٢٧)، ويربط تبويب السجل التاريخي كافة الحركات والمستندات—من خطاب التعليمات وإيصال التسليم المختوم إلى إشعار رد البنك ومطابقة التقويم—في مسار مراجعة مشفر ومتكامل.',
      actionLabelEn: 'Custody Tours Complete — Back to All Modules',
      actionLabelAr: 'اكتملت جولات الحفظ — العودة لكافة الوحدات',
      highlightsEn: [
        'Links QR Instruction + Stamped Delivery + Verified Bank Advice',
        'Immutable user & timestamp audit log ready for external auditors',
      ],
      highlightsAr: [
        'ربط متكامل لخطاب التعليمات وإيصال التسليم وإشعار رد البنك',
        'سجل مراجعة غير قابل للتعديل جاهز للمراجعين الداخليين والخارجيين',
      ],
      suggestDocPreview: false,
    },
  ],
  "issuance-intake": [
    {
        "step": 1,
        "shortTabEn": "1. Dept Portal",
        "shortTabAr": "١. بوابة الإدارات",
        "roleEn": "Project / Bid Manager (Requestor)",
        "roleAr": "مدير المشروع / العطاءات (طالب الإصدار)",
        "headlineEn": "Self-Service Department Portal — End Email & WhatsApp Chaos",
        "headlineAr": "بوابة رقمية للإدارات لطلب خطابات الضمان الصادرة",
        "guideEn": "Unlike Custody (incoming supplier guarantees), Outgoing Issuance starts when your project or tender team needs your bank to issue a guarantee to a client. Departments submit and track requests through a secure 6-digit OTP portal without needing treasury seats.",
        "guideAr": "على عكس وحدة الحفظ (الضمانات الواردة من الموردين)، تبدأ وحدة الإصدار عندما تحتاج إدارة المشروعات لإصدار خطاب ضمان بنكي من تسهيلات الشركة لصالح جهة عميلة؛ حيث ترفع الإدارة طلبها وتتابعه عبر بوابة مؤمّنة دون فوضى البريد الإلكتروني.",
        "actionLabelEn": "Click \"New Request\" to Launch Wizard",
        "actionLabelAr": "اضغط \"New Request\" لبدء معالج الطلب",
        "highlightsEn": [
            "Dedicated portal for outgoing corporate guarantee requests",
            "Live status visibility eliminates email & phone follow-ups"
        ],
        "highlightsAr": [
            "بوابة مخصصة لطلبات إصدار ضمانات الشركة لصالح العملاء",
            "متابعة لحظية لحالة الطلب تمنع مراسلات الاستعجال اليدوية"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Request Wizard",
        "shortTabAr": "٢. معالج الطلب",
        "roleEn": "Project / Bid Manager (Requestor)",
        "roleAr": "مدير المشروع / العطاءات (طالب الإصدار)",
        "headlineEn": "Structured 4-Step Outgoing Guarantee Wizard",
        "headlineAr": "معالج منظم من ٤ خطوات لبيانات المستفيد والعقد",
        "guideEn": "The guided 4-step wizard captures the external Beneficiary Authority, Contract Award reference, Guarantee Type (Bid, Advance Payment, or Performance), Amount, Tenor, and attaches the underlying contract or special bank wording.",
        "guideAr": "يوجه المعالج طالب الإصدار لإدخال بيانات الجهة المستفيدة ورقم العقد ونوع الضمان الصادر (ابتدائي أو دفعة مقدمة أو نهائي) والمبلغ والمدة مع إرفاق خطاب الترسية أو صياغة المستفيد الخاصة.",
        "actionLabelEn": "Click \"Next\" to Submit to Treasury Inbox",
        "actionLabelAr": "اضغط \"Next\" لإرسال الطلب لخزانة الشركة",
        "highlightsEn": [
            "Standardizes beneficiary, contract, tenor & wording attachments",
            "Supports cross-currency guarantees & urgent tender deadlines"
        ],
        "highlightsAr": [
            "توحيد بيانات المستفيد والعقد والمدة ومرفقات الصياغة",
            "دعم الضمانات متعددة العملات ومواعيد المناقصات العاجلة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. AI Award Check",
        "shortTabAr": "٣. فحص العقد ذكياً",
        "roleEn": "Treasury Issuance Specialist + Document AI",
        "roleAr": "أخصائي الإصدار + الذكاء الاصطناعي للمستندات",
        "headlineEn": "AI Contract Award Verifier Cross-Checks Every Term",
        "headlineAr": "مطابقة خطاب الترسية بالذكاء الاصطناعي مع بيانات الطلب",
        "guideEn": "Inside Treasury’s Issuance Inbox, clicking \"Verified\" opens Grow’s AI Contract Check—confirming 8/8 alignment between the uploaded NAUUA Contract Award PDF and the requested EGP 12,000,000 Advance Payment Guarantee before consuming credit limits.",
        "guideAr": "داخل صندوق طلبات الخزانة، يفتح زر التحقق نتيجة الفحص الذكي لخطاب الترسية المرفق (تطابق ٨ من ٨ بنود) للتأكد من توافق مبلغ الـ ١٢ مليون جنيه والجهة المستفيدة ونسبة الضمان قبل استهلاك التسهيل الائتماني.",
        "actionLabelEn": "Inspect Verified Contract Fields",
        "actionLabelAr": "راجع مطابقة بنود العقد بالذكاء الاصطناعي",
        "highlightsEn": [
            "Cross-checks beneficiary, contract value, LG % & expiry against PDF",
            "Catches over-amount or wrong-entity errors before bank submission"
        ],
        "highlightsAr": [
            "مطابقة آلية للمستفيد وقيمة العقد ونسبة الضمان والمدة مع المستند",
            "منع إصدار ضمانات بمبالغ زائدة أو بيانات مستفيد خاطئة"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 4,
        "shortTabEn": "4. Duplicate Guard",
        "shortTabAr": "٤. كاشف التكرار",
        "roleEn": "Duplicate LG & Commission Shield",
        "roleAr": "درع منع تكرار الإصدار والعمولات",
        "headlineEn": "Stop Accidental Duplicate Guarantees & Double Bank Commissions",
        "headlineAr": "حاجز ذكي لكشف التكرار ومنع ازدواج العمولات البنكية",
        "guideEn": "Before approval, Grow checks the request against active outgoing guarantees—flagging related contract guarantee LG-APEX-2026-408A so treasury confirms this is a new Advance Payment LG rather than a costly duplicate submission.",
        "guideAr": "قبل الاعتماد، يقارن النظام الطلب آلياً بالضمانات الصادرة القائمة على نفس العقد أو المستفيد، وينبه لوجود الضمان المرتبط (LG-APEX-2026-408A) لمنع تكرار الإصدار بالخطأ أو حجز حدود التسهيل مرتين.",
        "actionLabelEn": "Review Similarity Match & Scroll to Trap Scan",
        "actionLabelAr": "راجع نتيجة فحص التكرار وانتقل لفحص الصياغة",
        "highlightsEn": [
            "Cross-checks beneficiary, contract ref, LG type & amount automatically",
            "Stops accidental double commissions and duplicate credit lockups"
        ],
        "highlightsAr": [
            "فحص تشابه المستفيد ورقم العقد ونوع الضمان والمبلغ",
            "منع ازدواج العمولات البنكية واستنزاف حدود التسهيلات"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Wording Risk Check",
        "shortTabAr": "٥. كاشف مخاطر الصياغة",
        "roleEn": "Client Wording Risk Shield",
        "roleAr": "درع حماية الشركة من شروط المستفيد",
        "headlineEn": "Catch Unfair Client Wording Traps Before You Commit Credit",
        "headlineAr": "كشف شروط المستفيد الخطرة واقتراح صياغة بديلة تحمي الشركة",
        "guideEn": "When a client insists on custom LG text, Grow reviews the draft from your company’s side—flagging a RED 78/100 risk score for a missing Non-Operative advance-receipt clause and an Extend-or-Pay trap, complete with safe counter-wording to send back.",
        "guideAr": "عند اشتراط العميل صياغة خاصة للضمان، يفحصها الذكاء الاصطناعي من منظور حماية شركتك كطالب إصدار—كاشفاً درجة مخاطر مرتفعة (٧٨/١٠٠) لغياب شرط عدم السريان لحين دخول الدفعة المقدمة وشرط الدفع أو التمديد، مع اقتراح نص بديل آمن.",
        "actionLabelEn": "Review Protective Rewording & Route for Approval",
        "actionLabelAr": "راجع الصياغة البديلة المقترحة وأرسل للموافقة",
        "highlightsEn": [
            "Catches missing Non-Operative & Extend-or-Pay liquidation traps",
            "Generates ready-to-negotiate protective clauses in seconds"
        ],
        "highlightsAr": [
            "فحص مخصص لحماية الشركة من مخاطر التسييل غير المشروط",
            "توليد صياغة تعاقدية بديلة تحمي الشركة قبل مخاطبة البنك"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 6,
        "shortTabEn": "6. Credit Matrix",
        "shortTabAr": "٦. مصفوفة الاعتماد",
        "roleEn": "Corporate Admin / Credit Approver",
        "roleAr": "المعتمد الائتماني / مسؤول النظام",
        "headlineEn": "Configurable Sequential Credit Approval Matrix",
        "headlineAr": "اعتماد ائتماني متدرج مع منع الاعتماد الذاتي وتنبيهات التأخير",
        "guideEn": "Because every new outgoing LG commits corporate credit lines and bank commissions, Grow enforces your sequential Credit Approval Matrix by amount, department, and cross-border risk—blocking self-approval and escalating overdue steps.",
        "guideAr": "لأن كل ضمان صادر جديد يرتب التزاماً ائتمانياً وعمولات بنكية على الشركة، يطبق النظام مصفوفة موافقات متدرجة حسب المبلغ والإدارة، مع منع الاعتماد الذاتي وتصعيد أي تأخر في المراجعة تلقائياً.",
        "actionLabelEn": "Click \"Approve\" — Continue to Facility Scoring (2.2)",
        "actionLabelAr": "اضغط \"Approve\" — انتقل لتقييم التسهيلات (٢.٢)",
        "highlightsEn": [
            "Multi-step approval routing by amount tier, entity & risk rules",
            "Strict Maker-Checker separation with automated SLA escalations"
        ],
        "highlightsAr": [
            "مسارات اعتماد متعددة المستويات حسب شرائح المبالغ والكيانات",
            "فصل صارم بين المعد والمعتمد مع تصعيد تلقائي عند التأخر"
        ],
        "suggestDocPreview": false
    }
],
  "issuance-facility-scoring": [
    {
        "step": 1,
        "shortTabEn": "1. Credit Lines",
        "shortTabAr": "١. محافظ التسهيلات",
        "roleEn": "Corporate Treasurer / Admin",
        "roleAr": "مدير الخزانة / مسؤول التسهيلات",
        "headlineEn": "Live Multi-Bank Credit Umbrella & Sub-Limit Visibility",
        "headlineAr": "رؤية لحظية لمحافظ التسهيلات الائتمانية والحدود الفرعية بالبنوك",
        "guideEn": "Grow tracks all corporate LG credit facilities across First National Corporate Bank (FNCB), Mediterranean Commercial Bank (MCB), and Nile Sovereign Bank (NSB)—monitoring utilized exposure, cash margin relief, and foreign-currency revaluation buffers.",
        "guideAr": "تتابع المنصة كافة عقود التسهيلات الائتمانية لخطابات الضمان لدى البنوك المتعاملة، مع حساب فوري للمستخدم والمتاح الفعلي بعد استبعاد الغطاء النقدي واحتساب هامش تذبذب العملات الأجنبية.",
        "actionLabelEn": "Upload Signed Agreement to Verify Terms with AI",
        "actionLabelAr": "ارفع عقد التسهيل البنكي لمطابقة الشروط ذكياً",
        "highlightsEn": [
            "Tracks umbrella limits, type sub-limits, commissions & cash margins",
            "Deducts cash-covered portions 1:1 to maximize usable bank headroom"
        ],
        "highlightsAr": [
            "متابعة الحدود الكلية والفرعية ونسب العمولات والغطاء النقدي",
            "احتساب أثر الغطاء النقدي لتعظيم الرصيد الائتماني المتاح"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. AI Agreement Audit",
        "shortTabAr": "٢. مطابقة عقد البنك",
        "roleEn": "AI Credit Facility Auditor",
        "roleAr": "محرك فحص عقود التسهيلات البنكية",
        "headlineEn": "AI Cross-Checks Bank Facility Agreements Against System Rules",
        "headlineAr": "مطابقة عقد التسهيل البنكي الموقّع مع إعدادات النظام بالذكاء الاصطناعي",
        "guideEn": "Uploading FNCB’s signed Credit Facility Agreement (viewable in the PDF tab) verifies Total Limit, Sub-Limits, 0.85% p.a. Commission, 0% Sovereign Cash Margin, and 1-Day SLA—eliminating setup typos that distort pricing.",
        "guideAr": "عند رفع عقد التسهيل الموقّع مع بنك FNCB (متاح في تبويب المستند)، يطابق الذكاء الاصطناعي الحد الكلي والفرعي ونسبة العمولة (٠.٨٥٪ سنوياً) والإعفاء من الغطاء النقدي ومهلة التنفيذ لضمان دقة التسعير.",
        "actionLabelEn": "Open Approved Request to See 0–100 Bank Ranking",
        "actionLabelAr": "افتح الطلب المعتمد لعرض ترتيب البنوك الذكي",
        "highlightsEn": [
            "Zero-mismatch verification of limits, tariffs, cash margin & SLA",
            "Extracts special contractual clauses like FX buffer & margin relief"
        ],
        "highlightsAr": [
            "تطابق كامل للحدود والعمولات والغطاء النقدي ومهلة التنفيذ",
            "استخراج الشروط الخاصة في عقد البنك وتوثيقها تلقائياً"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 3,
        "shortTabEn": "3. 0–100 Scoring",
        "shortTabAr": "٣. التقييم ٠–١٠٠",
        "roleEn": "Smart Cash-Margin & Bank Speed Ranking",
        "roleAr": "المفاضلة الذكية للتكلفة والغطاء النقدي والسرعة",
        "headlineEn": "Rank Banks 0–100 by Lowest Fee, 0% Cash Margin & Real Speed",
        "headlineAr": "ترتيب فوري للبنوك من ٠ إلى ١٠٠ حسب التكلفة والغطاء والسرعة الفعلية",
        "guideEn": "For the approved EGP 12,000,000 request, Grow ranks every eligible bank from 0 to 100 across Commission Cost, Cash Margin %, Real Historical Bank Speed (actual business-day turnaround vs promised SLA), Available Headroom, Currency, and Scarce Line Preservation.",
        "guideAr": "للطلب المعتمد بقيمة ١٢ مليون جنيه، يرتب النظام البنوك المؤهلة من ٠ إلى ١٠٠ بناءً على ستة عوامل: أقل عمولة، وأقل غطاء نقدي، وسرعة البنك الفعلية المحسوبة تاريخياً، والرصيد المتاح، والعملة، والحفاظ على الخطوط النادرة.",
        "actionLabelEn": "Click \"Issue LG\" to Compare Pipeline Headroom",
        "actionLabelAr": "اضغط \"Issue LG\" لمراجعة الرصيد وحجز التسهيل",
        "highlightsEn": [
            "Measures each bank’s real historical turnaround speed vs promised SLA",
            "Preserves scarce project or FX lines when a general facility fits"
        ],
        "highlightsAr": [
            "دمج مهلة البنك التعاقدية مع متوسط سرعة التنفيذ الفعلي تاريخياً",
            "الحفاظ على التسهيلات المخصصة للمشاريع عند توفر تسهيل عام مناسب"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Select Best Bank",
        "shortTabAr": "٤. اختيار البنك الأمثل",
        "roleEn": "Treasury Execution Officer",
        "roleAr": "مسؤول تنفيذ الإصدار بالخزانة",
        "headlineEn": "Transparent Cost, Margin & Pipeline Headroom Comparison",
        "headlineAr": "مقارنة شفافة للتكلفة والرصيد المتاح بعد خصم الطلبات الجارية",
        "guideEn": "Inside the Execution Wizard, First National Corporate Bank ranks #1 (★ Best · Preserves Rare Lines · Low Cost · Available: EGP 81,500,000) ahead of MCB and NSB—saving thousands in annual commissions and keeping 0% cash tied up.",
        "guideAr": "داخل معالج التنفيذ، يتصدر بنك FNCB المركز الأول بأقل عمولة وصفر غطاء نقدي ورصيد متاح ٨١.٥ مليون جنيه متفوقاً على البنوك الأخرى—مما يحقق وفراً مباشراً في المصروفات التمويلية ويحافظ على سيولة الشركة.",
        "actionLabelEn": "Select FNCB & Lock Facility Reservation",
        "actionLabelAr": "اختر بنك FNCB واحجز الرصيد الائتماني",
        "highlightsEn": [
            "FNCB ranked #1: 0.85% commission, 0% cash margin & EGP 81.5M free",
            "Accounts for pending pipeline reservations across concurrent users"
        ],
        "highlightsAr": [
            "بنك FNCB بالمركز الأول بأقل تكلفة وصفر غطاء نقدي محجوز",
            "احتساب فوري للحجوزات الجارية لمنع تجاوز سقف التسهيل"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Credit Lock",
        "shortTabAr": "٥. الحجز الائتماني",
        "roleEn": "Real-Time Credit Limit Protection",
        "roleAr": "حماية سقف التسهيلات الائتمانية لحظياً",
        "headlineEn": "Instant Credit Reservation Prevents Accidental Limit Overruns",
        "headlineAr": "قفل فوري للرصيد المحجوز يمنع تجاوز حدود التسهيل البنكي",
        "guideEn": "One click locks EGP 12,000,000 as FACILITY RESERVED on FNCB’s credit line before bank papers are printed—so parallel treasury officers always see exact remaining capacity and never accidentally breach a bank limit.",
        "guideAr": "بضغطة واحدة تنتقل حالة الطلب إلى (تم حجز التسهيل) ليتم تجنيب مبلغ ١٢ مليون جنيه لحظياً من سقف بنك FNCB قبل طباعة المستندات، مما يضمن دقة الأرصدة المتاحة لكافة أعضاء فريق الخزانة.",
        "actionLabelEn": "Click \"Proceed to Issue\" — Continue to Bank Form (2.3)",
        "actionLabelAr": "اضغط \"Proceed to Issue\" — انتقل لتعبئة استمارة البنك (٢.٣)",
        "highlightsEn": [
            "Instant credit reservation prevents concurrent facility overruns",
            "Full audit trail of bank selection score & cost justification"
        ],
        "highlightsAr": [
            "حجز لحظي يمنع تجاوز السقف الائتماني عند تعدد العمليات",
            "توثيق كامل لمبررات اختيار البنك الأقل تكلفة لأغراض المراجعة"
        ],
        "suggestDocPreview": false
    }
],
  "issuance-bank-form": [
    {
        "step": 1,
        "shortTabEn": "1. Issuance Method",
        "shortTabAr": "١. قناة الإصدار",
        "roleEn": "Treasury Execution Officer",
        "roleAr": "مسؤول تنفيذ الإصدار بالخزانة",
        "headlineEn": "Flexible Execution: Official Bank PDF Form or Corporate Letter",
        "headlineAr": "قنوات تنفيذ مرنة: استمارة البنك الرسمية أو خطاب الشركة المعتمد",
        "guideEn": "With the credit limit reserved, Grow supports Official Fillable Bank PDF Forms, Corporate Template Letters (EN/AR), or Bank Portal handoffs. Here we select \"Fill Bank Form\" to populate FNCB’s official Trade Finance application automatically.",
        "guideAr": "بعد حجز الرصيد الائتماني، يتيح النظام الإصدار عبر استمارة البنك الرسمية القابلة للتعبئة، أو خطاب طلب إصدار معتمد بالعربية والإنجليزية. نختار هنا تعبئة استمارة بنك FNCB الرسمية تلقائياً.",
        "actionLabelEn": "Select \"Fill Bank Form\" & Click Next",
        "actionLabelAr": "اختر \"Fill Bank Form\" واضغط التالي",
        "highlightsEn": [
            "AI-mapped PDF field overlays for each bank’s exact application form",
            "Zero re-typing of beneficiary names, amounts, IBANs or dates"
        ],
        "highlightsAr": [
            "ربط ذكي لحقول نماذج الـ PDF الرسمية الخاصة بكل بنك",
            "إلغاء كامل لإعادة كتابة المبالغ أو الحسابات أو أسماء المستفيدين"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 2,
        "shortTabEn": "2. Auto-Fill PDF",
        "shortTabAr": "٢. الاستمارة الجاهزة",
        "roleEn": "Bank Form Overlay & Annex Engine",
        "roleAr": "محرك التعبئة التلقائية وملاحق الصياغة",
        "headlineEn": "Sign-Ready Official Bank PDF Form + Special Wording Annex",
        "headlineAr": "توليد استمارة البنك الرسمية مع ملحق الصياغة الخاصة جاهزة للتوقيع",
        "guideEn": "Grow overlays every approved field onto FNCB Form TF-LG-01 (previewable in \"Bank Form PDF\")—formatting currencies, amounts in figures and words, debit IBAN, and automatically appending the Special-Wording Legal Annex.",
        "guideAr": "يسقط النظام كافة البيانات المعتمدة بدقة على نموذج بنك FNCB الرسمي (متاح للمعاينة في تبويب المستند)، شاملاً التفقيط ورقم الحساب الدولي، مع إرفاق ملحق الصياغة القانونية الخاصة تلقائياً جاهزاً للتوقيع.",
        "actionLabelEn": "Click \"Confirm & Issue\" to Generate Package",
        "actionLabelAr": "اضغط \"Confirm & Issue\" لإصدار حزمة البنك",
        "highlightsEn": [
            "100% accurate PDF form fill + automatic Special-Wording Annex",
            "Cuts preparation time from 45 minutes per LG to 10 seconds"
        ],
        "highlightsAr": [
            "تعبئة فورية لنموذج البنك الرسمي مع إرفاق ملحق الصياغة الخاصة",
            "اختصار وقت تجهيز طلب الإصدار من ٤٥ دقيقة إلى ثوانٍ معدودة"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 3,
        "shortTabEn": "3. Bank Delivery",
        "shortTabAr": "٣. تتبع التسليم",
        "roleEn": "Post-Issuance Lifecycle Tracker",
        "roleAr": "متتبع دورة ما بعد الإصدار",
        "headlineEn": "Post-Issuance Delivery Proof & Bank Turnaround SLA Timer",
        "headlineAr": "توثيق تسليم الاستمارة للبنك ومتابعة مهلة إصدار الضمان",
        "guideEn": "Once issued, the Post-Issuance Timeline tracks signed-form delivery to FNCB’s Trade Finance desk and monitors turnaround hours—automatically updating that bank’s real-world turnaround speed score for future deals.",
        "guideAr": "فور اعتماد الإصدار، يتابع الخط الزمني تسليم الاستمارة الموقعة لفرع البنك ويحسب زمن استجابة البنك الفعلي—ليُحدّث تلقائياً مؤشر سرعة البنك المستخدم في التقييم الذكي للصفقات القادمة.",
        "actionLabelEn": "Click \"Record Delivery\" to Advance to Bank Reply",
        "actionLabelAr": "اضغط \"Record Delivery\" لتسجيل التسليم للبنك",
        "highlightsEn": [
            "Tracks hand-delivery, courier airwaybill, or bank portal dispatch",
            "Feeds actualized turnaround speed into future bank scoring"
        ],
        "highlightsAr": [
            "توثيق التسليم باليد أو البريد السريع أو البوابة البنكية",
            "تغذية آلية لمؤشر سرعة البنك الفعلي لتحسين قرارات التوجيه"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. AI Copy Check",
        "shortTabAr": "٤. فحص الضمان الصادر",
        "roleEn": "AI Issued-Guarantee Verifier",
        "roleAr": "محرك التحقق الذكي من نسخة الضمان الصادر",
        "headlineEn": "AI Audits the Bank’s Issued Guarantee Before Client Handoff",
        "headlineAr": "فحص نسخة الضمان الصادر من البنك بالذكاء الاصطناعي قبل تسليمه للعميل",
        "guideEn": "When FNCB releases guarantee #FNCB-APG-2026-9104, uploading the scan runs an instant AI field-by-field audit—verifying Amount (EGP 12,000,000), Currency, Beneficiary NAUUA, Expiry Date, and Issuing Bank before handing it to the client.",
        "guideAr": "عند استلام أصل الضمان الصادر من البنك (#FNCB-APG-2026-9104)، يفحصه الذكاء الاصطناعي حقلاً بحقل للتأكد من تطابق المبلغ والعملة واسم الجهة المستفيدة وتاريخ السريان والانتهاء قبل تسليمه للعميل.",
        "actionLabelEn": "Confirm 5/5 AI Match & Activate Outgoing LG",
        "actionLabelAr": "اعتمد تطابق الفحص الذكي وفعّل الضمان الصادر",
        "highlightsEn": [
            "Catches bank typing errors on amount, expiry or beneficiary immediately",
            "Flags discrepancies for Corporate Admin review or bank correction"
        ],
        "highlightsAr": [
            "اكتشاف أي خطأ مطبعي من البنك في المبلغ أو التاريخ قبل التسليم",
            "تحويل أي اختلاف جوهري للمراجعة أو طلب تصحيح فوري من البنك"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Issued Register",
        "shortTabAr": "٥. سجل الضمانات الصادرة",
        "roleEn": "Corporate Outgoing LG Portfolio",
        "roleAr": "محفظة خطابات الضمان الصادرة النشطة",
        "headlineEn": "Unified Portfolio of Active Outgoing Corporate Guarantees",
        "headlineAr": "سجل موحد لكافة خطابات الضمان الصادرة والالتزامات البنكية القائمة",
        "guideEn": "Guarantee #FNCB-APG-2026-9104 is now ACTIVE & VERIFIED in the Outgoing Issued LGs Register—linking the original department request, credit approval, facility reservation, auto-filled bank form, and verified bank instrument.",
        "guideAr": "يظهر الضمان (#FNCB-APG-2026-9104) الآن بحالة (نشط وموثّق) في سجل الضمانات الصادرة، رابطاً طلب الإدارة والموافقة الائتمانية وحجز التسهيل واستمارة البنك وصورة الضمان النهائي في ملف واحد.",
        "actionLabelEn": "Continue to Outgoing Maintenance & Position Recon (2.4)",
        "actionLabelAr": "انتقل لحوكمة التعديلات ومطابقة مراكز البنك (٢.٤)",
        "highlightsEn": [
            "End-to-end traceability from project intake to verified bank LG",
            "Real-time visibility into active facility utilization & expiry dates"
        ],
        "highlightsAr": [
            "ترابط كامل من طلب الإدارة حتى استلام وتوثيق أصل الضمان",
            "متابعة دقيقة للحدود المستخدمة وتواريخ استحقاق الضمانات الصادرة"
        ],
        "suggestDocPreview": false
    }
],
  "issuance-position-recon": [
    {
        "step": 1,
        "shortTabEn": "1. Risk-Smart Maint.",
        "shortTabAr": "١. حوكمة التعديلات",
        "roleEn": "Treasury Issuance Governance",
        "roleAr": "حوكمة تعديلات الضمانات الصادرة",
        "headlineEn": "Direct LG Return to Reclaim Limits; Matrix on Risk Extensions",
        "headlineAr": "تنفيذ مباشر لإلغاء الضمان وتحرير السقف، وموافقة ائتمانية للتمديد والزيادة",
        "guideEn": "Notice how Grow reverses governance intelligently for Outgoing LGs: Close / Return executes directly without delay to free up bank credit limits and stop commissions immediately, while Extend, Increase Amount, Amend, and Activate Non-Operative require Credit Matrix approval!",
        "guideAr": "لاحظ ذكاء الحوكمة المعاكسة في الضمانات الصادرة: إلغاء ورد الضمان يُنفذ مباشرة دون انتظار لتحرير سقف التسهيل وإيقاف احتساب العمولات فوراً، بينما يتطلب التمديد أو زيادة المبلغ أو تفعيل الضمان غير الساري موافقة المصفوفة الائتمانية!",
        "actionLabelEn": "Open Bank Position Reconciliation",
        "actionLabelAr": "انتقل لشاشة مطابقة كشف مراكز البنك",
        "highlightsEn": [
            "Fast-track Close/Return reclaims credit headroom & stops bank fees",
            "Credit Matrix governs Extend, Increase, Amend & Non-Op Activation"
        ],
        "highlightsAr": [
            "استرداد فوري للحد الائتماني وإيقاف العمولات عند رد الضمان",
            "رقابة ائتمانية صارمة على التمديد وزيادة الالتزام وتعديل الشروط"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 2,
        "shortTabEn": "2. Upload Bank Report",
        "shortTabAr": "٢. رفع كشف البنك",
        "roleEn": "Treasury Reconciliation Analyst",
        "roleAr": "محلل مطابقة التسهيلات البنكية",
        "headlineEn": "Ingest Monthly Bank LG Position Reports",
        "headlineAr": "رفع كشف مراكز خطابات الضمان الشهري الوارد من البنك",
        "guideEn": "Banks routinely keep expired or returned guarantees open on their books—quietly overcharging quarterly commissions and blocking credit lines. Upload FNCB’s monthly position report (Excel/CSV or AI-parsed PDF) to audit every active line.",
        "guideAr": "كثيراً ما تبقى ضمانات منتهية أو مردودة مفتوحة في سجلات البنك، مما يقتطع عمولات دورية ويحجز حدود التسهيل دون وجه حق. ارفع كشف مراكز البنك الشهري لمطابقة كل ضمان مسجل لدى البنك مع سجلاتك.",
        "actionLabelEn": "Click \"Upload & Parse\" to Run 3-Way Match",
        "actionLabelAr": "اضغط \"Upload & Parse\" لتشغيل المطابقة الثلاثية",
        "highlightsEn": [
            "Supports bank Excel/CSV position exports & AI-parsed PDF reports",
            "Audits bank-reported amounts, expiries & active status in seconds"
        ],
        "highlightsAr": [
            "دعم ملفات الإكسيل والـ CSV وتقارير الـ PDF الصادرة من البنوك",
            "فحص شامل للمبالغ وتواريخ الانتهاء وحالة الضمانات خلال ثوانٍ"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 3,
        "shortTabEn": "3. Variance Matrix",
        "shortTabAr": "٣. مصفوفة الفروق",
        "roleEn": "3-Way Position Matching Engine",
        "roleAr": "محرك مطابقة المراكز البنكية",
        "headlineEn": "Instant Breakdown: Matched, System-Only, Bank-Only & Variances",
        "headlineAr": "فرز فوري للمتطابق والمنتهي غير المسترد والمسجل بالبنك فقط",
        "guideEn": "Grow immediately classifies the bank’s position file into Matched guarantees, System-Only expired guarantees locking EGP 3,500,000 of FNCB headroom, Bank-Only unrecorded exposure, and Amount/Expiry Mismatches.",
        "guideAr": "يصنف النظام الكشف فوراً إلى ضمانات متطابقة، وضمانات منتهية ما زالت تحجز ٣.٥ مليون جنيه من سقف التسهيل، وضمانات ظاهرة بكشف البنك فقط، وفروق في المبالغ أو تواريخ الصلاحية.",
        "actionLabelEn": "Inspect Discrepancy Rows & Resolution Controls",
        "actionLabelAr": "استعرض بنود الفروق وإجراءات المعالجة الرقابية",
        "highlightsEn": [
            "Uncovers EGP 3.5M in expired LGs still locking bank credit lines",
            "Flags unauthorized or unrecorded Bank-Only guarantees immediately"
        ],
        "highlightsAr": [
            "كشف ٣.٥ مليون جنيه لضمانات منتهية تحجز سقف التسهيل البنكي",
            "رصد فوري لأي ضمان ظاهر بسجلات البنك وغير مدرج بالنظام"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 4,
        "shortTabEn": "4. Governed Dispute",
        "shortTabAr": "٤. معالجة محكومة",
        "roleEn": "Audit-Controlled Variance Resolution",
        "roleAr": "ضوابط منع التعديل غير المعتمد",
        "headlineEn": "Zero Silent Edits: Formal Bank Dispute or Admin Sign-Off",
        "headlineAr": "معالجة رقابية محكومة: اعتراض رسمي للبنك أو تسوية خاضعة للاعتماد",
        "guideEn": "Unlike spreadsheets where anyone can overwrite balances, Grow blocks silent edits: Bank-Only items or amount mismatches must be formally Disputed with the bank to stop unearned fees or approved by a Corporate Admin—preserving 100% audit integrity.",
        "guideAr": "يمنع النظام أي تعديل عشوائي للأرصدة دون رقابة؛ حيث يلزم تسجيل اعتراض رسمي لمخاطبة البنك بشأن الفروق أو إحالة التسوية لاعتماد المسؤول المالي، مما يحصّن دقة السجلات الائتمانية.",
        "actionLabelEn": "Resolve Variances & Seal Reconciliation Session",
        "actionLabelAr": "اعتمد قرارات المعالجة وأغلق جلسة المطابقة",
        "highlightsEn": [
            "Zero silent spreadsheet edits—every variance adjustment is governed",
            "Generates ready-to-chase bank dispute items to reclaim limits & fees"
        ],
        "highlightsAr": [
            "منع التعديلات الخفية وإخضاع كافة التسويات لسجل الاعتماد",
            "تجهيز قائمة المطالبات البنكية لاسترداد الحدود والعمولات"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Sealed Audit Log",
        "shortTabAr": "٥. أرشيف المطابقات",
        "roleEn": "Completed Reconciliation Ledger",
        "roleAr": "سجل جلسات مطابقة التسهيلات المكتملة",
        "headlineEn": "Auditor-Ready History of Reconciled Bank Facility Positions",
        "headlineAr": "أرشيف رقابي متكامل لجلسات مطابقة مراكز البنوك المعتمدة",
        "guideEn": "The November 2026 FNCB Position Reconciliation session is now sealed as COMPLETED—giving CFOs and external auditors a permanent record of verified bank exposure, disputed charges, and reclaimed facility headroom.",
        "guideAr": "تُختم جلسة مطابقة مركز بنك FNCB بحالة (مكتمل)، لتوفر للمدير المالي والمراجع الخارجي سجلاً دائماً يوثق التزامات الشركة الفعلية والفروق المعترض عليها والحدود الائتمانية التي تم تحريرها.",
        "actionLabelEn": "LG Issuance Complete — Back to All Modules",
        "actionLabelAr": "اكتملت جولات الإصدار — العودة لكافة الوحدات",
        "highlightsEn": [
            "Permanent monthly proof of reconciled bank guarantee exposure",
            "Directly lowers unnecessary commissions & frees working capital"
        ],
        "highlightsAr": [
            "إثبات شهري موثق لمطابقة التزامات خطابات الضمان الصادرة",
            "خفض مباشر للعمولات غير المستحقة وتحرير رأس المال العامل"
        ],
        "suggestDocPreview": false
    }
],
  "quotations-rfq-broadcast": [
    {
        "step": 1,
        "shortTabEn": "1. Multi-Pair Basket",
        "shortTabAr": "١. سلة العملات",
        "roleEn": "Corporate FX & Liquidity Trader (Maker)",
        "roleAr": "متداول الخزانة والسيولة بالشركة (مُعدّ)",
        "headlineEn": "Structure Up to 4 FX Spot Pairs in One Simultaneous Tender",
        "headlineAr": "بناء سلة عملات فورية حتى ٤ أزواج في مناقصة مصرفية واحدة",
        "guideEn": "Instead of calling banks one by one while market rates move against you, build a multi-leg FX Spot basket—here buying USD 500,000 (Leg 1) and EUR 250,000 (Leg 2) against EGP—guided by live market feeds, Central Bank fixings, and anonymous corporate spread benchmarks.",
        "guideAr": "بدلاً من الاتصال الهاتفي المتتابع بالبنوك مع تحرك السوق ضدك، ابنِ سلة شراء عملات فورية متعددة الأرجل—هنا شراء ٥٠٠ ألف دولار و٢٥٠ ألف يورو مقابل الجنيه—مع استرشاد بأسعار السوق اللحظية وسعر البنك المركزي وفروق التنفيذ.",
        "actionLabelEn": "Select Counterparty Banks & Tariff Overlay",
        "actionLabelAr": "اختر البنوك المتنافسة ومصفوفة العمولات",
        "highlightsEn": [
            "Supports 1 to 4 currency pair legs per RFQ (Firm Execution or Indicative)",
            "Live market spot feeds, CBE mid-rates & peer spread benchmarks"
        ],
        "highlightsAr": [
            "دعم من زوج واحد حتى ٤ أزواج عملات في طلب تسعير متزامن",
            "عرض استرشادي لأسعار السوق اللحظية وسعر المركزي ومتوسطات فروق التنفيذ"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Fees & Value Date",
        "shortTabAr": "٢. العمولات والتسوية",
        "roleEn": "True All-In Net Cost Calculator",
        "roleAr": "حاسبة الصافي الشامل وتكلفة تاريخ التسوية",
        "headlineEn": "Compare True Net Cost — Including Bank Fees & Settlement Date Impact",
        "headlineAr": "تطبيق مصفوفة عمولات كل بنك ومعادلة القيمة الزمنية لتواريخ التسوية",
        "guideEn": "Selecting FNCB, MCB, and NSB automatically applies each bank’s pre-agreed commission %, min/max clamps, and flat transfer fees—and normalizes Alternative Value Dates via your 19.75% cost-of-money rate so T+0, T+1, and T+2 bids compare fairly.",
        "guideAr": "عند اختيار البنوك الثلاثة يربط النظام تلقائياً شريحة عمولة كل بنك والحد الأدنى والأقصى والرسوم الثابتة، مع إتاحة اقتراح تاريخ تسوية بديل وتعديله رياضياً بمعامل القيمة الزمنية للنقود (١٩.٧٥٪) لمقارنة عادلة تماماً.",
        "actionLabelEn": "Switch Toggle to Inspect Sovereign T-Bill Mode",
        "actionLabelAr": "بدّل التبويب لاستعراض وضع عطاءات أذون الخزانة",
        "highlightsEn": [
            "Ranks banks on true All-In net cost—not misleading headline rates",
            "Adjusts alternative settlement dates fairly using your cost of money"
        ],
        "highlightsAr": [
            "مقارنة بالتكلفة الصافية الفعلية شاملة عمولات ومصاريف كل بنك",
            "توحيد رياضي عادل للعروض ذات تواريخ التسوية المختلفة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. T-Bill Mode",
        "shortTabAr": "٣. أذون الخزانة",
        "roleEn": "Money Market & Sovereign Yield Desk",
        "roleAr": "إدارة استثمارات السيولة وأذون الخزانة",
        "headlineEn": "Sovereign Treasury Bills (T-Bills) Multi-Bank Auctions",
        "headlineAr": "طرح مناقصات شراء وبيع أذون الخزانة بين البنوك",
        "guideEn": "Surplus cash to deploy or liquidity to raise? One toggle switches the RFQ workspace to Sovereign Treasury Bills (T-Bills)—specifying Buy/Sell face value, settlement window, target maturity range, and minimum ticket rules.",
        "guideAr": "عند توفر فائض سيولة للاستثمار أو الحاجة لتسييل محفظة قائمة، يحوّل زر واحد الشاشة إلى وضع أذون الخزانة لتحديد القيمة الاسمية وفترة التسوية ونطاق الاستحقاق والحد الأدنى للعرض.",
        "actionLabelEn": "Proceed to Pre-Broadcast Admin Release Gate",
        "actionLabelAr": "انتقل لبوابة اعتماد المسؤول قبل بث المناقصة",
        "highlightsEn": [
            "Competitive multi-bank Buy & Sell Sovereign T-Bill tenders",
            "Ranks Actual/365 Price per 100 Par adjusted for settlement date"
        ],
        "highlightsAr": [
            "منافسة مصرفية مباشرة لشراء أو بيع أذون الخزانة بأفضل سعر صافي",
            "ترتيب العروض رياضياً حسب السعر الصافي وتواريخ التسوية"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Release Gate",
        "shortTabAr": "٤. اعتماد البث",
        "roleEn": "Corporate Admin / Treasury Authorizer",
        "roleAr": "مسؤول الخزانة المعتمد للبث",
        "headlineEn": "Pre-Broadcast Maker-Checker Approval & Liability Confirmation",
        "headlineAr": "اعتماد المراجع والمعتمد وإقرار الالتزام قبل البث المتزامن للبنوك",
        "guideEn": "Before binding Execution RFQs reach bank trading rooms, Corporate Admins review the basket legs, bidding window, and invited bank panel, check the mandatory institutional confirmation, and release all dealer links at the exact same millisecond.",
        "guideAr": "قبل وصول طلبات التنفيذ الملزمة لغرف تداول البنوك، يراجع المعتمد تفاصيل السلة ونافذة التسعير وقائمة البنوك، ويؤكد الإقرار المؤسسي الإلزامي ليتم بث الدعوات لكافة البنوك في نفس اللحظة الزمنية.",
        "actionLabelEn": "Click \"Confirm & Release\" to Open Blind Floor",
        "actionLabelAr": "اضغط \"Confirm & Release\" لبدء جلسة التداول المغلق",
        "highlightsEn": [
            "Configurable pre-broadcast Maker-Checker & scheduled window release",
            "Simultaneous dispatch eliminates first-call information leakage"
        ],
        "highlightsAr": [
            "اعتماد مزدوج وجدولة زمنية دقيقة قبل فتح نافذة التسعير",
            "إرسال متزامن لكافة البنوك يمنع تسرب معلومات الصفقة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Sealed Live Floor",
        "shortTabAr": "٥. التداول المغلق",
        "roleEn": "Sealed Bidding Monitor",
        "roleAr": "شاشة متابعة العروض المشفرة لحظياً",
        "headlineEn": "Live Bidding Monitor — Every Bank Quote Sealed Until 00:00",
        "headlineAr": "مراقبة حية لنشاط غرف التداول مع تشفير كامل للأسعار حتى إغلاق النافذة",
        "guideEn": "While the 20-minute window is open, treasury sees live bank connection and quote counts (2 of 3 quotes in), while every price and bank identity stays strictly sealed with per-company AES-256 encryption until the timer hits zero.",
        "guideAr": "أثناء سريان نافذة العطاء، يتابع فريق الخزانة عدد البنوك المتصلة والعروض المستلمة لحظياً، بينما تظل الأسعار وهويات البنوك مشفرة بالكامل بمفتاح AES-256 الخاص بالشركة حتى انتهاء العد التنازلي تماماً.",
        "actionLabelEn": "Continue to Bank Dealer Desk View (3.2)",
        "actionLabelAr": "انتقل لتجربة شاشة متداول البنك (٣.٢)",
        "highlightsEn": [
            "Zero early price peeking or favoritism during active countdown",
            "Per-company AES-256 encryption keeps every bid confidential"
        ],
        "highlightsAr": [
            "حياد كامل ومنع الاطلاع على الأسعار قبل إغلاق نافذة العطاء",
            "تشفير AES-256 مستقل لكل شركة يحمي سرية كافة العروض"
        ],
        "suggestDocPreview": false
    }
],
  "quotations-dealer-desk": [
    {
        "step": 1,
        "shortTabEn": "1. Zero-Password OTP",
        "shortTabAr": "١. دخول بدون كلمة سر",
        "roleEn": "External Bank FX Dealer (FNCB Desk)",
        "roleAr": "متداول غرفة المعاملات بالبنك (FNCB)",
        "headlineEn": "Frictionless Domain-Locked OTP Gate — Zero Bank IT Onboarding",
        "headlineAr": "دخول فوري لمتداول البنك برمز تحقق على البريد المعتمد دون كلمات مرور",
        "guideEn": "Now step into First National Corporate Bank’s trading room: clicking the emailed RFQ link opens a zero-password gate locked strictly to pre-authorized bank domains (fx.desk@fncb-bank.com) with a 6-digit one-time passcode.",
        "guideAr": "ننتقل الآن لشاشة غرفة التداول ببنك FNCB: بمجرد ضغط المتداول على الرابط المشفر، تفتح بوابة تحقق فورية مقيدة بنطاق البريد الرسمي للبنك ورمز دخول لمرة واحدة—دون حاجة لحسابات أو كلمات مرور ثابتة.",
        "actionLabelEn": "Verify Dealer Email & Enter Live Quoting Console",
        "actionLabelAr": "تحقق من بريد المتداول وادخل منصة التسعير الحية",
        "highlightsEn": [
            "Banks participate on day one—zero software install or passwords",
            "Domain-locked to authorized Execution & Approver dealer contacts"
        ],
        "highlightsAr": [
            "مشاركة فورية للبنوك من اليوم الأول دون تعقيدات تقنية",
            "قصر الدخول على عناوين البريد المعتمدة لمتداولي ومعتمدي البنك"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Active Desk Lock",
        "shortTabAr": "٢. منصة التسعير",
        "roleEn": "Authorized Execution Dealer (FNCB)",
        "roleAr": "المتداول المعتمد للتنفيذ ببنك FNCB",
        "headlineEn": "Multi-Leg Quoting Console with Single-Trader Concurrency Lock",
        "headlineAr": "شاشة تسعير متعددة العملات مع قفل عدم تضارب المتداولين بنفس البنك",
        "guideEn": "Inside the live console, a 45-second heartbeat grants active quoting control to fx.desk@fncb-bank.com (placing other colleagues at the same bank in Spectator Mode) and displays notional amounts, settlement dates, and CBE mid-rate anchors.",
        "guideAr": "داخل شاشة التسعير الحية، يمنح النظام صلاحية الإدخال لمتداول نشط واحد من البنك (مع وضع زملائه في وضع المشاهدة اللحظية لمنع التضارب) ويعرض المبالغ وتواريخ التسوية وسعر البنك المركزي الاسترشادي.",
        "actionLabelEn": "Test Real-Time Fat-Finger Rate Guardrail",
        "actionLabelAr": "جرّب ضابط الحماية الذكي من أخطاء الإدخال السعري",
        "highlightsEn": [
            "45-second heartbeat lock prevents two dealers colliding on one desk",
            "Supports partial-leg quoting or explicit \"Pass Leg\" per currency"
        ],
        "highlightsAr": [
            "منع تضارب الإدخال عند فتح الرابط من أكثر من متداول بالبنك",
            "مرونة تسعير كل عملة مستقلة أو الاعتذار عن زوج محدد"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. Typo Guardrail",
        "shortTabAr": "٣. حارس أخطاء السعر",
        "roleEn": "Live Fat-Finger & Rate-Swap Shield",
        "roleAr": "درع الحماية اللحظية من أخطاء كتابة السعر",
        "headlineEn": "Blocks Costly Decimal Typos & Swapped Currency Rates Live",
        "headlineAr": "اكتشاف فوري لأخطاء الفاصلة العشرية أو تبديل أسعار العملات قبل الإرسال",
        "guideEn": "When the dealer accidentally types 512.50 on USD/EGP alongside 55.62 on EUR/EGP, Grow intercepts the submission immediately—catching the misplaced decimal against Central Bank rates before a disputed fat-finger quote ever hits your blotter!",
        "guideAr": "عند إدخال المتداول لسعر ٥١٢.٥٠ بالخطأ للدولار مقابل ٥٥.٦٢ لليورو، يعترض النظام الإرسال فوراً منبهاً لانعكاس السعر التقاطعي مقارنة بمؤشر البنك المركزي، لحماية البنك والشركة من أخطاء الإدخال الجسيمة!",
        "actionLabelEn": "Correct Rate & Submit Sealed Binding Quote",
        "actionLabelAr": "صحح السعر وأرسل العرض المشفر الملزم",
        "highlightsEn": [
            "Catches 10x/100x decimal typos, digit swaps & inverted currency legs",
            "Protects both banks and treasurers from disputed fat-finger trades"
        ],
        "highlightsAr": [
            "رصد فوري لتحرك الفاصلة العشرية أو إبدال أسعار أزواج السلة",
            "حماية الطرفين من الصفقات المتنازع عليها بسبب أخطاء الكتابة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Sealed & Revisable",
        "shortTabAr": "٤. تسجيل وتحديث مشفر",
        "roleEn": "Authorized Execution Dealer (FNCB)",
        "roleAr": "المتداول المعتمد للتنفيذ ببنك FNCB",
        "headlineEn": "Quote Sealed with AES-256 — Freely Revisable Until Window Close",
        "headlineAr": "تسجيل العرض مشفراً بـ AES-256 مع إمكانية تحديثه لحظياً قبل الإغلاق",
        "guideEn": "Once submitted, FNCB’s firm rates (51.2400 on USD/EGP and 55.5900 on EUR/EGP) are sealed with per-company AES-256 encryption—completely invisible to rival banks and hidden from early peeking—while allowing the dealer to revise their own quote in real time until the window closes.",
        "guideAr": "فور الإرسال، تُحفظ أسعار البنك الملزمة مشفرة بمفتاح AES-256 الخاص بالشركة دون أي كشف للبنوك المنافسة أو اطلاع مبكر قبل انتهاء الوقت، مع إتاحة تحديث المتداول لعرضه لحظياً مع تحرك السوق حتى لحظة الإغلاق.",
        "actionLabelEn": "Continue to Net Ranking, Cherry-Pick Award & Audit Pack (3.3)",
        "actionLabelAr": "انتقل للترسية المجزأة وشهادة التدقيق (٣.٣)",
        "highlightsEn": [
            "AES-256 sealed until 00:00 — zero competitor or early price leakage",
            "Real-time quote amendments logged immutably before window cutoff"
        ],
        "highlightsAr": [
            "تشفير كامل للعروض حتى انتهاء العد التنازلي ومنع أي تسريب سعري",
            "تحديث لحظي للسعر قبل الإغلاق مع توثيق زمني غير قابل للتعديل"
        ],
        "suggestDocPreview": false
    }
],
  "quotations-net-award": [
    {
        "step": 1,
        "shortTabEn": "1. Net Standings",
        "shortTabAr": "١. الترتيب الصافي",
        "roleEn": "Corporate Treasurer / Execution Desk",
        "roleAr": "مدير الخزانة / مسؤول الترسية",
        "headlineEn": "Window Closes: AES-256 Quotes Unseal Ranked by All-In Net Cost",
        "headlineAr": "إغلاق النافذة وفك تشفير العروض مرتبة بالتكلفة الصافية الشاملة",
        "guideEn": "The second the countdown expires, Grow unseals all bank bids and computes Provisional Best Execution Standings—adjusting each raw spot rate for bank commission %, min/max clamps, flat fees, and settlement-date Time-Value-of-Money.",
        "guideAr": "فور انتهاء العد التنازلي، يفك النظام تشفير كافة العروض ويحسب ترتيب أفضل تنفيذ صافي—بعد إضافة عمولة كل بنك والرسوم الثابتة ومعادلة القيمة الزمنية لتاريخ التسوية تلقائياً.",
        "actionLabelEn": "Open Multi-Leg Cherry-Picking Award Modal",
        "actionLabelAr": "افتح نافذة الترسية المجزأة لاختيار أفضل بنك لكل عملة",
        "highlightsEn": [
            "Unseals all bids simultaneously after cutoff—zero late bids accepted",
            "Transparent breakdown of raw bank quote vs All-In effective price"
        ],
        "highlightsAr": [
            "فك تشفير متزامن بعد الإغلاق ومنع استلام أي عروض متأخرة",
            "شفافية كاملة للسعر الخام مقارنة بالسعر الفعلي الشامل للعمولات"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 2,
        "shortTabEn": "2. Cherry-Pick Legs",
        "shortTabAr": "٢. الترسية المجزأة",
        "roleEn": "Synchronized Deal Acceptance Countdown",
        "roleAr": "نافذة الترسية المتزامنة متعددة البنوك",
        "headlineEn": "Cherry-Pick the Best Bank Per Currency Leg Inside Countdown",
        "headlineAr": "ترسية كل عملة لأفضل بنك مستقل خلال مهلة القبول المحددة",
        "guideEn": "Inside the synchronized Deal Acceptance timer, Grow auto-selects the optimal winner per leg: First National Corporate Bank wins Leg #1 (USD 500,000) while Mediterranean Commercial Bank wins Leg #2 (EUR 250,000)—maximizing total basket savings!",
        "guideAr": "خلال مهلة القبول المتزامنة، يرشح النظام الفائز الأفضل لكل عملة على حدة: بنك FNCB يفوز بشراء الـ ٥٠٠ ألف دولار، بينما يفوز بنك MCB بشراء الـ ٢٥٠ ألف يورو—لتعظيم إجمالي الوفر المحقق للسلة!",
        "actionLabelEn": "Click \"Accept & Execute Trade\" Across Both Winners",
        "actionLabelAr": "اضغط \"Accept & Execute Trade\" لتنفيذ الترسية المزدوجة",
        "highlightsEn": [
            "2-Bank Cherry-Pick: USD/EGP → FNCB & EUR/EGP → MCB in 1 click",
            "Synchronized countdown auto-protects against stale market exposure"
        ],
        "highlightsAr": [
            "ترسية ذكية لعملتين على بنكين مختلفين بضغطة زر واحدة",
            "عداد زمني متزامن للقبول يحمي الشركة والبنوك من تقلب السوق"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. Live & CBE Check",
        "shortTabAr": "٣. السوق والمركزي",
        "roleEn": "Dual Live Market & CBE Benchmark Auditor",
        "roleAr": "محرك المقارنة المرجعية بأسعار السوق والبنك المركزي",
        "headlineEn": "Benchmark Executed Rates Against Live Market Feeds & CBE Fixings",
        "headlineAr": "توثيق عدالة السعر مقارنة بأسعار السوق اللحظية ومؤشر البنك المركزي",
        "guideEn": "Every awarded leg displays a permanent Reference Check comparing your executed net rate against both live interbank spot feeds and frozen Central Bank official fixings, alongside historical fixings and anonymized market spread benchmarks.",
        "guideAr": "يوثق النظام لكل عملة تمت ترسيتها مقارنة مرجعية تربط سعر التنفيذ الفعلي بأسعار السوق اللحظية والسعر الرسمي المعلن من البنك المركزي المصري لحظة الإغلاق ومتوسطات فروق السوق.",
        "actionLabelEn": "Click \"Best Execution Audit Pack\" to Open Certificate",
        "actionLabelAr": "اضغط \"Best Execution Audit Pack\" لعرض شهادة التدقيق",
        "highlightsEn": [
            "Checks executed rates against both live market feeds & frozen CBE fixings",
            "Quantifies net EGP savings achieved vs competing market bids"
        ],
        "highlightsAr": [
            "مقارنة تلقائية بأسعار السوق الفورية وسعر البنك المركزي الرسمي لحظة التنفيذ",
            "حساب رقمي دقيق للوفر المالي المحقق مقارنة بمتوسط العروض"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Audit Certificate",
        "shortTabAr": "٤. شهادة أفضل تنفيذ",
        "roleEn": "Board, CFO & External Audit Governance",
        "roleAr": "حوكمة مجلس الإدارة والمراجعة الخارجية",
        "headlineEn": "Printable A4 Best Execution Audit Certificate",
        "headlineAr": "شهادة تدقيق رسمية جاهزة للطباعة لإثبات عدالة وأفضلية التنفيذ",
        "guideEn": "One click generates the executive Best Execution Audit Certificate (also downloadable in the PDF tab)—recording every invited bank, submission timestamp, raw vs final net rate, leg award, and quantified portfolio savings for statutory auditors.",
        "guideAr": "بضغطة واحدة يصدر النظام شهادة التدقيق لأفضل تنفيذ سعري (متاحة أيضاً في تبويب المستند)، موثقةً كافة البنوك المدعوة وتوقيتات العروض والأسعار الصافية وقرار الترسية والوفر المالي المحقق للمراجعين.",
        "actionLabelEn": "Inspect Bank-Scoped Cryptographic Deal Receipt",
        "actionLabelAr": "انتقل لمعاينة إيصال الصفقة المشفر الخاص بالبنك الفائز",
        "highlightsEn": [
            "Eliminates audit questions on why a specific bank won a trade",
            "1-click A4 PDF export for treasury files & board committees"
        ],
        "highlightsAr": [
            "إثبات مؤسسي قاطع لشفافية المنافسة وعدالة اختيار البنك الفائز",
            "تصدير فوري بصيغة A4 PDF للجان المراجعة والحوكمة"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 5,
        "shortTabEn": "5. Winner Receipt",
        "shortTabAr": "٥. إيصال التنفيذ الرقمي",
        "roleEn": "Confidential Winner-Only Deal Receipt",
        "roleAr": "إيصال تنفيذ الصفقة المعزول للبنك الفائز",
        "headlineEn": "Signed Deal Receipt — Showing Only the Currency Leg That Bank Won",
        "headlineAr": "إيصال تنفيذ موقع رقمياً ومعزول حصرياً للعملة التي فاز بها البنك",
        "guideEn": "Back on FNCB’s dealer console, the bank receives a digitally signed Deal Execution Receipt scoped strictly to the USD/EGP leg it won—never revealing which bank won EUR/EGP or at what rate!",
        "guideAr": "على شاشة متداول بنك FNCB، يصدر إيصال تنفيذ صفقة موقع رقمياً ومقتصر حصرياً على رجل الدولار التي فاز بها البنك—دون أي كشف عن هوية البنك الفائز برجل اليورو أو سعر تنفيذه!",
        "actionLabelEn": "View Corporate Quotation History & Value Analytics",
        "actionLabelAr": "انتقل لسجل الصفقات التاريخي وتحليلات الوفر",
        "highlightsEn": [
            "Tamper-evident digital signature locking the exact winning rate",
            "Strict per-currency privacy protects rival & losing bank quotes"
        ],
        "highlightsAr": [
            "بصمة تشفيرية مانعة للتلاعب توثق سعر التنفيذ الفائز",
            "عزل كامل على مستوى كل عملة يحمي خصوصية البنوك المشاركة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 6,
        "shortTabEn": "6. Value Analytics",
        "shortTabAr": "٦. تحليلات الوفر",
        "roleEn": "CFO & Group Treasury Analytics",
        "roleAr": "لوحة تحليلات الخزانة والوفر التراكمي",
        "headlineEn": "Quotation History & Quantified Treasury Value Delivery",
        "headlineAr": "سجل شامل لعمليات العملات وأذون الخزانة والوفر المالي التراكمي",
        "guideEn": "The Quotation History dashboard unifies completed FX Spot baskets (#RFQ-FX-2026-0903) and Sovereign T-Bill tenders (#RFQ-TB-2026-0894)—tracking cumulative savings vs market averages, bank win rates, and CSV audit exports.",
        "guideAr": "تجمع لوحة السجل التاريخي كافة صفقات العملات الفورية وعطاءات أذون الخزانة المنفذة، مع قياس الوفر المالي التراكمي المحقق للشركة ونسب فوز البنوك وتصدير تقارير المراجعة.",
        "actionLabelEn": "Quotations Tours Complete — Back to All Modules",
        "actionLabelAr": "اكتملت جولات التسعير — العودة لكافة الوحدات",
        "highlightsEn": [
            "Unified archive for Multi-Pair FX Spot & Sovereign T-Bill deals",
            "Proves treasury desk ROI in hard currency savings every quarter"
        ],
        "highlightsAr": [
            "أرشيف موحد لصفقات العملات الفورية وعطاءات أذون الخزانة",
            "قياس رقمي مباشر للعائد المالي المحقق من رقمنة غرفة الخزانة"
        ],
        "suggestDocPreview": false
    }
],
  "recon-zero-config": [
    {
        "step": 1,
        "shortTabEn": "1. Smart Import",
        "shortTabAr": "١. الاستيراد الذكي",
        "roleEn": "Treasury / General Ledger Accountant",
        "roleAr": "محاسب الخزانة والأستاذ العام",
        "headlineEn": "Zero-Config Multi-Bank Statement Ingestion",
        "headlineAr": "استيراد كشوف الحسابات البنكية بدون قوالب أو إعدادات مسبقة",
        "guideEn": "Select First National Corporate Bank and drop any CSV or Excel bank statement. Grow auto-detects Arabic and English column headers, booking/value dates, signed or split debit/credit columns, and header drift without IT mapping.",
        "guideAr": "اختر البنك وارفع ملف كشف الحساب بصيغة إكسيل أو CSV مباشرة؛ حيث يكتشف النظام تلقائياً عناوين الأعمدة العربية والإنجليزية وتواريخ القيد والحق وأعمدة المدين والدائن دون أي برمجة لقوالب البنوك.",
        "actionLabelEn": "Inspect Mathematical Balance Continuity Audit",
        "actionLabelAr": "افحص نتيجة التحقق الرياضي من تسلسل الأرصدة",
        "highlightsEn": [
            "Zero-setup header detection across Arabic & English bank formats",
            "Automatic header-drift alert if a bank changes its export layout"
        ],
        "highlightsAr": [
            "تعرف تلقائي على صيغ البنوك العربية والإنجليزية دون إعداد مسبق",
            "تنبيه ذكي فوري إذا غيّر البنك ترتيب أو مسميات أعمدة الكشف"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Continuity Check",
        "shortTabAr": "٢. تسلسل الأرصدة",
        "roleEn": "Mathematical Balance Integrity Gate",
        "roleAr": "بوابة التحقق الرياضي من سلامة الأرصدة",
        "headlineEn": "Opening-to-Closing Balance Continuity Verified on Import",
        "headlineAr": "فحص رياضي آلي لتطابق الرصيد الافتتاحي والختامي فور الرفع",
        "guideEn": "Every imported FNCB and MCB statement passes an instant mathematical audit (Opening Balance + Credits − Debits = Closing Balance) and cross-statement continuity check—catching missing rows or truncated bank exports before matching begins.",
        "guideAr": "يخضع كل كشف مرفوع لفحص رياضي فوري (الرصيد الافتتاحي + الإيداعات − المسحوبات = الرصيد الختامي) مع مطابقة تسلسل الأرصدة بين الكشوف المتتالية، لكشف أي سطور ناقصة قبل بدء التسوية.",
        "actionLabelEn": "Open FNCB Statement Workspace",
        "actionLabelAr": "افتح مساحة عمل كشف حساب بنك FNCB",
        "highlightsEn": [
            "VALIDATED badge confirms 0.00 EGP mathematical balance variance",
            "Blocks corrupted, duplicate, or incomplete statement uploads upfront"
        ],
        "highlightsAr": [
            "شارة VALIDATED تؤكد تطابق المعادلة المحاسبية للكشف بنسبة ١٠٠٪",
            "منع تسوية الكشوف المبتورة أو المكررة قبل وصولها للدفاتر"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 3,
        "shortTabEn": "3. Run Rules & AI",
        "shortTabAr": "٣. محرك التصنيف",
        "roleEn": "Rules + Privacy-Safe AI Engine",
        "roleAr": "محرك القواعد المحاسبية والذكاء المحمي",
        "headlineEn": "One-Click \"Run Rules & AI\" Classifies Fees, Taxes & Collections",
        "headlineAr": "ضغطة واحدة لتشغيل القواعد المحاسبية والذكاء الاصطناعي معاً",
        "guideEn": "Opening FNCB’s statement workspace loads all booking lines, balances, and references. Clicking \"Run Rules & AI\" cascades through Built-In Banking Rules, Learned Company Rules, Vendor/Client Memory, and Privacy-Shielded AI.",
        "guideAr": "عند فتح مساحة عمل الكشف، يشغّل زر (Run Rules & AI) أربع طبقات متتالية: كواشف القنوات المصرفية المدمجة، والقواعد المتعلمة ذاتياً، وذاكرة الموردين والعملاء، والذكاء الاصطناعي المحمي السرية.",
        "actionLabelEn": "Inspect Explainable Classification Badges",
        "actionLabelAr": "راجع شارات التصنيف المفسَّرة ومصادر القرار",
        "highlightsEn": [
            "Instant classification of InstaPay, RTGS, ACH, SWIFT & LG fees",
            "Strict accounting rules run first; AI assists only on new narratives"
        ],
        "highlightsAr": [
            "تصنيف فوري لتحويلات إنستاباي وRTGS وACH والسويفت وعمولات الضمانات",
            "أولوية للقواعد المحاسبية المنضبطة مع إسناد الحالات الجديدة للذكاء الاصطناعي"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Provenance Pills",
        "shortTabAr": "٤. شفافية التصنيف",
        "roleEn": "Explainable Accounting Intelligence",
        "roleAr": "ذكاء محاسبي مفسَّر وقابل للمراجعة",
        "headlineEn": "Zero Black-Box AI: Every Row Shows Exact Rule & G/L Provenance",
        "headlineAr": "شفافية كاملة بدون صندوق أسود: كل حركة توضح القاعدة وحساب الأستاذ",
        "guideEn": "Accountants never guess why a line was classified: each row displays its matched Counterparty pill, exact Rule or AI badge, target G/L account (e.g., 6020300 - LG Commissions), and an inline \"Confirm\" button for medium-confidence suggestions.",
        "guideAr": "لا مجال للتخمين المحاسبي؛ فكل سطر يعرض شارة الطرف المقابل والقاعدة المطبقة ورقم حساب الأستاذ العام المقترح، مع زر تأكيد سريع للمقترحات متوسطة الثقة قبل الترحيل.",
        "actionLabelEn": "Click Audit Icon to Open Deep-Dive Drawer",
        "actionLabelAr": "اضغط أيقونة الفحص لفتح درج المراجعة التفصيلي",
        "highlightsEn": [
            "Color-coded badges distinguish Manual, Auto-Learned, Built-In & AI",
            "Honest exception handling flags ambiguous lines for human review"
        ],
        "highlightsAr": [
            "تمييز بصري واضح بين القواعد اليدوية والمتعلمة والمدمجة والذكاء الاصطناعي",
            "فرز أمين للحركات الغامضة لمراجعتها بشرياً بدلاً من التخمين الخاطئ"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Audit Drawer",
        "shortTabAr": "٥. درج المراجعة",
        "roleEn": "Internal & Statutory Audit Reviewer",
        "roleAr": "مراجع الحسابات الداخلي والخارجي",
        "headlineEn": "Slide-Over Transaction Deep-Dive & Raw Bank Metadata",
        "headlineAr": "درج مراجعة تفصيلي يعرض النص الأصلي للبنك ومسار التوجيه المحاسبي",
        "guideEn": "Clicking any line opens the Transaction Audit Drawer—preserving the bank’s untouched English and Arabic narrative lines, bank reference, booking vs value date, confidence score, and full G/L audit trail.",
        "guideAr": "يعرض درج المراجعة الجانبي النص الخام الوارد من البنك بالعربية والإنجليزية، والرقم المرجعي، وتاريخ القيد والحق، ودرجة الثقة، ومصدر التوجيه المحاسبي بالكامل لأغراض الفحص والمراجعة.",
        "actionLabelEn": "Continue to Sweeps, Reversals & ERP Match (4.2)",
        "actionLabelAr": "انتقل للتحويلات البينية والمطابقة مع ERP (٤.٢)",
        "highlightsEn": [
            "Preserves raw bilingual bank narratives alongside clean G/L tags",
            "Complete lineage from raw statement import to General Ledger code"
        ],
        "highlightsAr": [
            "حفظ النص البنكي الأصلي جنباً إلى جنب مع التوجيه المحاسبي",
            "توثيق كامل لمسار كل حركة من الكشف البنكي حتى حساب الأستاذ"
        ],
        "suggestDocPreview": false
    }
],
  "recon-sweeps-reversals": [
    {
        "step": 1,
        "shortTabEn": "1. Sweep Detection",
        "shortTabAr": "١. رصد التحويل البيني",
        "roleEn": "Group Cash & Liquidity Controller",
        "roleAr": "مراقب النقدية والسيولة بالمجموعة",
        "headlineEn": "Automatic Cross-Bank Liquidity Sweep Pairing — Even With Fees",
        "headlineAr": "ربط تلقائي للتحويلات البينية بين البنوك حتى مع خصم عمولة التحويل",
        "guideEn": "In the Unified Master Ledger, Apex Global swept EGP 5,000,000 from FNCB to MCB, but FNCB debited 5,000,175.00 EGP including an RTGS corridor fee. Grow pairs both bank statements automatically and isolates the 175.00 EGP fee!",
        "guideAr": "في دفتر الأستاذ الموحد، حوّلت الشركة ٥ ملايين جنيه من بنك FNCB إلى بنك MCB، لكن البنك خصم ٥,٠٠٠,١٧٥ جنيهاً شاملاً عمولة التحويل اللحظي. يربط النظام الحركتين بين البنكين تلقائياً ويفصل فرق العمولة البالغ ١٧٥ جنيهاً!",
        "actionLabelEn": "Click \"SWEEP ↔\" Badge to Verify Both Legs",
        "actionLabelAr": "اضغط شارة \"SWEEP ↔\" لفحص طرفي التحويل جنباً إلى جنب",
        "highlightsEn": [
            "Pairs reciprocal outflows & inflows across different banks & dates",
            "Prevents inter-account transfers from inflating revenue or expenses"
        ],
        "highlightsAr": [
            "ربط ذكي للسحب والإيداع المقابل عبر البنوك المختلفة وفروق التوقيت",
            "منع تضخيم الإيرادات والمصروفات بالتحويلات الداخلية بين حسابات الشركة"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Sweep Modal",
        "shortTabAr": "٢. فحص طرفي التحويل",
        "roleEn": "Cross-Statement Sweep Verifier",
        "roleAr": "محقق التحويلات البينية عبر الحسابات",
        "headlineEn": "Side-by-Side Sweep Verification Modal Isolates Corridor Fees",
        "headlineAr": "نافذة تحقق مزدوجة تعرض حساب السحب وحساب الإيداع وفرق العمولة",
        "guideEn": "Clicking the Sweep badge opens the side-by-side Verification Modal: FNCB Outflow (−5,000,175.00 EGP) vs MCB Inflow (+5,000,000.00 EGP) with the exact 175.00 EGP RTGS corridor fee isolated and option to unlink if ever needed.",
        "guideAr": "تفتح نافذة التحقق المزدوجة عرضاً واضحاً لطرف السحب من بنك FNCB (−٥,٠٠٠,١٧٥ ج.م) مقابل طرف الإيداع ببنك MCB (+٥,٠٠٠,٠٠٠ ج.م) مع إثبات فرق عمولة التحويل (١٧٥ ج.م) بدقة تامة.",
        "actionLabelEn": "Close Modal & Inspect Returned Wire Netting",
        "actionLabelAr": "أغلق النافذة وانتقل لفحص التحويل المرتد",
        "highlightsEn": [
            "Side-by-side proof across bank accounts, value dates & references",
            "Automatically isolates RTGS/SWIFT corridor fees from principal"
        ],
        "highlightsAr": [
            "إثبات بصري ورقابي متكامل لطرفي التحويل عبر الحسابين البنكيين",
            "فصل آلي لعمولات التحويل البنكي عن أصل المبلغ المحوّل"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. Reversal Netting",
        "shortTabAr": "٣. تصفية المرتدات",
        "roleEn": "Error & Returned Wire Detector",
        "roleAr": "كاشف القيود العكسية والتحويلات المرتدة",
        "headlineEn": "Self-Canceling Returned Wires Netted Before Closing AP Bills",
        "headlineAr": "ربط وتصفية التحويلات المرتدة تلقائياً لحماية حسابات الموردين",
        "guideEn": "Notice rows #6 and #7: an outward −380,000 EGP vendor wire failed the next day (+380,000 EGP \"Beneficiary IBAN Closed\"). Grow links both as REVERSAL_NETTED so your Al-Nour Ready-Mix AP bill stays properly open instead of falsely paid!",
        "guideAr": "لاحظ السطرين السادس والسابع: تحويل صادر لمورد بقيمة ٣٨٠ ألف جنيه ارتد في اليوم التالي لإغلاق حساب المستفيد. يربطهما النظام تلقائياً كقيد عكسي صفري حتى لا تُقفل فاتورة المورد بالخطأ وهي لم تُسدد!",
        "actionLabelEn": "Click \"Split Match\" to Open ERP Dual-Pane",
        "actionLabelAr": "اضغط \"Split Match\" لفتح شاشة المطابقة المزدوجة مع ERP",
        "highlightsEn": [
            "Pairs bounced cheques, returned wires & bank error reversals to 0.00",
            "Protects ERP payables & receivables from false settlement matches"
        ],
        "highlightsAr": [
            "تصفية الشيكات المرتدة والتحويلات المرفوضة والقيود العكسية آلياً",
            "حماية ذمم الموردين والعملاء من الإقفال الخاطئ لدفعات لم تكتمل"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Split ERP Match",
        "shortTabAr": "٤. المطابقة المزدوجة",
        "roleEn": "AR / AP Reconciliation Specialist",
        "roleAr": "أخصائي مطابقة حسابات العملاء والموردين",
        "headlineEn": "Dual-Pane Split Match: Bank Lines vs Open ERP Invoices",
        "headlineAr": "شاشة مزدوجة لمطابقة حركات البنك مع فواتير نظام الـ ERP المفتوحة",
        "guideEn": "Switching to Split Match places NorthStar’s inward SWIFT collection (+1,249,850.00 EGP on the left) directly beside open SAP AR Invoice INV-2026-4082 (+1,250,000.00 EGP on the right)—spotting the 150.00 EGP correspondent wire fee instantly.",
        "guideAr": "تضع شاشة المطابقة المزدوجة تحصيل السويفت الوارد من شركة نورث ستار (+١,٢٤٩,٨٥٠ ج.م يميناً/يساراً) مباشرة مقابل فاتورة المبيعات المفتوحة بنظام الـ ERP بقيمة ١,٢٥٠,٠٠٠ ج.م—كاشفةً فرق عمولة البنك المراسل (١٥٠ ج.م) فوراً.",
        "actionLabelEn": "Click \"Confirm Match 1:1\" with Fee Tolerance",
        "actionLabelAr": "اضغط \"Confirm Match 1:1\" لاعتماد المطابقة مع فرق العمولة",
        "highlightsEn": [
            "Supports 1:1, Many-to-1 batch settlements, and 1-to-Many split payments",
            "Configurable tolerance rules absorb corridor fees automatically"
        ],
        "highlightsAr": [
            "دعم المطابقة المفردة ١:١ والدفعات المجمعة وتجزئة السداد",
            "قواعد سماحية مرنة لمعالجة فروق عمولات التحويل تلقائياً"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 5,
        "shortTabEn": "5. Auto Fee Split",
        "shortTabAr": "٥. تسوية الفروق",
        "roleEn": "Automatic Wire-Fee Booking",
        "roleAr": "التوجيه المحاسبي التلقائي لعمولة التحويل",
        "headlineEn": "Full Invoice Closed & 150 EGP Wire Fee Posted to Bank Charges",
        "headlineAr": "إقفال فاتورة العميل بالكامل وتوجيه الـ ١٥٠ جنيهاً لحساب المصروفات البنكية",
        "guideEn": "Confirming the match clears the full EGP 1,250,000 AR invoice and automatically books the 150.00 EGP wire deduction to Bank Charges—ready for balanced three-leg General Ledger export in Tour 4.4.",
        "guideAr": "فور تأكيد المطابقة، تُقفل فاتورة العميل بكامل قيمتها (١,٢٥٠,٠٠٠ ج.م) ويُوجَّه فرق الـ ١٥٠ جنيهاً تلقائياً لحساب عمولات التحويل البنكي، ليكون القيد المحاسبي متوازناً وجاهزاً للتصدير.",
        "actionLabelEn": "Continue to Self-Learning Rules & Zero-PII Brain (4.3)",
        "actionLabelAr": "انتقل للقواعد ذاتية التعلم وحماية الخصوصية (٤.٣)",
        "highlightsEn": [
            "Zero leftover wire-fee pennies clogging AR/AP aging reports",
            "Automatic Bank Charges routing ready for balanced GL export"
        ],
        "highlightsAr": [
            "تصفير الفروق الصغيرة التي تعطل أعمار ديون العملاء والموردين",
            "توجيه محاسبي آلي لفرق العمولة جاهز لتوليد قيد اليومية المزدوج"
        ],
        "suggestDocPreview": false
    }
],
  "recon-rules-privacy": [
    {
        "step": 1,
        "shortTabEn": "1. Teach in 1 Click",
        "shortTabAr": "١. التعلّم الفوري",
        "roleEn": "1-Click Accountant Rule Learning",
        "roleAr": "التعلّم المباشر بضغطة واحدة",
        "headlineEn": "Classify Once & Check \"Remember for Counterparty\"",
        "headlineAr": "صنّف الحركة مرة واحدة وفعّل خيار التذكر التلقائي للطرف المقابل",
        "guideEn": "Whenever a new vendor or client narrative appears, clicking \"+ Classify\" lets you pick the G/L category and check \"Remember this classification for Counterparty\"—turning one click into permanent future automation with zero formulas to write.",
        "guideAr": "عند ظهور حركة لطرف جديد، تتيح نافذة التصنيف السريع اختيار الحساب المحاسبي وتفعيل خيار تذكر هذا التصنيف للطرف المقابل—ليتحول قرار المحاسب لمرة واحدة إلى أتمتة دائمة في الكشوف القادمة.",
        "actionLabelEn": "Open Learned & Self-Healing Rules Engine",
        "actionLabelAr": "انتقل لشاشة القواعد المتعلمة وذاتية التصحيح",
        "highlightsEn": [
            "Zero IT rules or formulas—learns directly as your team works",
            "Links vendor & customer names directly to default G/L accounts"
        ],
        "highlightsAr": [
            "تعلّم مباشر من عمل المحاسب اليومي دون كتابة معادلات معقدة",
            "ربط تلقائي لأسماء الموردين والعملاء بحسابات الأستاذ الافتراضية"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Auto-Refining Rules",
        "shortTabAr": "٢. التصحيح الذاتي",
        "roleEn": "Self-Correcting Accounting Rules",
        "roleAr": "قواعد محاسبية تقيس دقتها وتصحح نفسها",
        "headlineEn": "Rules Track Their Own Accuracy & Auto-Adjust for Refunds",
        "headlineAr": "قواعد متعلمة تقيس دقتها الفعليّة وتصحح نفسها تلقائياً عند الاستثناء",
        "guideEn": "Grow tracks every rule’s real confirmation rate (100% on Delta Heavy Turbines; 95.65% on LG Commissions). When an accountant reclassifies a fee refund, the rule automatically refines itself to exclude REFUND and REVERSAL lines in the future!",
        "guideAr": "يتتبع النظام دقة كل قاعدة فعلياً من واقع التأكيدات والتعديلات؛ فإذا عدّل المحاسب حالة استرداد عمولة، تطوّر القاعدة نفسها تلقائياً بإضافة كلمات استثناء مثل (استرداد/عكس) لمنع تكرار الخطأ!",
        "actionLabelEn": "Switch to AES-256 Encrypted Counterparty Vault",
        "actionLabelAr": "افتح سجل الأطراف المقابلة المشفر بـ AES-256",
        "highlightsEn": [
            "Monitors live accuracy % & confirmation counts on every rule",
            "Automatically refines rules when an accountant overrides an exception"
        ],
        "highlightsAr": [
            "قياس حي لنسبة الدقة الفعلية وعدد مرات النجاح لكل قاعدة",
            "تضييق وتصحيح تلقائي للقواعد عند رصد أي استثناء محاسبي"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. Encrypted Vault",
        "shortTabAr": "٣. سجل الأطراف المشفر",
        "roleEn": "Encrypted Company Vendor & Client Vault",
        "roleAr": "خزينة بيانات العملاء والموردين المشفرة",
        "headlineEn": "Company-Isolated Counterparty Vault — Names Never Leave Your Control",
        "headlineAr": "سجل موردين وعملاء مشفر بمفتاح مستقل لكل شركة",
        "guideEn": "Your Counterparty Registry encrypts supplier and customer names with your company’s dedicated AES-256 key—matching messy SWIFT and ACH abbreviations to clean vendor names while keeping your client and supplier lists 100% private.",
        "guideAr": "يحفظ سجل الأطراف أسماء الموردين والعملاء مشفرة بمفتاح AES-256 المستقل لشركتك، ليتعرف على الأسماء المختصرة في كشوف البنوك دون خروج أي بيانات عملاء أو موردين خارج خزينة الشركة.",
        "actionLabelEn": "Click \"Collaborative Brain\" to Audit Zero-PII Shield",
        "actionLabelAr": "افتح تبويب الذكاء المشترك لفحص درع الخصوصية",
        "highlightsEn": [
            "Dedicated per-company AES-256 encryption on every vendor & client",
            "Matches abbreviated SWIFT/ACH bank memos to clean ERP entities"
        ],
        "highlightsAr": [
            "تشفير AES-256 مستقل لكل شركة يحمي قوائم العملاء والموردين",
            "مطابقة ذكية للمرادفات والاختصارات البنكية مع اسم الجهة الصحيح"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Privacy Shield",
        "shortTabAr": "٤. الذكاء المشترك المحمي",
        "roleEn": "Privacy-Shielded Shared Banking Syntax",
        "roleAr": "التعرف الفوري على صيغ البنوك مع حماية السرية",
        "headlineEn": "Day-One Bank Fee Recognition — Zero Company Data Ever Shared",
        "headlineAr": "ذكاء مصرفي يتعرف على صيغ البنوك من اليوم الأول بصفر تسريب للبيانات",
        "guideEn": "How does Grow recognize local bank fee wording on Day 1? A privacy shield strips every name, IBAN, date, and amount locally—adopting generic bank fee phrasing only after 3+ independent companies confirm the exact same bank wording!",
        "guideAr": "كيف يتعرف النظام على صيغ عمولات البنوك فور رفع أول كشف؟ يجرّد درع الخصوصية النص محلياً من كافة الأسماء والحسابات والمبالغ والتواريخ، ولا يعتمد أي صيغة عمولة بنكية إلا بعد توافق ٣ شركات مستقلة على الأقل!",
        "actionLabelEn": "Open Bilingual Hierarchical G/L Taxonomy",
        "actionLabelAr": "انتقل لشجرة التصنيفات المحاسبية ثنائية اللغة",
        "highlightsEn": [
            "Zero names, IBANs, references, or amounts ever leave your vault",
            "Requires 3+ independent companies before adopting generic bank syntax"
        ],
        "highlightsAr": [
            "استحالة خروج أي اسم عميل أو رقم حساب أو مبلغ خارج خزينة الشركة",
            "شرط توافق ٣ شركات مستقلة على الأقل لاعتماد أي صيغة مصرفية عامة"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 5,
        "shortTabEn": "5. G/L Taxonomy",
        "shortTabAr": "٥. شجرة الحسابات",
        "roleEn": "Chart of Accounts & Taxonomy Architect",
        "roleAr": "إدارة شجرة التصنيفات وحسابات الأستاذ العام",
        "headlineEn": "Bilingual Hierarchical Classes Mapped to Your Chart of Accounts",
        "headlineAr": "تصنيفات رئيسية وفرعية بالعربية والإنجليزية مربوطة بدليل الحسابات",
        "guideEn": "Every company tailors its own bilingual Classification Taxonomy—mapping Debit, Credit, or Either-direction treasury categories and subcategories directly to your SAP, Oracle, or Dynamics General Ledger account numbers.",
        "guideAr": "تخصص كل شركة شجرة التصنيفات الرئيسية والفرعية الخاصة بها باللغتين العربية والإنجليزية، مع تحديد اتجاه الحركة (مدين/دائن) وربطها مباشرة بأرقام حسابات الأستاذ العام في نظامها المالي.",
        "actionLabelEn": "Continue to Double-Entry GL Builder & ERP Export (4.4)",
        "actionLabelAr": "انتقل لبناء قيود اليومية المزدوجة والتصدير للـ ERP (٤.٤)",
        "highlightsEn": [
            "Bilingual EN/AR hierarchy with direction-aware G/L defaults",
            "Adapts to any corporate Chart of Accounts in minutes"
        ],
        "highlightsAr": [
            "هيكل ثنائي اللغة مربوط باتجاه الحركة ورقم حساب الأستاذ الافتراضي",
            "مرونة كاملة للتوافق مع دليل حسابات أي شركة أو مجموعة قابضة"
        ],
        "suggestDocPreview": false
    }
],
  "recon-erp-export": [
    {
        "step": 1,
        "shortTabEn": "1. Readiness Gate",
        "shortTabAr": "١. جاهزية الإقفال",
        "roleEn": "Chief Accountant / Financial Controller",
        "roleAr": "رئيس الحسابات / المراقب المالي",
        "headlineEn": "100% Classification Readiness KPIs Before ERP Posting",
        "headlineAr": "مؤشرات جاهزية الإقفال والتحقق من اكتمال التصنيف بنسبة ١٠٠٪",
        "guideEn": "Before generating General Ledger files, Accounting Export verifies your exact close readiness across 4 KPIs: 8 Total Lines, 8 Classified (100%), 0 Unclassified exceptions remaining, and Export Batch Lock status.",
        "guideAr": "قبل إصدار ملفات الترحيل للأستاذ العام، تتحقق شاشة التصدير المحاسبي من جاهزية الإقفال عبر ٤ مؤشرات: إجمالي السطور، واكتمال التصنيف ١٠٠٪، وصفر حركات معلقة غير مصنفة، وحالة قفل الدفعات.",
        "actionLabelEn": "Select Saved SAP S/4HANA Double-Entry Profile",
        "actionLabelAr": "اختر قالب التصدير المحفوظ لنظام SAP S/4HANA",
        "highlightsEn": [
            "Clear pre-flight check prevents incomplete batches hitting your ERP",
            "Filters by bank, statement period, or unexported-only transactions"
        ],
        "highlightsAr": [
            "فحص استباقي يمنع تصدير دفعات ناقصة أو غير مكتملة التصنيف",
            "تصفية مرنة حسب البنك أو الفترة أو الحركات غير المرحّلة فقط"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 2,
        "shortTabEn": "2. Layout Builder",
        "shortTabAr": "٢. مصمم القوالب",
        "roleEn": "ERP Integration & Template Designer",
        "roleAr": "مصمم قوالب الربط مع أنظمة الـ ERP",
        "headlineEn": "Customizable Column Mapper for SAP, Oracle, Dynamics & Excel",
        "headlineAr": "تخصيص كامل للأعمدة والصيغ للتوافق مع SAP وOracle وأي نظام مالي",
        "guideEn": "No middleware project required: load saved export profiles like \"SAP S/4HANA FI Double-Entry Journal\"—customizing exact column headers, field order, split Debit/Credit vs signed amounts, date formatting, and CSV or XLSX output.",
        "guideAr": "دون الحاجة لمشاريع ربط برمجية معقدة، اختر قالب التصدير المحفوظ مثل (SAP S/4HANA FI) أو خصص أسماء وترتيب الأعمدة وصيغة التاريخ وفصل المدين والدائن وتصدير XLSX أو CSV خلال ثوانٍ.",
        "actionLabelEn": "Inspect Automatic Double-Entry Journal Expansion",
        "actionLabelAr": "افحص خاصية توليد أطراف القيد المزدوج تلقائياً",
        "highlightsEn": [
            "Reusable profiles per ERP system, subsidiary, or bank account",
            "Supports Split Debit/Credit, Signed Amount, or Absolute + D/C flag"
        ],
        "highlightsAr": [
            "حفظ قوالب جاهزة لكل نظام ERP أو شركة تابعة أو حساب بنكي",
            "دعم أعمدة المدين/الدائن المنفصلة أو القيمة الموحدة مع مؤشر الحركة"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 3,
        "shortTabEn": "3. 3-Leg GL Split",
        "shortTabAr": "٣. القيد المزدوج",
        "roleEn": "Automated Double-Entry Journal Engine",
        "roleAr": "محرك توليد قيود اليومية المزدوجة المتوازنة",
        "headlineEn": "Auto-Expands Bank + AR/AP Offset + Fee Variance Journal Legs",
        "headlineAr": "توليد آلي لأطراف القيد المزدوج: البنك + العميل/المورد + فرق العمولة",
        "guideEn": "Enabling \"Expand Double-Entry GL Journal Legs\" transforms flat bank lines into balanced multi-leg accounting entries—pairing Cash at Bank (1010010), Trade Receivables/Payables, and automatic Bank Fee Variance lines!",
        "guideAr": "بتفعيل خيار توسيع أطراف القيد المزدوج، يحوّل النظام كل حركة بنكية تلقائياً إلى قيد يومية محاسبي متوازن يشمل حساب النقدية بالبنك وحساب العميل أو المورد وسطر فرق عمولة التحويل البنكي!",
        "actionLabelEn": "Preview Live Balanced Journal Rows",
        "actionLabelAr": "استعرض المعاينة الحية لقيود اليومية المتوازنة",
        "highlightsEn": [
            "Generates 2-leg & 3-leg balanced journals automatically",
            "Eliminates manual journal splitting in Excel before ERP upload"
        ],
        "highlightsAr": [
            "توليد تلقائي للقيود الثنائية والثلاثية شاملة فروق العمولات",
            "إلغاء كامل لتجهيز وتقسيم قيود اليومية يدوياً على الإكسيل"
        ],
        "suggestDocPreview": false
    },
    {
        "step": 4,
        "shortTabEn": "4. Live GL Preview",
        "shortTabAr": "٤. معاينة القيود",
        "roleEn": "Pre-Export Accounting Verification",
        "roleAr": "المراجعة المحاسبية الحية قبل التصدير",
        "headlineEn": "Live Balanced Journal Preview — Zero Out-of-Balance Risk",
        "headlineAr": "معاينة حية لجدول القيود المتوازنة قبل تحميل ملف الترحيل",
        "guideEn": "The Live Export Layout Preview displays the exact generated rows before download—including NorthStar’s 3-leg split (Debit Cash 1,249,850 + Debit Bank Fee 150 = Credit Trade Receivables 1,250,000) with zero out-of-balance discrepancy.",
        "guideAr": "تعرض المعاينة الحية شكل الجدول النهائي قبل التحميل، موضحةً قيد تحصيل نورث ستار الثلاثي المتوازن (من مذكورين: ١,٢٤٩,٨٥٠ البنك + ١٥٠ عمولات بنكية إلى حـ/ العملاء ١,٢٥٠,٠٠٠) بصفر فروق.",
        "actionLabelEn": "Enable Export Lock & Download ERP Journal File",
        "actionLabelAr": "فعّل قفل الترحيل وحمّل ملف قيود الـ ERP",
        "highlightsEn": [
            "WYSIWYG preview of exact ERP columns, G/L codes & narrations",
            "Mathematically balanced debits and credits across every voucher"
        ],
        "highlightsAr": [
            "معاينة مطابقة تماماً للملف النهائي شاملة أرقام الحسابات والبيان",
            "توازن محاسبي تام بين إجمالي المدين والدائن في كل قيد"
        ],
        "suggestDocPreview": true
    },
    {
        "step": 5,
        "shortTabEn": "5. Lock & Export",
        "shortTabAr": "٥. القفل والتحميل",
        "roleEn": "Duplicate-Posting Prevention Control",
        "roleAr": "ضابط منع تكرار الترحيل للأستاذ العام",
        "headlineEn": "Lock & Mark as Exported — Zero Double-Posting Into Your ERP",
        "headlineAr": "قفل الدفعة المصدّرة لمنع تكرار ترحيل أي قيد مرتين لنظام الـ ERP",
        "guideEn": "Checking \"Lock & Mark as Exported on Download\" and clicking Download XLSX generates your SAP-ready file while stamping every included transaction with an export timestamp—completing all 4 modules of the Grow Treasury Platform!",
        "guideAr": "بتفعيل خيار القفل عند التحميل والضغط على (Download XLSX)، يصدر ملف القيود الجاهز لنظام الـ ERP مع ختم كافة الحركات المشمولة كمصدّرة لمنع تكرار ترحيلها مستقبلاً—لتكتمل جولتنا عبر وحدات منصة Grow الأربع!",
        "actionLabelEn": "All 4 Modules Complete — Back to Platform Overview",
        "actionLabelAr": "اكتملت الوحدات الأربع — العودة لكافة الوحدات",
        "highlightsEn": [
            "Batch export lock prevents accidental duplicate GL uploads",
            "Cuts monthly multi-bank reconciliation & close from days to minutes"
        ],
        "highlightsAr": [
            "قفل رقابي يمنع إعادة تصدير أو ترحيل نفس الحركات بالخطأ",
            "اختصار الإقفال الشهري ومطابقة البنوك من أيام إلى دقائق معدودة"
        ],
        "suggestDocPreview": false
    }
],
};
