#!/usr/bin/env node
/**
 * db-sync.js — Single command to sync Drizzle schema from live PostgreSQL DB
 *
 * Usage:
 *   node scripts/db-sync.js            # sync both schemas
 *   node scripts/db-sync.js --platform # sync platform only
 *   node scripts/db-sync.js --business # sync business only
 *
 * What it does:
 *   1. Runs drizzle-kit introspect → outputs to .drizzle/ (temp, gitignored)
 *   2. Copies schema.ts + relations.ts → src/schema/{platform|business}/
 *   3. Auto-generates index.ts with domain-organized re-exports
 */

'use strict';

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, copyFileSync, rmSync, mkdirSync, existsSync } = require('fs');
const { resolve, join } = require('path');

const ROOT  = resolve(__dirname, '..');
const TEMP  = join(ROOT, '.drizzle');
const SRC   = join(ROOT, 'src', 'schema');

const args = process.argv.slice(2);
const runPlatform = args.length === 0 || args.includes('--platform');
const runBusiness = args.length === 0 || args.includes('--business');

// ─── Domain map for business_template ──────────────────────────────────────

const BUSINESS_DOMAINS = {
  'Store & Device': [
    'stores','storeConfigs','registers','deviceBindings',
    'floorPlans','diningTables','kitchenStations','printerDevices','salesChannels',
  ],
  'Staff & RBAC': [
    'staffMembers','staffAccountLinks','staffRoleBindings',
    'roles','permissions','rolePermissions','permissionDefinitions',
    'permissionChangeHistory','roleChangeHistory','temporaryPermissionGrants',
    'workShifts','timekeepingLogs','departments','payrollPeriods','payrollItems',
  ],
  'Customer & CRM': [
    'customers','customerAddresses','customerGroups','customerSegments',
    'customerTags','customerTagMappings','customerInteractions',
    'customerContactPreferences','customerConsents',
    'customerMergeRequests','customerCreditProfiles',
  ],
  'Loyalty & Wallet': [
    'loyaltyPrograms','loyaltyTiers','loyaltyPointTransactions',
    'customerWallets','walletTransactions','customerVouchers','voucherBatches',
    'giftCards','giftCardTransactions',
    'customerReceivables','customerReceivablePayments',
    'customerReceivableAdjustments','customerReceivableAllocations','customerLedgers',
  ],
  'Catalog — Products': [
    'products','productVariants','productBarcodes','productCategories',
    'productAttributeGroups','productAttributeValues',
    'productTags','productTagMappings','productRecipes',
    'productSerials','productLots','productCostHistory','productPriceHistory',
    'productStoreSettings','productUnits','comboItems','ingredientConsumptions',
    'units','brands',
  ],
  'Pricing': [
    'priceBooks','priceBookItems','discounts','menuAvailability','taxClasses',
  ],
  'Inventory': [
    'stockLocations','stockBalances','stockLotBalances','stockTransactions',
    'stockReservations','stockRules','stockTransfers','stockTransferItems',
    'stocktakes','stocktakeItems','stockValuationSnapshots',
    'inventoryCostLayers','inventoryCostAdjustments',
  ],
  'Purchasing': [
    'suppliers','purchaseOrders','purchaseOrderLines',
    'landedCosts','landedCostAllocations',
    'supplierReturns','supplierReturnLines',
    'supplierPayables','supplierPayments','supplierPaymentAllocations',
    'supplierCreditNotes','debitNotes','receivingDiscrepancies','cogsAllocations',
  ],
  'Orders & POS': [
    'salesOrders','salesOrderLines','salesOrderAdjustments','salesOrderStatusHistory',
    'orderPayments','orderReturns','orderReturnLines',
    'tableSessions','kitchenTickets','kitchenTicketLines','prepBatches','wasteLogs',
  ],
  'Payments': [
    'paymentMethods','paymentRefunds',
    'paymentReconciliations','paymentReconciliationItems',
    'bankTransactions','bankDeposits','bankStatementImports','codReconciliations',
  ],
  'Cashbook & Shifts': [
    'cashAccounts','cashTransactions','cashDrawerMovements',
    'cashDenominations','shiftCashCounts','shiftPaymentSummaries',
  ],
  'Finance & Accounting': [
    'chartOfAccounts','journalEntries','journalLines',
    'salesInvoices','salesInvoiceLines','salesInvoiceTaxes','invoiceNumberSequences',
    'creditNotes','creditNoteLines','taxReports',
    'businessPeriods','periodLocks','closingRuns','closingRunItems','reopenPeriodRequests',
  ],
  'Reports': [
    'reportDailySalesSnapshots',
  ],
  'Shipping & Fulfillment': [
    'shipments','shipmentItems','shipmentPackages','shipmentTrackingEvents',
    'deliveryOrders','deliveryAttempts','shippingCarriers',
    'channelOrderMappings','channelProductMappings',
  ],
  'Production & Kitchen': [
    'productionOrders','productionOrderLines',
  ],
  'Service & CRM+': [
    'campaigns','campaignMessages','appointments','appointmentLines',
    'serviceOrders','serviceOrderLines','servicePackages',
    'warrantyClaims','warrantyPolicies',
  ],
  'System': [
    'activityLogs','appNotifications','approvalRequests','documentSequences',
    'eventOutbox','externalEventLogs','idempotencyKeys','mediaAssets',
    'offlineSyncBatches','pushTokens','realtimeEvents',
    'syncJobs','syncJobLogs','webhookInbox',
  ],
  'Billing': [
    'packageUsages',
  ],
};

// ─── Domain map for platform ────────────────────────────────────────────────

const PLATFORM_DOMAINS = {
  'Auth & Accounts': [
    'accounts','authSessions','accountMfaMethods',
    'accountBusinesses','accountBranchAccess','impersonationSessions','sessionLimits',
  ],
  'Businesses & Branches': [
    'businesses','businessBranches','businessModules','businessSubscriptions',
  ],
  'Billing & Subscriptions': [
    'subscriptionPlans','planLimits','billingEvents',
    'platformInvoices','platformInvoiceLines','platformPayments',
    'renewalKeys','usageBillingItems','businessUsageCounters','businessUsageDaily',
  ],
  'Platform RBAC': [
    'roles','permissions','rolePermissions','accountRoleBindings',
  ],
  'Support': [
    'supportTickets','supportTicketMessages',
  ],
  'Webhooks': [
    'webhookEndpoints','webhookSubscriptions','webhookDeliveryLogs',
  ],
  'System & Audit': [
    'auditEvents','platformAuditLog','platformAnnouncements','systemSettings',
    'migrationLog','flywaySchemaHistory',
  ],
  'API & Devices': [
    'apiClients','deviceIdentities',
  ],
  'Reference Data': [
    'bankMaster',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function extractTableExports(schemaPath, suffix) {
  const content = readFileSync(schemaPath, 'utf8');
  // Match: export const {name}InBusinessTemplate = ... or export const {name}Sequence
  // Only grab .table( and .sequence( exports that end with the suffix
  const re = new RegExp(`export const (\\w+?)(?:${suffix})\\s*=\\s*\\w+\\.(?:table|sequence)\\(`, 'g');
  const names = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    // m[1] is the camelCase name without suffix
    const name = m[1].charAt(0).toLowerCase() + m[1].slice(1);
    names.push(name);
  }
  return [...new Set(names)];
}

function generateIndexTs(exports, suffix, domainMap, schemaLabel) {
  const assigned = new Set();
  const lines = [];

  lines.push(`/**`);
  lines.push(` * AUTO-GENERATED by scripts/db-sync.js — DO NOT EDIT`);
  lines.push(` * Re-run: node scripts/db-sync.js --${schemaLabel}`);
  lines.push(` */`);
  lines.push(`export * from './schema';`);
  lines.push(`export * from './relations';`);
  lines.push(``);

  for (const [domain, tables] of Object.entries(domainMap)) {
    const inSchema = tables.filter(t => exports.includes(t));
    if (inSchema.length === 0) continue;

    lines.push(`// ─── ${domain} ${'─'.repeat(Math.max(0, 60 - domain.length))}`);

    const importLines = inSchema.map(t => {
      // schema.ts exports as lowercase-first: storesInBusinessTemplate
      const exportedName = t + suffix;
      assigned.add(t);
      return `  ${exportedName} as ${t},`;
    });

    lines.push(`export {`);
    lines.push(...importLines);
    lines.push(`} from './schema';`);
    lines.push(``);
  }

  // Uncategorized — new tables not yet in domain map
  const unassigned = exports.filter(t => !assigned.has(t));
  if (unassigned.length > 0) {
    lines.push(`// ─── Uncategorized (add to domain map in scripts/db-sync.js) ────────────`);
    lines.push(`export {`);
    for (const t of unassigned) {
      const exportedName = t + suffix;
      lines.push(`  ${exportedName} as ${t},`);
    }
    lines.push(`} from './schema';`);
    lines.push(``);
  }

  return lines.join('\n');
}

function syncSchema(schemaName, configFile, suffix, domainMap) {
  const tempDir = join(TEMP, schemaName);
  const destDir = join(SRC, schemaName);

  console.log(`\n━━━ Syncing ${schemaName} schema ━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // 1. Clear temp dir so introspect starts fresh
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });

  // 2. Run introspect → .drizzle/{schemaName}/
  run(`pnpm drizzle-kit introspect --config=${configFile}`);

  // 3. Ensure dest dir exists
  mkdirSync(destDir, { recursive: true });

  // 4. Copy schema.ts + relations.ts
  for (const file of ['schema.ts', 'relations.ts']) {
    const src = join(tempDir, file);
    const dst = join(destDir, file);
    if (existsSync(src)) {
      copyFileSync(src, dst);
      console.log(`  ✓ Copied ${file} → src/schema/${schemaName}/${file}`);
    }
  }

  // 5. Auto-generate index.ts
  const schemaPath = join(destDir, 'schema.ts');
  const tableExports = extractTableExports(schemaPath, suffix);
  console.log(`  ✓ Found ${tableExports.length} table exports`);

  const indexContent = generateIndexTs(tableExports, suffix, domainMap, schemaName);
  writeFileSync(join(destDir, 'index.ts'), indexContent, 'utf8');
  console.log(`  ✓ Generated index.ts (${Object.keys(domainMap).length} domains)`);

  const unassigned = tableExports.filter(
    t => !Object.values(domainMap).flat().includes(t)
  );
  if (unassigned.length > 0) {
    console.warn(`  ⚠ ${unassigned.length} uncategorized table(s): ${unassigned.join(', ')}`);
    console.warn(`    → Add them to BUSINESS_DOMAINS or PLATFORM_DOMAINS in scripts/db-sync.js`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════╗');
console.log('║        DB Schema Sync (Drizzle ORM)      ║');
console.log('╚══════════════════════════════════════════╝');

if (runPlatform) {
  syncSchema(
    'platform',
    'drizzle.platform.config.ts',
    'InPlatform',
    PLATFORM_DOMAINS,
  );
}

if (runBusiness) {
  syncSchema(
    'business',
    'drizzle.business.config.ts',
    'InBusinessTemplate',
    BUSINESS_DOMAINS,
  );
}

console.log('\n✅ Done. Schema files updated in src/schema/');
console.log('   .drizzle/ is gitignored — safe to delete anytime.\n');
