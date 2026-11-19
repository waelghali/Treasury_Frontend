// src/components/Trial/trialSalesCatalog.js
/**
 * Simple, Credible Everyday Business English Catalog for Guided Free Trial.
 * - Uses clean, natural product menu names in the sidebar.
 * - Bank-neutral across all UI copy (works with all relationship banks).
 * - Clearly frames AI as fast preparation while humans review and managers approve.
 */

export const SAMPLE_KIT = {
  custodyLgPdf: {
    id: 'custody-lg-pdf',
    label: 'Sample LG (PDF)',
    apiPath: '/trial-sandbox/sample-custody-lg.pdf',
    downloadName: 'Sample_Performance_LG.pdf',
  },
  bankAdvicePdf: {
    id: 'bank-advice-pdf',
    label: 'Sample Bank Reply (PDF)',
    href: '/demo/docs/FNCB_Official_Bank_Advice_8841.pdf',
    downloadName: 'FNCB_Official_Bank_Advice_8841.pdf',
  },
  riskyWordingPdf: {
    id: 'risky-wording-pdf',
    label: 'Risky Client LG Text (PDF)',
    href: '/demo/trial-kit/Sample_Client_Risky_Advance_LG_Draft.pdf',
    downloadName: 'Sample_Client_Risky_Advance_LG_Draft.pdf',
  },
  contractAwardPdf: {
    id: 'contract-award-pdf',
    label: 'Sample Contract (PDF)',
    href: '/demo/docs/Apex_Contract_Award_NAUUA_2026.pdf',
    downloadName: 'Apex_Contract_Award_NAUUA_2026.pdf',
  },
  lgPositionPdf: {
    id: 'lg-position-pdf',
    label: 'Bank LG List (PDF)',
    href: '/demo/docs/FNCB_LG_Position_Statement_Nov2026.pdf',
    downloadName: 'FNCB_LG_Position_Statement_Nov2026.pdf',
  },
  bankStatementACsv: {
    id: 'bank-statement-a',
    label: 'Bank A Statement (CSV)',
    href: '/demo/trial-kit/Sample_Bank_A_Operating_Statement.csv',
    downloadName: 'Sample_Bank_A_Operating_Statement.csv',
  },
  bankStatementBCsv: {
    id: 'bank-statement-b',
    label: 'Bank B Transfer (CSV)',
    href: '/demo/trial-kit/Sample_Bank_B_Sweep_Receiver_Statement.csv',
    downloadName: 'Sample_Bank_B_Sweep_Receiver_Statement.csv',
  },
  sapOpenInvoicesCsv: {
    id: 'sap-open-invoices',
    label: 'SAP Invoices (CSV)',
    href: '/demo/trial-kit/Sample_SAP_Open_Invoices.csv',
    downloadName: 'Sample_SAP_Open_Invoices.csv',
  },
};

export const TRIAL_GUIDED_NAV_ITEMS = [
  {
    id: 'home',
    label: 'Trial Home',
    subtitle: 'Guided Overview',
    icon: 'compass',
    getPath: (role) =>
      role === 'corporate_admin' ? '/corporate-admin/dashboard' : '/end-user/dashboard',
    requiredRole: null,
    isActive: (path, search) =>
      path.endsWith('/dashboard') &&
      !path.includes('/reconciliation') &&
      !path.includes('/quotations') &&
      !(search || '').includes('view=dashboard'),
    subItems: [],
  },
  {
    id: 'custody',
    label: 'LG Custody',
    subtitle: 'Received LGs',
    icon: 'shield',
    moduleProp: 'hasCustodyModule',
    completedKey: 'custody',
    getPath: () => '/end-user/lg-records',
    requiredRole: 'end_user',
    isActive: (path) =>
      path.includes('/lg-records') ||
      path.includes('/expiring-lgs') ||
      path.includes('/action-center'),
    subItems: [
      { label: 'Record New LG', path: '/end-user/lg-records/new', requiredRole: 'end_user' },
      { label: 'LG Records', path: '/end-user/lg-records', requiredRole: 'end_user' },
      { label: 'Action Center', path: '/end-user/action-center', requiredRole: 'end_user' },
    ],
  },
  {
    id: 'issuance',
    label: 'LG Issuance',
    subtitle: 'Outbound LGs',
    icon: 'send',
    moduleProp: 'hasIssuanceModule',
    completedKey: 'issuance',
    getPath: (role) =>
      role === 'corporate_admin'
        ? '/corporate-admin/issuance/requests'
        : '/end-user/issuance/requests',
    requiredRole: null,
    isActive: (path) => path.includes('/issuance'),
    subItems: [
      {
        label: 'Issuance Requests',
        getPath: (role) =>
          role === 'corporate_admin'
            ? '/corporate-admin/issuance/requests'
            : '/end-user/issuance/requests',
      },
      {
        label: 'New LG Request',
        path: '/end-user/issuance/request-new',
        matchPaths: ['/end-user/issuance/request-new', '/end-user/issuance/requests/new'],
        requiredRole: 'end_user',
      },
      {
        label: 'Issued LGs',
        getPath: (role) =>
          role === 'corporate_admin'
            ? '/corporate-admin/issuance/issued-lgs'
            : '/end-user/issuance/issued-lgs',
      },
      {
        label: 'Bank Facilities',
        path: '/corporate-admin/issuance/facilities',
        requiredRole: 'corporate_admin',
      },
      {
        label: 'Position Reconciliation',
        path: '/end-user/issuance/reconciliation',
        requiredRole: 'end_user',
      },
    ],
  },
  {
    id: 'reconciliation',
    label: 'Bank Reconciliation',
    subtitle: 'Cash & Statements',
    icon: 'fileCheck',
    moduleProp: 'hasReconciliationModule',
    completedKey: 'reconciliation',
    getPath: () => '/end-user/reconciliation',
    requiredRole: 'end_user',
    isActive: (path) =>
      path.includes('/reconciliation') && !path.includes('/issuance/reconciliation'),
    subItems: [
      { label: 'Statement Upload', path: '/end-user/reconciliation', requiredRole: 'end_user' },
      { label: 'Matching Workspace', path: '/end-user/reconciliation/workspace', requiredRole: 'end_user' },
      { label: 'Accounting Export', path: '/end-user/reconciliation/export', requiredRole: 'end_user' },
    ],
  },
  {
    id: 'quotations',
    label: 'Quotations',
    subtitle: 'FX & T-Bills',
    icon: 'trendingUp',
    moduleProp: 'hasQuotationModule',
    completedKey: 'quotations',
    getPath: () => '/end-user/quotations/active',
    requiredRole: 'end_user',
    isActive: (path) => path.includes('/quotation'),
    subItems: [
      { label: 'Active Quotations', path: '/end-user/quotations/active', requiredRole: 'end_user' },
      { label: 'Quotation History', path: '/end-user/quotations/history', requiredRole: 'end_user' },
    ],
  },
];

export const TRIAL_SCENARIOS = [
  {
    id: 'custody',
    number: '01',
    moduleProp: 'hasCustodyModule',
    completedKey: 'custody',
    badge: '2 MIN · RECEIVED LGs (CUSTODY)',
    accent: 'blue',
    title: 'Read LG PDFs with AI & Prepare Renewal Letters',
    summary:
      'AI reads 15+ fields from any bank LG PDF in seconds so you can review and save, then prepares official renewal letters for approval.',
    humanControlNote:
      'AI fills the form fields · You review before saving · Managers approve official letters.',
    highlights: [
      'Reads Beneficiary, Bank, Amount, Expiry & Claim Text for your review (Owner & Category are ready).',
      'Prepares batch renewal letters in Action Center with QR verification codes.',
    ],
    primaryAction: {
      label: 'Scan Sample LG PDF',
      path: '/end-user/lg-records/new',
      requiredRole: 'end_user',
    },
    secondaryAction: {
      label: 'Prepare Renewal Letters',
      path: '/end-user/action-center',
      requiredRole: 'end_user',
    },
  },
  {
    id: 'issuance',
    number: '02',
    moduleProp: 'hasIssuanceModule',
    completedKey: 'issuance',
    badge: '2 MIN · ISSUING NEW LGs',
    accent: 'indigo',
    title: 'Compare 3 Banks, Check LG Text & Fill Official Bank Forms',
    summary:
      'Compare bank credit facilities on 0% vs 10% cash margin, auto-fill the selected bank’s official PDF form for signature, and review risky client wording.',
    humanControlNote:
      'AI highlights risky clauses & suggests safer wording · Legal/Treasury decides final text.',
    highlights: [
      'Ready EGP 6M request recommends the #1 lowest-cost bank facility (0% cash margin) and fills its official PDF form.',
      'Flags risky client clauses (such as open-ended expiry) so your team reviews them before signing.',
    ],
    primaryAction: {
      label: 'Fill Official Bank Form',
      getPath: (role) =>
        role === 'corporate_admin'
          ? '/corporate-admin/issuance/requests'
          : '/end-user/issuance/requests',
      requiredRole: null,
    },
    secondaryAction: {
      label: 'Check Risky LG Text',
      path: '/end-user/issuance/request-new',
      requiredRole: 'end_user',
    },
  },
  {
    id: 'reconciliation',
    number: '03',
    moduleProp: 'hasReconciliationModule',
    completedKey: 'reconciliation',
    badge: '2 MIN · BANK RECONCILIATION',
    accent: 'emerald',
    title: 'Self-Learning Bank Reconciliation (InstaPay, Fees & Sweeps)',
    summary:
      'Ingests CSV, Excel, MT940, or CAMT.053 in any layout, verifies balances, and auto-learns your counterparties, fee tolerances, and GL rules — getting sharper every month.',
    humanControlNote:
      'Your team confirms or adjusts matches · Rules self-correct on overrides so manual exceptions shrink each cycle.',
    highlights: [
      'Auto-profiles bank column layouts, companion wire fees, account purpose, and recurring counterparties right on upload.',
      'Matches InstaPay, SWIFT fees & sweeps — building GL rules from confirmations and self-adjusting if you override a suggestion.',
    ],
    primaryAction: {
      label: 'Upload Sample CSV Files',
      path: '/end-user/reconciliation',
      requiredRole: 'end_user',
    },
    secondaryAction: {
      label: 'Review Matches',
      path: '/end-user/reconciliation/workspace',
      requiredRole: 'end_user',
    },
  },
  {
    id: 'quotations',
    number: '04',
    moduleProp: 'hasQuotationModule',
    completedKey: 'quotations',
    badge: '2 MIN · FX & T-BILL RATES',
    accent: 'amber',
    title: 'Compare Closed-Timer FX & T-Bill Bank Quotes',
    summary:
      'Request quotes from 3 banks in a closed timer window, test the Bank Trader screen, and benchmark offers against live interbank market feeds, historical spreads, and CBE reference rates.',
    humanControlNote:
      'Grow ranks quotes fairly when the timer ends · Your treasury team selects and approves the deal.',
    highlights: [
      'Bank quotes stay sealed until 00:00, then rank by net cost against live interbank spot rates (plus CBE fixing drift & corridor TVM).',
      'Click "Finish Timer Now" to review all offers and generate an audit-ready Deal Confirmation.',
    ],
    primaryAction: {
      label: 'Request Bank Rates',
      path: '/end-user/quotations/active',
      requiredRole: 'end_user',
    },
    secondaryAction: null,
  },
];

export function getRouteSalesContext(pathname = '', activeRole = 'end_user') {
  const path = (pathname || '').toLowerCase();
  const isCorpAdmin = activeRole === 'corporate_admin';
  const rolePrefix = isCorpAdmin ? '/corporate-admin' : '/end-user';

  if (path.includes('/lg-records/new')) {
    return {
      stepBadge: 'Step 1 · Scan LG',
      quickAction:
        'Click "Do It For Me" to auto-load & scan a sample Performance LG in 1 click — or download the PDF to upload it yourself, then click "Save LG Record".',
      growEdge:
        'AI prepares 15+ fields in seconds for your review, and sends automatic 30-day expiry reminders to the project owner.',
      autoLoadAction: {
        id: 'custody_scan',
        label: 'Do It For Me',
        loadingLabel: 'Scanning Sample LG…',
        title: 'Auto-load & AI-scan Sample LG PDF',
      },
      samples: [SAMPLE_KIT.custodyLgPdf],
      nextAction: {
        label: 'Next: Renewal Letters',
        path: '/end-user/action-center',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/action-center')) {
    return {
      stepBadge: 'Step 2 · Renewal Letters',
      quickAction:
        'Look at "Approaching Expiry / Renewal" below and click "Auto Renewal" to prepare official bank extension letters for review and printing.',
      growEdge:
        'Prepares extension letters for expiring LGs in seconds with a QR code — ready for authorized review and signature.',
      samples: [],
      nextAction: {
        label: 'Record New LG',
        path: '/end-user/lg-records/new',
        requiredRole: 'end_user',
      },
    };
  }

  if (/\/lg-records\/\d+/.test(path)) {
    return {
      stepBadge: 'LG Actions',
      quickAction:
        'Click "Extend", "Decrease", "Release", or "Liquidate" to prepare an official bank instruction letter (subject to your approval rules).',
      growEdge:
        'Every letter carries a verification QR code, and AI checks incoming bank replies to flag date or amount mismatches.',
      samples: [SAMPLE_KIT.bankAdvicePdf],
      nextAction: {
        label: 'Action Center',
        path: `${rolePrefix}/action-center`,
      },
    };
  }

  if (path.includes('/lg-records') || path.includes('/expiring-lgs')) {
    return {
      stepBadge: 'LG Records',
      quickAction:
        'Click the first LG in the table (expiring in 18 days) to prepare an Extend or Release letter, or click "Record New LG" on the right.',
      growEdge:
        'Keeps every LG organized in one place with early email reminders so renewals never slip.',
      samples: [SAMPLE_KIT.custodyLgPdf],
      nextAction: {
        label: 'Record New LG',
        path: '/end-user/lg-records/new',
        requiredRole: 'end_user',
      },
      secondaryNext: {
        label: 'Action Center',
        path: `${rolePrefix}/action-center`,
      },
    };
  }

  if (
    path.includes('/issuance/request-new') ||
    path.includes('/issuance/requests/new') ||
    path.includes('/issuance/requests/edit')
  ) {
    return {
      stepBadge: 'New LG Request',
      quickAction:
        'Click "Do It For Me" to attach a sample client LG draft & scan it right away — we will scroll down and show 5 risky clauses with safer wording!',
      growEdge:
        'Helps your treasury and legal team spot risky client conditions (like open-ended expiry) before asking the bank to issue.',
      autoLoadAction: {
        id: 'issuance_wording',
        label: 'Do It For Me',
        loadingLabel: 'Attaching Sample Files…',
        title: 'Auto-attach Sample Risky LG Text & Contract',
      },
      samples: [SAMPLE_KIT.riskyWordingPdf, SAMPLE_KIT.contractAwardPdf],
      nextAction: {
        label: 'Issuance Requests',
        path: `${rolePrefix}/issuance/requests`,
      },
    };
  }

  if (path.includes('/issuance/facilities')) {
    return {
      stepBadge: 'Bank Facilities',
      quickAction:
        'Click any bank to compare available credit limits, 0% vs 10% cash margin, and commission rates across your entities.',
      growEdge:
        'Shows live available facility headroom across all banks and subsidiaries in one screen.',
      samples: [],
      nextAction: {
        label: 'Issuance Requests',
        path: '/corporate-admin/issuance/requests',
        requiredRole: 'corporate_admin',
      },
    };
  }

  if (path.includes('/issuance/reconciliation')) {
    return {
      stepBadge: 'Position Reconciliation',
      quickAction:
        'Click "Do It For Me" to auto-load & compare the sample Bank LG Position Report against your records — or download the PDF and upload it yourself.',
      growEdge:
        'Spots expired or returned LGs where a bank is still charging commission fees — without manual Excel work.',
      autoLoadAction: {
        id: 'issuance_recon',
        label: 'Do It For Me',
        loadingLabel: 'Comparing Bank List…',
        title: 'Auto-upload & match Sample Bank LG Position List',
      },
      samples: [SAMPLE_KIT.lgPositionPdf],
      nextAction: {
        label: 'Issuance Requests',
        path: `${rolePrefix}/issuance/requests`,
      },
    };
  }

  if (path.includes('/issuance/issued-lgs')) {
    return {
      stepBadge: 'Issued LGs',
      quickAction:
        'Click the active EGP 8.5M Performance LG to inspect delivery dates, bank turnaround time, and credit limit usage.',
      growEdge:
        'Tracks every issued LG from internal approval until final return and facility release.',
      samples: [SAMPLE_KIT.lgPositionPdf],
      nextAction: {
        label: 'Position Reconciliation',
        path: '/end-user/issuance/reconciliation',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/issuance/requests')) {
    return {
      stepBadge: 'Issuance Requests',
      quickAction:
        'Click REQ-SMPL (EGP 6M) in the table below → click "Issue LG" → select the #1 recommended bank (0% Margin) → click "Fill Bank Form"!',
      growEdge:
        'Recommends the lowest-cost bank facility (saving EGP 600K cash margin vs 10%) and fills the bank’s official PDF form ready for signature.',
      samples: [],
      nextAction: {
        label: 'New LG Request (Wording Check)',
        path: '/end-user/issuance/request-new',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/reconciliation/workspace')) {
    return {
      stepBadge: 'Matching Workspace',
      quickAction:
        'Click "Do It For Me" to load sample Bank A & B statements + SAP invoices and run matching automatically — or download the CSVs to import manually.',
      growEdge:
        'Compounds every month: matches InstaPay, SWIFT fees, and sweeps on Day 1 — then builds GL & fee-tolerance rules from every confirmation and self-corrects if you override a rule once, shrinking manual exceptions cycle after cycle.',
      autoLoadAction: {
        id: 'reconciliation_full',
        label: 'Do It For Me',
        loadingLabel: 'Loading & Matching…',
        title: 'Auto-load sample bank statements, SAP invoices & run AI matching',
      },
      samples: [SAMPLE_KIT.sapOpenInvoicesCsv, SAMPLE_KIT.bankStatementBCsv],
      nextAction: {
        label: 'Accounting Export',
        path: '/end-user/reconciliation/export',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/reconciliation/export')) {
    return {
      stepBadge: 'Accounting Export',
      quickAction:
        'Preview balanced debit/credit accounting journal lines below and download your ERP-ready CSV/Excel export.',
      growEdge:
        'Remembers your custom ERP column order, date/sign format, and balanced debit/credit GL journal legs so every future month-end export takes 1 click.',
      samples: [],
      nextAction: {
        label: 'Matching Workspace',
        path: '/end-user/reconciliation/workspace',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/reconciliation')) {
    return {
      stepBadge: 'Statement Upload',
      quickAction:
        'Click "Do It For Me" to auto-load sample Bank statements + SAP invoices and open matched results — or download "Bank A Statement (CSV)" to test manual upload.',
      growEdge:
        'Reads CSV, Excel, MT940, or CAMT.053 in any column order, verifies balances, and starts learning right on upload — auto-profiling recurring counterparties, companion wire fees, account purpose, and historical GL sheets before you click a single match.',
      autoLoadAction: {
        id: 'reconciliation_full',
        label: 'Do It For Me',
        loadingLabel: 'Loading & Matching…',
        title: 'Auto-load sample bank statements, SAP invoices & run AI matching',
      },
      samples: [SAMPLE_KIT.bankStatementACsv, SAMPLE_KIT.sapOpenInvoicesCsv],
      nextAction: {
        label: 'Matching Workspace',
        path: '/end-user/reconciliation/workspace',
        requiredRole: 'end_user',
      },
    };
  }

  if (path.includes('/quotation')) {
    return {
      stepBadge: 'Active Quotations',
      quickAction:
        'Sample FX request (USD 250K & EUR 100K across 3 banks) is ready below — tick the confirmation box at the bottom and click "Launch Quotation", then try "Open Bank Trader Screen" or "Finish Timer Now"!',
      growEdge:
        'Benchmarks sealed bank quotes against live interbank feeds, CBE drift/corridor TVM, and an empirical spread model that learns your company’s own winning spreads by currency pair and deal size over time.',
      samples: [],
    };
  }

  return {
    stepBadge: 'Free Trial',
    quickAction:
      'Explore your ready sample data below, or click "Trial Home" on the left anytime to try another 2-minute workflow.',
    growEdge:
      'Your uploaded test files are private, encrypted for your company only, and can be deleted in 1 click on Trial Home.',
    samples: [],
  };
}
