import { relations } from "drizzle-orm/relations";
import { departmentsInBusinessTemplate, staffMembersInBusinessTemplate, storesInBusinessTemplate, customersInBusinessTemplate, customerAddressesInBusinessTemplate, stockLocationsInBusinessTemplate, registersInBusinessTemplate, floorPlansInBusinessTemplate, diningTablesInBusinessTemplate, customerGroupsInBusinessTemplate, productAttributeGroupsInBusinessTemplate, productAttributeValuesInBusinessTemplate, productCategoriesInBusinessTemplate, productsInBusinessTemplate, productVariantsInBusinessTemplate, comboItemsInBusinessTemplate, stockBalancesInBusinessTemplate, priceBooksInBusinessTemplate, priceBookItemsInBusinessTemplate, stocktakesInBusinessTemplate, purchaseOrdersInBusinessTemplate, suppliersInBusinessTemplate, stocktakeItemsInBusinessTemplate, workShiftsInBusinessTemplate, stockRulesInBusinessTemplate, stockTransfersInBusinessTemplate, salesOrdersInBusinessTemplate, orderReturnsInBusinessTemplate, orderReturnLinesInBusinessTemplate, salesOrderLinesInBusinessTemplate, tableSessionsInBusinessTemplate, kitchenTicketsInBusinessTemplate, kitchenTicketLinesInBusinessTemplate, customerLedgersInBusinessTemplate, appointmentsInBusinessTemplate, appointmentLinesInBusinessTemplate, timekeepingLogsInBusinessTemplate, payrollPeriodsInBusinessTemplate, payrollItemsInBusinessTemplate, cashAccountsInBusinessTemplate, chartOfAccountsInBusinessTemplate, journalLinesInBusinessTemplate, journalEntriesInBusinessTemplate, permissionsInBusinessTemplate, rolePermissionsInBusinessTemplate, rolesInBusinessTemplate, deviceBindingsInBusinessTemplate, printerDevicesInBusinessTemplate, staffAccountLinksInBusinessTemplate, staffRoleBindingsInBusinessTemplate, salesOrderStatusHistoryInBusinessTemplate, customerReceivablesInBusinessTemplate, salesOrderAdjustmentsInBusinessTemplate, customerCreditProfilesInBusinessTemplate, customerReceivablePaymentsInBusinessTemplate, paymentMethodsInBusinessTemplate, customerReceivableAllocationsInBusinessTemplate, customerReceivableAdjustmentsInBusinessTemplate, paymentRefundsInBusinessTemplate, orderPaymentsInBusinessTemplate, brandsInBusinessTemplate, taxClassesInBusinessTemplate, unitsInBusinessTemplate, productBarcodesInBusinessTemplate, productStoreSettingsInBusinessTemplate, productLotsInBusinessTemplate, productSerialsInBusinessTemplate, productRecipesInBusinessTemplate, productPriceHistoryInBusinessTemplate, productCostHistoryInBusinessTemplate, stockReservationsInBusinessTemplate, stockLotBalancesInBusinessTemplate, supplierPayablesInBusinessTemplate, supplierPaymentsInBusinessTemplate, supplierPaymentAllocationsInBusinessTemplate, deliveryOrdersInBusinessTemplate, reportDailySalesSnapshotsInBusinessTemplate, approvalRequestsInBusinessTemplate, offlineSyncBatchesInBusinessTemplate, invoiceNumberSequencesInBusinessTemplate, salesInvoicesInBusinessTemplate, salesInvoiceLinesInBusinessTemplate, salesInvoiceTaxesInBusinessTemplate, creditNotesInBusinessTemplate, creditNoteLinesInBusinessTemplate, debitNotesInBusinessTemplate, taxReportsInBusinessTemplate, cashDrawerMovementsInBusinessTemplate, shiftPaymentSummariesInBusinessTemplate, cashDenominationsInBusinessTemplate, shiftCashCountsInBusinessTemplate, bankStatementImportsInBusinessTemplate, bankTransactionsInBusinessTemplate, paymentReconciliationsInBusinessTemplate, paymentReconciliationItemsInBusinessTemplate, bankDepositsInBusinessTemplate, supplierReturnsInBusinessTemplate, supplierReturnLinesInBusinessTemplate, supplierCreditNotesInBusinessTemplate, receivingDiscrepanciesInBusinessTemplate, inventoryCostLayersInBusinessTemplate, cogsAllocationsInBusinessTemplate, landedCostsInBusinessTemplate, landedCostAllocationsInBusinessTemplate, inventoryCostAdjustmentsInBusinessTemplate, stockValuationSnapshotsInBusinessTemplate, salesChannelsInBusinessTemplate, channelProductMappingsInBusinessTemplate, channelOrderMappingsInBusinessTemplate, syncJobsInBusinessTemplate, syncJobLogsInBusinessTemplate, shipmentItemsInBusinessTemplate, shipmentsInBusinessTemplate, shippingCarriersInBusinessTemplate, shipmentPackagesInBusinessTemplate, shipmentTrackingEventsInBusinessTemplate, deliveryAttemptsInBusinessTemplate, codReconciliationsInBusinessTemplate, loyaltyPointTransactionsInBusinessTemplate, customerVouchersInBusinessTemplate, voucherBatchesInBusinessTemplate, giftCardsInBusinessTemplate, giftCardTransactionsInBusinessTemplate, customerWalletsInBusinessTemplate, walletTransactionsInBusinessTemplate, serviceOrdersInBusinessTemplate, customerInteractionsInBusinessTemplate, customerConsentsInBusinessTemplate, customerContactPreferencesInBusinessTemplate, campaignsInBusinessTemplate, campaignMessagesInBusinessTemplate, customerMergeRequestsInBusinessTemplate, serviceOrderLinesInBusinessTemplate, packageUsagesInBusinessTemplate, servicePackagesInBusinessTemplate, warrantyPoliciesInBusinessTemplate, warrantyClaimsInBusinessTemplate, kitchenStationsInBusinessTemplate, productionOrdersInBusinessTemplate, productionOrderLinesInBusinessTemplate, ingredientConsumptionsInBusinessTemplate, stockTransactionsInBusinessTemplate, prepBatchesInBusinessTemplate, menuAvailabilityInBusinessTemplate, periodLocksInBusinessTemplate, closingRunsInBusinessTemplate, closingRunItemsInBusinessTemplate, reopenPeriodRequestsInBusinessTemplate, wasteLogsInBusinessTemplate, roleChangeHistoryInBusinessTemplate, permissionChangeHistoryInBusinessTemplate, temporaryPermissionGrantsInBusinessTemplate, purchaseOrderLinesInBusinessTemplate, stockTransferItemsInBusinessTemplate, cashTransactionsInBusinessTemplate, productTagMappingsInBusinessTemplate, productTagsInBusinessTemplate, customerTagMappingsInBusinessTemplate, customerTagsInBusinessTemplate, productUnitsInBusinessTemplate } from "./schema";

export const staffMembersInBusinessTemplateRelations = relations(staffMembersInBusinessTemplate, ({one, many}) => ({
	departmentsInBusinessTemplate: one(departmentsInBusinessTemplate, {
		fields: [staffMembersInBusinessTemplate.departmentId],
		references: [departmentsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [staffMembersInBusinessTemplate.primaryStoreId],
		references: [storesInBusinessTemplate.id]
	}),
	registersInBusinessTemplates: many(registersInBusinessTemplate),
	workShiftsInBusinessTemplates: many(workShiftsInBusinessTemplate),
	customerLedgersInBusinessTemplates: many(customerLedgersInBusinessTemplate),
	appointmentsInBusinessTemplates: many(appointmentsInBusinessTemplate),
	appointmentLinesInBusinessTemplates: many(appointmentLinesInBusinessTemplate),
	timekeepingLogsInBusinessTemplates: many(timekeepingLogsInBusinessTemplate),
	payrollItemsInBusinessTemplates: many(payrollItemsInBusinessTemplate),
	staffAccountLinksInBusinessTemplates: many(staffAccountLinksInBusinessTemplate),
	staffRoleBindingsInBusinessTemplates: many(staffRoleBindingsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
	serviceOrdersInBusinessTemplates: many(serviceOrdersInBusinessTemplate),
	customerInteractionsInBusinessTemplates: many(customerInteractionsInBusinessTemplate),
	roleChangeHistoryInBusinessTemplates: many(roleChangeHistoryInBusinessTemplate),
	temporaryPermissionGrantsInBusinessTemplates: many(temporaryPermissionGrantsInBusinessTemplate),
}));

export const departmentsInBusinessTemplateRelations = relations(departmentsInBusinessTemplate, ({one, many}) => ({
	staffMembersInBusinessTemplates: many(staffMembersInBusinessTemplate),
	departmentsInBusinessTemplate: one(departmentsInBusinessTemplate, {
		fields: [departmentsInBusinessTemplate.parentId],
		references: [departmentsInBusinessTemplate.id],
		relationName: "departmentsInBusinessTemplate_parentId_departmentsInBusinessTemplate_id"
	}),
	departmentsInBusinessTemplates: many(departmentsInBusinessTemplate, {
		relationName: "departmentsInBusinessTemplate_parentId_departmentsInBusinessTemplate_id"
	}),
}));

export const storesInBusinessTemplateRelations = relations(storesInBusinessTemplate, ({one, many}) => ({
	staffMembersInBusinessTemplates: many(staffMembersInBusinessTemplate),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [storesInBusinessTemplate.parentId],
		references: [storesInBusinessTemplate.id],
		relationName: "storesInBusinessTemplate_parentId_storesInBusinessTemplate_id"
	}),
	storesInBusinessTemplates: many(storesInBusinessTemplate, {
		relationName: "storesInBusinessTemplate_parentId_storesInBusinessTemplate_id"
	}),
	stockLocationsInBusinessTemplates: many(stockLocationsInBusinessTemplate),
	registersInBusinessTemplates: many(registersInBusinessTemplate),
	floorPlansInBusinessTemplates: many(floorPlansInBusinessTemplate),
	diningTablesInBusinessTemplates: many(diningTablesInBusinessTemplate),
	stocktakesInBusinessTemplates: many(stocktakesInBusinessTemplate),
	purchaseOrdersInBusinessTemplates: many(purchaseOrdersInBusinessTemplate),
	workShiftsInBusinessTemplates: many(workShiftsInBusinessTemplate),
	stockTransfersInBusinessTemplates: many(stockTransfersInBusinessTemplate),
	orderReturnsInBusinessTemplates: many(orderReturnsInBusinessTemplate),
	tableSessionsInBusinessTemplates: many(tableSessionsInBusinessTemplate),
	kitchenTicketsInBusinessTemplates: many(kitchenTicketsInBusinessTemplate),
	customerLedgersInBusinessTemplates: many(customerLedgersInBusinessTemplate),
	appointmentsInBusinessTemplates: many(appointmentsInBusinessTemplate),
	timekeepingLogsInBusinessTemplates: many(timekeepingLogsInBusinessTemplate),
	payrollPeriodsInBusinessTemplates: many(payrollPeriodsInBusinessTemplate),
	cashAccountsInBusinessTemplates: many(cashAccountsInBusinessTemplate),
	deviceBindingsInBusinessTemplates: many(deviceBindingsInBusinessTemplate),
	printerDevicesInBusinessTemplates: many(printerDevicesInBusinessTemplate),
	journalEntriesInBusinessTemplates: many(journalEntriesInBusinessTemplate),
	staffRoleBindingsInBusinessTemplates: many(staffRoleBindingsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
	customerReceivablesInBusinessTemplates: many(customerReceivablesInBusinessTemplate),
	customerReceivablePaymentsInBusinessTemplates: many(customerReceivablePaymentsInBusinessTemplate),
	productStoreSettingsInBusinessTemplates: many(productStoreSettingsInBusinessTemplate),
	productSerialsInBusinessTemplates: many(productSerialsInBusinessTemplate),
	productPriceHistoryInBusinessTemplates: many(productPriceHistoryInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	supplierPayablesInBusinessTemplates: many(supplierPayablesInBusinessTemplate),
	supplierPaymentsInBusinessTemplates: many(supplierPaymentsInBusinessTemplate),
	deliveryOrdersInBusinessTemplates: many(deliveryOrdersInBusinessTemplate),
	reportDailySalesSnapshotsInBusinessTemplates: many(reportDailySalesSnapshotsInBusinessTemplate),
	approvalRequestsInBusinessTemplates: many(approvalRequestsInBusinessTemplate),
	offlineSyncBatchesInBusinessTemplates: many(offlineSyncBatchesInBusinessTemplate),
	invoiceNumberSequencesInBusinessTemplates: many(invoiceNumberSequencesInBusinessTemplate),
	salesInvoicesInBusinessTemplates: many(salesInvoicesInBusinessTemplate),
	creditNotesInBusinessTemplates: many(creditNotesInBusinessTemplate),
	debitNotesInBusinessTemplates: many(debitNotesInBusinessTemplate),
	taxReportsInBusinessTemplates: many(taxReportsInBusinessTemplate),
	cashDrawerMovementsInBusinessTemplates: many(cashDrawerMovementsInBusinessTemplate),
	bankStatementImportsInBusinessTemplates: many(bankStatementImportsInBusinessTemplate),
	paymentReconciliationsInBusinessTemplates: many(paymentReconciliationsInBusinessTemplate),
	bankDepositsInBusinessTemplates: many(bankDepositsInBusinessTemplate),
	supplierReturnsInBusinessTemplates: many(supplierReturnsInBusinessTemplate),
	supplierCreditNotesInBusinessTemplates: many(supplierCreditNotesInBusinessTemplate),
	landedCostsInBusinessTemplates: many(landedCostsInBusinessTemplate),
	inventoryCostAdjustmentsInBusinessTemplates: many(inventoryCostAdjustmentsInBusinessTemplate),
	stockValuationSnapshotsInBusinessTemplates: many(stockValuationSnapshotsInBusinessTemplate),
	shipmentsInBusinessTemplates: many(shipmentsInBusinessTemplate),
	loyaltyPointTransactionsInBusinessTemplates: many(loyaltyPointTransactionsInBusinessTemplate),
	serviceOrdersInBusinessTemplates: many(serviceOrdersInBusinessTemplate),
	customerInteractionsInBusinessTemplates: many(customerInteractionsInBusinessTemplate),
	kitchenStationsInBusinessTemplates: many(kitchenStationsInBusinessTemplate),
	productionOrdersInBusinessTemplates: many(productionOrdersInBusinessTemplate),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	prepBatchesInBusinessTemplates: many(prepBatchesInBusinessTemplate),
	menuAvailabilityInBusinessTemplates: many(menuAvailabilityInBusinessTemplate),
	periodLocksInBusinessTemplates: many(periodLocksInBusinessTemplate),
	closingRunsInBusinessTemplates: many(closingRunsInBusinessTemplate),
	reopenPeriodRequestsInBusinessTemplates: many(reopenPeriodRequestsInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	roleChangeHistoryInBusinessTemplates: many(roleChangeHistoryInBusinessTemplate),
	temporaryPermissionGrantsInBusinessTemplates: many(temporaryPermissionGrantsInBusinessTemplate),
	cashTransactionsInBusinessTemplates: many(cashTransactionsInBusinessTemplate),
	stockTransactionsInBusinessTemplates: many(stockTransactionsInBusinessTemplate),
}));

export const customerAddressesInBusinessTemplateRelations = relations(customerAddressesInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerAddressesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
}));

export const customersInBusinessTemplateRelations = relations(customersInBusinessTemplate, ({one, many}) => ({
	customerAddressesInBusinessTemplates: many(customerAddressesInBusinessTemplate),
	customerGroupsInBusinessTemplate: one(customerGroupsInBusinessTemplate, {
		fields: [customersInBusinessTemplate.groupId],
		references: [customerGroupsInBusinessTemplate.id]
	}),
	customerLedgersInBusinessTemplates: many(customerLedgersInBusinessTemplate),
	appointmentsInBusinessTemplates: many(appointmentsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
	customerReceivablesInBusinessTemplates: many(customerReceivablesInBusinessTemplate),
	customerCreditProfilesInBusinessTemplates: many(customerCreditProfilesInBusinessTemplate),
	customerReceivablePaymentsInBusinessTemplates: many(customerReceivablePaymentsInBusinessTemplate),
	salesInvoicesInBusinessTemplates: many(salesInvoicesInBusinessTemplate),
	creditNotesInBusinessTemplates: many(creditNotesInBusinessTemplate),
	debitNotesInBusinessTemplates: many(debitNotesInBusinessTemplate),
	loyaltyPointTransactionsInBusinessTemplates: many(loyaltyPointTransactionsInBusinessTemplate),
	customerVouchersInBusinessTemplates: many(customerVouchersInBusinessTemplate),
	giftCardsInBusinessTemplates: many(giftCardsInBusinessTemplate),
	customerWalletsInBusinessTemplates: many(customerWalletsInBusinessTemplate),
	serviceOrdersInBusinessTemplates: many(serviceOrdersInBusinessTemplate),
	customerInteractionsInBusinessTemplates: many(customerInteractionsInBusinessTemplate),
	customerConsentsInBusinessTemplates: many(customerConsentsInBusinessTemplate),
	customerContactPreferencesInBusinessTemplates: many(customerContactPreferencesInBusinessTemplate),
	campaignMessagesInBusinessTemplates: many(campaignMessagesInBusinessTemplate),
	customerMergeRequestsInBusinessTemplates_duplicateCustomerId: many(customerMergeRequestsInBusinessTemplate, {
		relationName: "customerMergeRequestsInBusinessTemplate_duplicateCustomerId_customersInBusinessTemplate_id"
	}),
	customerMergeRequestsInBusinessTemplates_primaryCustomerId: many(customerMergeRequestsInBusinessTemplate, {
		relationName: "customerMergeRequestsInBusinessTemplate_primaryCustomerId_customersInBusinessTemplate_id"
	}),
	packageUsagesInBusinessTemplates: many(packageUsagesInBusinessTemplate),
	warrantyClaimsInBusinessTemplates: many(warrantyClaimsInBusinessTemplate),
	customerTagMappingsInBusinessTemplates: many(customerTagMappingsInBusinessTemplate),
}));

export const stockLocationsInBusinessTemplateRelations = relations(stockLocationsInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stockLocationsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	stockBalancesInBusinessTemplates: many(stockBalancesInBusinessTemplate),
	stocktakesInBusinessTemplates: many(stocktakesInBusinessTemplate),
	stockRulesInBusinessTemplates: many(stockRulesInBusinessTemplate),
	stockTransfersInBusinessTemplates_fromLocationId: many(stockTransfersInBusinessTemplate, {
		relationName: "stockTransfersInBusinessTemplate_fromLocationId_stockLocationsInBusinessTemplate_id"
	}),
	stockTransfersInBusinessTemplates_toLocationId: many(stockTransfersInBusinessTemplate, {
		relationName: "stockTransfersInBusinessTemplate_toLocationId_stockLocationsInBusinessTemplate_id"
	}),
	productSerialsInBusinessTemplates: many(productSerialsInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	stockLotBalancesInBusinessTemplates: many(stockLotBalancesInBusinessTemplate),
	inventoryCostLayersInBusinessTemplates: many(inventoryCostLayersInBusinessTemplate),
	stockValuationSnapshotsInBusinessTemplates: many(stockValuationSnapshotsInBusinessTemplate),
	productionOrdersInBusinessTemplates: many(productionOrdersInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	stockTransactionsInBusinessTemplates: many(stockTransactionsInBusinessTemplate),
}));

export const registersInBusinessTemplateRelations = relations(registersInBusinessTemplate, ({one, many}) => ({
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [registersInBusinessTemplate.currentStaffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [registersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	workShiftsInBusinessTemplates: many(workShiftsInBusinessTemplate),
	deviceBindingsInBusinessTemplates: many(deviceBindingsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
	offlineSyncBatchesInBusinessTemplates: many(offlineSyncBatchesInBusinessTemplate),
	cashDrawerMovementsInBusinessTemplates: many(cashDrawerMovementsInBusinessTemplate),
}));

export const floorPlansInBusinessTemplateRelations = relations(floorPlansInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [floorPlansInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	diningTablesInBusinessTemplates: many(diningTablesInBusinessTemplate),
}));

export const diningTablesInBusinessTemplateRelations = relations(diningTablesInBusinessTemplate, ({one, many}) => ({
	floorPlansInBusinessTemplate: one(floorPlansInBusinessTemplate, {
		fields: [diningTablesInBusinessTemplate.floorId],
		references: [floorPlansInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [diningTablesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	tableSessionsInBusinessTemplates: many(tableSessionsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
}));

export const customerGroupsInBusinessTemplateRelations = relations(customerGroupsInBusinessTemplate, ({many}) => ({
	customersInBusinessTemplates: many(customersInBusinessTemplate),
}));

export const productAttributeValuesInBusinessTemplateRelations = relations(productAttributeValuesInBusinessTemplate, ({one}) => ({
	productAttributeGroupsInBusinessTemplate: one(productAttributeGroupsInBusinessTemplate, {
		fields: [productAttributeValuesInBusinessTemplate.groupId],
		references: [productAttributeGroupsInBusinessTemplate.id]
	}),
}));

export const productAttributeGroupsInBusinessTemplateRelations = relations(productAttributeGroupsInBusinessTemplate, ({many}) => ({
	productAttributeValuesInBusinessTemplates: many(productAttributeValuesInBusinessTemplate),
}));

export const productCategoriesInBusinessTemplateRelations = relations(productCategoriesInBusinessTemplate, ({one, many}) => ({
	productCategoriesInBusinessTemplate: one(productCategoriesInBusinessTemplate, {
		fields: [productCategoriesInBusinessTemplate.parentId],
		references: [productCategoriesInBusinessTemplate.id],
		relationName: "productCategoriesInBusinessTemplate_parentId_productCategoriesInBusinessTemplate_id"
	}),
	productCategoriesInBusinessTemplates: many(productCategoriesInBusinessTemplate, {
		relationName: "productCategoriesInBusinessTemplate_parentId_productCategoriesInBusinessTemplate_id"
	}),
	productsInBusinessTemplates: many(productsInBusinessTemplate),
}));

export const productVariantsInBusinessTemplateRelations = relations(productVariantsInBusinessTemplate, ({one, many}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productVariantsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	comboItemsInBusinessTemplates: many(comboItemsInBusinessTemplate),
	stockBalancesInBusinessTemplates: many(stockBalancesInBusinessTemplate),
	priceBookItemsInBusinessTemplates: many(priceBookItemsInBusinessTemplate),
	stocktakeItemsInBusinessTemplates: many(stocktakeItemsInBusinessTemplate),
	orderReturnLinesInBusinessTemplates: many(orderReturnLinesInBusinessTemplate),
	appointmentLinesInBusinessTemplates: many(appointmentLinesInBusinessTemplate),
	productBarcodesInBusinessTemplates: many(productBarcodesInBusinessTemplate),
	productStoreSettingsInBusinessTemplates: many(productStoreSettingsInBusinessTemplate),
	productLotsInBusinessTemplates: many(productLotsInBusinessTemplate),
	productSerialsInBusinessTemplates: many(productSerialsInBusinessTemplate),
	productRecipesInBusinessTemplates_ingredientVariantId: many(productRecipesInBusinessTemplate, {
		relationName: "productRecipesInBusinessTemplate_ingredientVariantId_productVariantsInBusinessTemplate_id"
	}),
	productRecipesInBusinessTemplates_variantId: many(productRecipesInBusinessTemplate, {
		relationName: "productRecipesInBusinessTemplate_variantId_productVariantsInBusinessTemplate_id"
	}),
	productPriceHistoryInBusinessTemplates: many(productPriceHistoryInBusinessTemplate),
	productCostHistoryInBusinessTemplates: many(productCostHistoryInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	stockLotBalancesInBusinessTemplates: many(stockLotBalancesInBusinessTemplate),
	salesInvoiceLinesInBusinessTemplates: many(salesInvoiceLinesInBusinessTemplate),
	supplierReturnLinesInBusinessTemplates: many(supplierReturnLinesInBusinessTemplate),
	receivingDiscrepanciesInBusinessTemplates_variantId: many(receivingDiscrepanciesInBusinessTemplate, {
		relationName: "receivingDiscrepanciesInBusinessTemplate_variantId_productVariantsInBusinessTemplate_id"
	}),
	inventoryCostLayersInBusinessTemplates: many(inventoryCostLayersInBusinessTemplate),
	cogsAllocationsInBusinessTemplates: many(cogsAllocationsInBusinessTemplate),
	landedCostAllocationsInBusinessTemplates: many(landedCostAllocationsInBusinessTemplate),
	inventoryCostAdjustmentsInBusinessTemplates: many(inventoryCostAdjustmentsInBusinessTemplate),
	stockValuationSnapshotsInBusinessTemplates: many(stockValuationSnapshotsInBusinessTemplate),
	channelProductMappingsInBusinessTemplates: many(channelProductMappingsInBusinessTemplate),
	shipmentItemsInBusinessTemplates: many(shipmentItemsInBusinessTemplate),
	productionOrdersInBusinessTemplates: many(productionOrdersInBusinessTemplate),
	productionOrderLinesInBusinessTemplates: many(productionOrderLinesInBusinessTemplate),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	prepBatchesInBusinessTemplates: many(prepBatchesInBusinessTemplate),
	menuAvailabilityInBusinessTemplates: many(menuAvailabilityInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	salesOrderLinesInBusinessTemplates: many(salesOrderLinesInBusinessTemplate),
	purchaseOrderLinesInBusinessTemplates: many(purchaseOrderLinesInBusinessTemplate),
	stockTransferItemsInBusinessTemplates: many(stockTransferItemsInBusinessTemplate),
	stockTransactionsInBusinessTemplates: many(stockTransactionsInBusinessTemplate),
}));

export const productsInBusinessTemplateRelations = relations(productsInBusinessTemplate, ({one, many}) => ({
	productVariantsInBusinessTemplates: many(productVariantsInBusinessTemplate),
	comboItemsInBusinessTemplates_comboProductId: many(comboItemsInBusinessTemplate, {
		relationName: "comboItemsInBusinessTemplate_comboProductId_productsInBusinessTemplate_id"
	}),
	comboItemsInBusinessTemplates_itemProductId: many(comboItemsInBusinessTemplate, {
		relationName: "comboItemsInBusinessTemplate_itemProductId_productsInBusinessTemplate_id"
	}),
	stockBalancesInBusinessTemplates: many(stockBalancesInBusinessTemplate),
	priceBookItemsInBusinessTemplates: many(priceBookItemsInBusinessTemplate),
	stocktakeItemsInBusinessTemplates: many(stocktakeItemsInBusinessTemplate),
	stockRulesInBusinessTemplates: many(stockRulesInBusinessTemplate),
	orderReturnLinesInBusinessTemplates: many(orderReturnLinesInBusinessTemplate),
	appointmentLinesInBusinessTemplates: many(appointmentLinesInBusinessTemplate),
	brandsInBusinessTemplate: one(brandsInBusinessTemplate, {
		fields: [productsInBusinessTemplate.brandId],
		references: [brandsInBusinessTemplate.id]
	}),
	productCategoriesInBusinessTemplate: one(productCategoriesInBusinessTemplate, {
		fields: [productsInBusinessTemplate.categoryId],
		references: [productCategoriesInBusinessTemplate.id]
	}),
	taxClassesInBusinessTemplate: one(taxClassesInBusinessTemplate, {
		fields: [productsInBusinessTemplate.taxId],
		references: [taxClassesInBusinessTemplate.id]
	}),
	unitsInBusinessTemplate: one(unitsInBusinessTemplate, {
		fields: [productsInBusinessTemplate.unitId],
		references: [unitsInBusinessTemplate.id]
	}),
	productBarcodesInBusinessTemplates: many(productBarcodesInBusinessTemplate),
	productStoreSettingsInBusinessTemplates: many(productStoreSettingsInBusinessTemplate),
	productLotsInBusinessTemplates: many(productLotsInBusinessTemplate),
	productSerialsInBusinessTemplates: many(productSerialsInBusinessTemplate),
	productRecipesInBusinessTemplates_ingredientProductId: many(productRecipesInBusinessTemplate, {
		relationName: "productRecipesInBusinessTemplate_ingredientProductId_productsInBusinessTemplate_id"
	}),
	productRecipesInBusinessTemplates_productId: many(productRecipesInBusinessTemplate, {
		relationName: "productRecipesInBusinessTemplate_productId_productsInBusinessTemplate_id"
	}),
	productPriceHistoryInBusinessTemplates: many(productPriceHistoryInBusinessTemplate),
	productCostHistoryInBusinessTemplates: many(productCostHistoryInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	stockLotBalancesInBusinessTemplates: many(stockLotBalancesInBusinessTemplate),
	salesInvoiceLinesInBusinessTemplates: many(salesInvoiceLinesInBusinessTemplate),
	supplierReturnLinesInBusinessTemplates: many(supplierReturnLinesInBusinessTemplate),
	receivingDiscrepanciesInBusinessTemplates: many(receivingDiscrepanciesInBusinessTemplate),
	inventoryCostLayersInBusinessTemplates: many(inventoryCostLayersInBusinessTemplate),
	cogsAllocationsInBusinessTemplates: many(cogsAllocationsInBusinessTemplate),
	landedCostAllocationsInBusinessTemplates: many(landedCostAllocationsInBusinessTemplate),
	inventoryCostAdjustmentsInBusinessTemplates: many(inventoryCostAdjustmentsInBusinessTemplate),
	stockValuationSnapshotsInBusinessTemplates: many(stockValuationSnapshotsInBusinessTemplate),
	channelProductMappingsInBusinessTemplates: many(channelProductMappingsInBusinessTemplate),
	shipmentItemsInBusinessTemplates: many(shipmentItemsInBusinessTemplate),
	serviceOrderLinesInBusinessTemplates: many(serviceOrderLinesInBusinessTemplate),
	warrantyPoliciesInBusinessTemplates: many(warrantyPoliciesInBusinessTemplate),
	warrantyClaimsInBusinessTemplates: many(warrantyClaimsInBusinessTemplate),
	servicePackagesInBusinessTemplates: many(servicePackagesInBusinessTemplate),
	productionOrdersInBusinessTemplates: many(productionOrdersInBusinessTemplate),
	productionOrderLinesInBusinessTemplates: many(productionOrderLinesInBusinessTemplate),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	prepBatchesInBusinessTemplates: many(prepBatchesInBusinessTemplate),
	menuAvailabilityInBusinessTemplates: many(menuAvailabilityInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	salesOrderLinesInBusinessTemplates: many(salesOrderLinesInBusinessTemplate),
	purchaseOrderLinesInBusinessTemplates: many(purchaseOrderLinesInBusinessTemplate),
	stockTransferItemsInBusinessTemplates: many(stockTransferItemsInBusinessTemplate),
	stockTransactionsInBusinessTemplates: many(stockTransactionsInBusinessTemplate),
	productTagMappingsInBusinessTemplates: many(productTagMappingsInBusinessTemplate),
	productUnitsInBusinessTemplates: many(productUnitsInBusinessTemplate),
}));

export const comboItemsInBusinessTemplateRelations = relations(comboItemsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate_comboProductId: one(productsInBusinessTemplate, {
		fields: [comboItemsInBusinessTemplate.comboProductId],
		references: [productsInBusinessTemplate.id],
		relationName: "comboItemsInBusinessTemplate_comboProductId_productsInBusinessTemplate_id"
	}),
	productsInBusinessTemplate_itemProductId: one(productsInBusinessTemplate, {
		fields: [comboItemsInBusinessTemplate.itemProductId],
		references: [productsInBusinessTemplate.id],
		relationName: "comboItemsInBusinessTemplate_itemProductId_productsInBusinessTemplate_id"
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [comboItemsInBusinessTemplate.itemVariantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const stockBalancesInBusinessTemplateRelations = relations(stockBalancesInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockBalancesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockBalancesInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockBalancesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const priceBookItemsInBusinessTemplateRelations = relations(priceBookItemsInBusinessTemplate, ({one}) => ({
	priceBooksInBusinessTemplate: one(priceBooksInBusinessTemplate, {
		fields: [priceBookItemsInBusinessTemplate.priceBookId],
		references: [priceBooksInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [priceBookItemsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [priceBookItemsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const priceBooksInBusinessTemplateRelations = relations(priceBooksInBusinessTemplate, ({many}) => ({
	priceBookItemsInBusinessTemplates: many(priceBookItemsInBusinessTemplate),
}));

export const stocktakesInBusinessTemplateRelations = relations(stocktakesInBusinessTemplate, ({one, many}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stocktakesInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stocktakesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	stocktakeItemsInBusinessTemplates: many(stocktakeItemsInBusinessTemplate),
}));

export const purchaseOrdersInBusinessTemplateRelations = relations(purchaseOrdersInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [purchaseOrdersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [purchaseOrdersInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	supplierPayablesInBusinessTemplates: many(supplierPayablesInBusinessTemplate),
	supplierPaymentAllocationsInBusinessTemplates: many(supplierPaymentAllocationsInBusinessTemplate),
	supplierReturnsInBusinessTemplates: many(supplierReturnsInBusinessTemplate),
	receivingDiscrepanciesInBusinessTemplates: many(receivingDiscrepanciesInBusinessTemplate),
	landedCostsInBusinessTemplates: many(landedCostsInBusinessTemplate),
	purchaseOrderLinesInBusinessTemplates: many(purchaseOrderLinesInBusinessTemplate),
}));

export const suppliersInBusinessTemplateRelations = relations(suppliersInBusinessTemplate, ({many}) => ({
	purchaseOrdersInBusinessTemplates: many(purchaseOrdersInBusinessTemplate),
	productLotsInBusinessTemplates: many(productLotsInBusinessTemplate),
	supplierPayablesInBusinessTemplates: many(supplierPayablesInBusinessTemplate),
	supplierPaymentsInBusinessTemplates: many(supplierPaymentsInBusinessTemplate),
	supplierReturnsInBusinessTemplates: many(supplierReturnsInBusinessTemplate),
	supplierCreditNotesInBusinessTemplates: many(supplierCreditNotesInBusinessTemplate),
}));

export const stocktakeItemsInBusinessTemplateRelations = relations(stocktakeItemsInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stocktakeItemsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stocktakeItemsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	stocktakesInBusinessTemplate: one(stocktakesInBusinessTemplate, {
		fields: [stocktakeItemsInBusinessTemplate.stocktakeId],
		references: [stocktakesInBusinessTemplate.id]
	}),
}));

export const workShiftsInBusinessTemplateRelations = relations(workShiftsInBusinessTemplate, ({one, many}) => ({
	registersInBusinessTemplate: one(registersInBusinessTemplate, {
		fields: [workShiftsInBusinessTemplate.registerId],
		references: [registersInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [workShiftsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [workShiftsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	timekeepingLogsInBusinessTemplates: many(timekeepingLogsInBusinessTemplate),
	salesOrdersInBusinessTemplates: many(salesOrdersInBusinessTemplate),
	cashDrawerMovementsInBusinessTemplates: many(cashDrawerMovementsInBusinessTemplate),
	shiftPaymentSummariesInBusinessTemplates: many(shiftPaymentSummariesInBusinessTemplate),
	shiftCashCountsInBusinessTemplates: many(shiftCashCountsInBusinessTemplate),
}));

export const stockRulesInBusinessTemplateRelations = relations(stockRulesInBusinessTemplate, ({one}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockRulesInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockRulesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const stockTransfersInBusinessTemplateRelations = relations(stockTransfersInBusinessTemplate, ({one, many}) => ({
	stockLocationsInBusinessTemplate_fromLocationId: one(stockLocationsInBusinessTemplate, {
		fields: [stockTransfersInBusinessTemplate.fromLocationId],
		references: [stockLocationsInBusinessTemplate.id],
		relationName: "stockTransfersInBusinessTemplate_fromLocationId_stockLocationsInBusinessTemplate_id"
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stockTransfersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	stockLocationsInBusinessTemplate_toLocationId: one(stockLocationsInBusinessTemplate, {
		fields: [stockTransfersInBusinessTemplate.toLocationId],
		references: [stockLocationsInBusinessTemplate.id],
		relationName: "stockTransfersInBusinessTemplate_toLocationId_stockLocationsInBusinessTemplate_id"
	}),
	stockTransferItemsInBusinessTemplates: many(stockTransferItemsInBusinessTemplate),
}));

export const orderReturnsInBusinessTemplateRelations = relations(orderReturnsInBusinessTemplate, ({one, many}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [orderReturnsInBusinessTemplate.originalOrderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [orderReturnsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	orderReturnLinesInBusinessTemplates: many(orderReturnLinesInBusinessTemplate),
	paymentRefundsInBusinessTemplates: many(paymentRefundsInBusinessTemplate),
}));

export const salesOrdersInBusinessTemplateRelations = relations(salesOrdersInBusinessTemplate, ({one, many}) => ({
	orderReturnsInBusinessTemplates: many(orderReturnsInBusinessTemplate),
	tableSessionsInBusinessTemplates: many(tableSessionsInBusinessTemplate),
	kitchenTicketsInBusinessTemplates: many(kitchenTicketsInBusinessTemplate),
	appointmentsInBusinessTemplates: many(appointmentsInBusinessTemplate),
	diningTablesInBusinessTemplate: one(diningTablesInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.tableId],
		references: [diningTablesInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.cashierId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	registersInBusinessTemplate: one(registersInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.registerId],
		references: [registersInBusinessTemplate.id]
	}),
	workShiftsInBusinessTemplate: one(workShiftsInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.shiftId],
		references: [workShiftsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [salesOrdersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	salesOrderStatusHistoryInBusinessTemplates: many(salesOrderStatusHistoryInBusinessTemplate),
	customerReceivablesInBusinessTemplates: many(customerReceivablesInBusinessTemplate),
	salesOrderAdjustmentsInBusinessTemplates: many(salesOrderAdjustmentsInBusinessTemplate),
	customerReceivableAllocationsInBusinessTemplates: many(customerReceivableAllocationsInBusinessTemplate),
	paymentRefundsInBusinessTemplates: many(paymentRefundsInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	deliveryOrdersInBusinessTemplates: many(deliveryOrdersInBusinessTemplate),
	salesInvoicesInBusinessTemplates: many(salesInvoicesInBusinessTemplate),
	creditNotesInBusinessTemplates: many(creditNotesInBusinessTemplate),
	cogsAllocationsInBusinessTemplates: many(cogsAllocationsInBusinessTemplate),
	channelOrderMappingsInBusinessTemplates: many(channelOrderMappingsInBusinessTemplate),
	shipmentsInBusinessTemplates: many(shipmentsInBusinessTemplate),
	customerVouchersInBusinessTemplates: many(customerVouchersInBusinessTemplate),
	serviceOrdersInBusinessTemplates: many(serviceOrdersInBusinessTemplate),
	packageUsagesInBusinessTemplates: many(packageUsagesInBusinessTemplate),
	warrantyClaimsInBusinessTemplates: many(warrantyClaimsInBusinessTemplate),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	orderPaymentsInBusinessTemplates: many(orderPaymentsInBusinessTemplate),
	salesOrderLinesInBusinessTemplates: many(salesOrderLinesInBusinessTemplate),
}));

export const orderReturnLinesInBusinessTemplateRelations = relations(orderReturnLinesInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [orderReturnLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [orderReturnLinesInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [orderReturnLinesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	orderReturnsInBusinessTemplate: one(orderReturnsInBusinessTemplate, {
		fields: [orderReturnLinesInBusinessTemplate.returnId],
		references: [orderReturnsInBusinessTemplate.id]
	}),
}));

export const salesOrderLinesInBusinessTemplateRelations = relations(salesOrderLinesInBusinessTemplate, ({one, many}) => ({
	orderReturnLinesInBusinessTemplates: many(orderReturnLinesInBusinessTemplate),
	kitchenTicketLinesInBusinessTemplates: many(kitchenTicketLinesInBusinessTemplate),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	salesInvoiceLinesInBusinessTemplates: many(salesInvoiceLinesInBusinessTemplate),
	cogsAllocationsInBusinessTemplates: many(cogsAllocationsInBusinessTemplate),
	shipmentItemsInBusinessTemplates_orderLineId: many(shipmentItemsInBusinessTemplate, {
		relationName: "shipmentItemsInBusinessTemplate_orderLineId_salesOrderLinesInBusinessTemplate_id"
	}),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [salesOrderLinesInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [salesOrderLinesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [salesOrderLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const tableSessionsInBusinessTemplateRelations = relations(tableSessionsInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [tableSessionsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [tableSessionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	diningTablesInBusinessTemplate: one(diningTablesInBusinessTemplate, {
		fields: [tableSessionsInBusinessTemplate.tableId],
		references: [diningTablesInBusinessTemplate.id]
	}),
}));

export const kitchenTicketsInBusinessTemplateRelations = relations(kitchenTicketsInBusinessTemplate, ({one, many}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [kitchenTicketsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [kitchenTicketsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	kitchenTicketLinesInBusinessTemplates: many(kitchenTicketLinesInBusinessTemplate),
}));

export const kitchenTicketLinesInBusinessTemplateRelations = relations(kitchenTicketLinesInBusinessTemplate, ({one}) => ({
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [kitchenTicketLinesInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	kitchenTicketsInBusinessTemplate: one(kitchenTicketsInBusinessTemplate, {
		fields: [kitchenTicketLinesInBusinessTemplate.ticketId],
		references: [kitchenTicketsInBusinessTemplate.id]
	}),
}));

export const customerLedgersInBusinessTemplateRelations = relations(customerLedgersInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerLedgersInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [customerLedgersInBusinessTemplate.createdBy],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [customerLedgersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const appointmentsInBusinessTemplateRelations = relations(appointmentsInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [appointmentsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [appointmentsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [appointmentsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [appointmentsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	appointmentLinesInBusinessTemplates: many(appointmentLinesInBusinessTemplate),
}));

export const appointmentLinesInBusinessTemplateRelations = relations(appointmentLinesInBusinessTemplate, ({one}) => ({
	appointmentsInBusinessTemplate: one(appointmentsInBusinessTemplate, {
		fields: [appointmentLinesInBusinessTemplate.appointmentId],
		references: [appointmentsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [appointmentLinesInBusinessTemplate.serviceProductId],
		references: [productsInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [appointmentLinesInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [appointmentLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const timekeepingLogsInBusinessTemplateRelations = relations(timekeepingLogsInBusinessTemplate, ({one}) => ({
	workShiftsInBusinessTemplate: one(workShiftsInBusinessTemplate, {
		fields: [timekeepingLogsInBusinessTemplate.shiftId],
		references: [workShiftsInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [timekeepingLogsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [timekeepingLogsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const payrollPeriodsInBusinessTemplateRelations = relations(payrollPeriodsInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [payrollPeriodsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	payrollItemsInBusinessTemplates: many(payrollItemsInBusinessTemplate),
}));

export const payrollItemsInBusinessTemplateRelations = relations(payrollItemsInBusinessTemplate, ({one}) => ({
	payrollPeriodsInBusinessTemplate: one(payrollPeriodsInBusinessTemplate, {
		fields: [payrollItemsInBusinessTemplate.periodId],
		references: [payrollPeriodsInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [payrollItemsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
}));

export const cashAccountsInBusinessTemplateRelations = relations(cashAccountsInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [cashAccountsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	cashDrawerMovementsInBusinessTemplates: many(cashDrawerMovementsInBusinessTemplate),
	bankStatementImportsInBusinessTemplates: many(bankStatementImportsInBusinessTemplate),
	bankTransactionsInBusinessTemplates: many(bankTransactionsInBusinessTemplate),
	bankDepositsInBusinessTemplates_fromCashAccountId: many(bankDepositsInBusinessTemplate, {
		relationName: "bankDepositsInBusinessTemplate_fromCashAccountId_cashAccountsInBusinessTemplate_id"
	}),
	bankDepositsInBusinessTemplates_toCashAccountId: many(bankDepositsInBusinessTemplate, {
		relationName: "bankDepositsInBusinessTemplate_toCashAccountId_cashAccountsInBusinessTemplate_id"
	}),
	cashTransactionsInBusinessTemplates: many(cashTransactionsInBusinessTemplate),
}));


export const journalLinesInBusinessTemplateRelations = relations(journalLinesInBusinessTemplate, ({one}) => ({
	chartOfAccountsInBusinessTemplate: one(chartOfAccountsInBusinessTemplate, {
		fields: [journalLinesInBusinessTemplate.accountId],
		references: [chartOfAccountsInBusinessTemplate.id]
	}),
	journalEntriesInBusinessTemplate: one(journalEntriesInBusinessTemplate, {
		fields: [journalLinesInBusinessTemplate.entryId],
		references: [journalEntriesInBusinessTemplate.id]
	}),
}));

export const chartOfAccountsInBusinessTemplateRelations = relations(chartOfAccountsInBusinessTemplate, ({one, many}) => ({
	journalLinesInBusinessTemplates: many(journalLinesInBusinessTemplate),
	chartOfAccountsInBusinessTemplate: one(chartOfAccountsInBusinessTemplate, {
		fields: [chartOfAccountsInBusinessTemplate.parentId],
		references: [chartOfAccountsInBusinessTemplate.id],
		relationName: "chartOfAccountsInBusinessTemplate_parentId_chartOfAccountsInBusinessTemplate_id"
	}),
	chartOfAccountsInBusinessTemplates: many(chartOfAccountsInBusinessTemplate, {
		relationName: "chartOfAccountsInBusinessTemplate_parentId_chartOfAccountsInBusinessTemplate_id"
	}),
}));

export const journalEntriesInBusinessTemplateRelations = relations(journalEntriesInBusinessTemplate, ({one, many}) => ({
	journalLinesInBusinessTemplates: many(journalLinesInBusinessTemplate),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [journalEntriesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const rolePermissionsInBusinessTemplateRelations = relations(rolePermissionsInBusinessTemplate, ({one}) => ({
	permissionsInBusinessTemplate: one(permissionsInBusinessTemplate, {
		fields: [rolePermissionsInBusinessTemplate.permissionId],
		references: [permissionsInBusinessTemplate.id]
	}),
	rolesInBusinessTemplate: one(rolesInBusinessTemplate, {
		fields: [rolePermissionsInBusinessTemplate.roleId],
		references: [rolesInBusinessTemplate.id]
	}),
}));

export const permissionsInBusinessTemplateRelations = relations(permissionsInBusinessTemplate, ({many}) => ({
	rolePermissionsInBusinessTemplates: many(rolePermissionsInBusinessTemplate),
	permissionChangeHistoryInBusinessTemplates: many(permissionChangeHistoryInBusinessTemplate),
}));

export const rolesInBusinessTemplateRelations = relations(rolesInBusinessTemplate, ({many}) => ({
	rolePermissionsInBusinessTemplates: many(rolePermissionsInBusinessTemplate),
	staffRoleBindingsInBusinessTemplates: many(staffRoleBindingsInBusinessTemplate),
	roleChangeHistoryInBusinessTemplates: many(roleChangeHistoryInBusinessTemplate),
	permissionChangeHistoryInBusinessTemplates: many(permissionChangeHistoryInBusinessTemplate),
}));

export const deviceBindingsInBusinessTemplateRelations = relations(deviceBindingsInBusinessTemplate, ({one}) => ({
	registersInBusinessTemplate: one(registersInBusinessTemplate, {
		fields: [deviceBindingsInBusinessTemplate.registerId],
		references: [registersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [deviceBindingsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const printerDevicesInBusinessTemplateRelations = relations(printerDevicesInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [printerDevicesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const staffAccountLinksInBusinessTemplateRelations = relations(staffAccountLinksInBusinessTemplate, ({one}) => ({
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [staffAccountLinksInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
}));


export const staffRoleBindingsInBusinessTemplateRelations = relations(staffRoleBindingsInBusinessTemplate, ({one}) => ({
	rolesInBusinessTemplate: one(rolesInBusinessTemplate, {
		fields: [staffRoleBindingsInBusinessTemplate.roleId],
		references: [rolesInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [staffRoleBindingsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [staffRoleBindingsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const salesOrderStatusHistoryInBusinessTemplateRelations = relations(salesOrderStatusHistoryInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [salesOrderStatusHistoryInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
}));

export const customerReceivablesInBusinessTemplateRelations = relations(customerReceivablesInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerReceivablesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [customerReceivablesInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [customerReceivablesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	customerReceivableAllocationsInBusinessTemplates: many(customerReceivableAllocationsInBusinessTemplate),
	customerReceivableAdjustmentsInBusinessTemplates: many(customerReceivableAdjustmentsInBusinessTemplate),
}));

export const salesOrderAdjustmentsInBusinessTemplateRelations = relations(salesOrderAdjustmentsInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [salesOrderAdjustmentsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
}));

export const customerCreditProfilesInBusinessTemplateRelations = relations(customerCreditProfilesInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerCreditProfilesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
}));

export const customerReceivablePaymentsInBusinessTemplateRelations = relations(customerReceivablePaymentsInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerReceivablePaymentsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	paymentMethodsInBusinessTemplate: one(paymentMethodsInBusinessTemplate, {
		fields: [customerReceivablePaymentsInBusinessTemplate.paymentMethodId],
		references: [paymentMethodsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [customerReceivablePaymentsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	customerReceivableAllocationsInBusinessTemplates: many(customerReceivableAllocationsInBusinessTemplate),
}));

export const paymentMethodsInBusinessTemplateRelations = relations(paymentMethodsInBusinessTemplate, ({many}) => ({
	customerReceivablePaymentsInBusinessTemplates: many(customerReceivablePaymentsInBusinessTemplate),
	supplierPaymentsInBusinessTemplates: many(supplierPaymentsInBusinessTemplate),
	shiftPaymentSummariesInBusinessTemplates: many(shiftPaymentSummariesInBusinessTemplate),
	orderPaymentsInBusinessTemplates: many(orderPaymentsInBusinessTemplate),
}));

export const customerReceivableAllocationsInBusinessTemplateRelations = relations(customerReceivableAllocationsInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [customerReceivableAllocationsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	customerReceivablesInBusinessTemplate: one(customerReceivablesInBusinessTemplate, {
		fields: [customerReceivableAllocationsInBusinessTemplate.receivableId],
		references: [customerReceivablesInBusinessTemplate.id]
	}),
	customerReceivablePaymentsInBusinessTemplate: one(customerReceivablePaymentsInBusinessTemplate, {
		fields: [customerReceivableAllocationsInBusinessTemplate.receivablePaymentId],
		references: [customerReceivablePaymentsInBusinessTemplate.id]
	}),
}));

export const customerReceivableAdjustmentsInBusinessTemplateRelations = relations(customerReceivableAdjustmentsInBusinessTemplate, ({one}) => ({
	customerReceivablesInBusinessTemplate: one(customerReceivablesInBusinessTemplate, {
		fields: [customerReceivableAdjustmentsInBusinessTemplate.receivableId],
		references: [customerReceivablesInBusinessTemplate.id]
	}),
}));

export const paymentRefundsInBusinessTemplateRelations = relations(paymentRefundsInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [paymentRefundsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	orderPaymentsInBusinessTemplate: one(orderPaymentsInBusinessTemplate, {
		fields: [paymentRefundsInBusinessTemplate.paymentId],
		references: [orderPaymentsInBusinessTemplate.id]
	}),
	orderReturnsInBusinessTemplate: one(orderReturnsInBusinessTemplate, {
		fields: [paymentRefundsInBusinessTemplate.returnId],
		references: [orderReturnsInBusinessTemplate.id]
	}),
}));

export const orderPaymentsInBusinessTemplateRelations = relations(orderPaymentsInBusinessTemplate, ({one, many}) => ({
	paymentRefundsInBusinessTemplates: many(paymentRefundsInBusinessTemplate),
	paymentReconciliationItemsInBusinessTemplates: many(paymentReconciliationItemsInBusinessTemplate),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [orderPaymentsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	paymentMethodsInBusinessTemplate: one(paymentMethodsInBusinessTemplate, {
		fields: [orderPaymentsInBusinessTemplate.paymentMethodId],
		references: [paymentMethodsInBusinessTemplate.id]
	}),
}));

export const brandsInBusinessTemplateRelations = relations(brandsInBusinessTemplate, ({many}) => ({
	productsInBusinessTemplates: many(productsInBusinessTemplate),
}));

export const taxClassesInBusinessTemplateRelations = relations(taxClassesInBusinessTemplate, ({many}) => ({
	productsInBusinessTemplates: many(productsInBusinessTemplate),
}));

export const unitsInBusinessTemplateRelations = relations(unitsInBusinessTemplate, ({many}) => ({
	productsInBusinessTemplates: many(productsInBusinessTemplate),
	productUnitsInBusinessTemplates: many(productUnitsInBusinessTemplate),
}));

export const productBarcodesInBusinessTemplateRelations = relations(productBarcodesInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productBarcodesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productBarcodesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const productStoreSettingsInBusinessTemplateRelations = relations(productStoreSettingsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productStoreSettingsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [productStoreSettingsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productStoreSettingsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const productLotsInBusinessTemplateRelations = relations(productLotsInBusinessTemplate, ({one, many}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productLotsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [productLotsInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productLotsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	stockReservationsInBusinessTemplates: many(stockReservationsInBusinessTemplate),
	stockLotBalancesInBusinessTemplates: many(stockLotBalancesInBusinessTemplate),
	supplierReturnLinesInBusinessTemplates: many(supplierReturnLinesInBusinessTemplate),
	inventoryCostLayersInBusinessTemplates: many(inventoryCostLayersInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	stockTransactionsInBusinessTemplates: many(stockTransactionsInBusinessTemplate),
}));

export const productSerialsInBusinessTemplateRelations = relations(productSerialsInBusinessTemplate, ({one, many}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [productSerialsInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productSerialsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [productSerialsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productSerialsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	warrantyClaimsInBusinessTemplates: many(warrantyClaimsInBusinessTemplate),
}));

export const productRecipesInBusinessTemplateRelations = relations(productRecipesInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate_ingredientProductId: one(productsInBusinessTemplate, {
		fields: [productRecipesInBusinessTemplate.ingredientProductId],
		references: [productsInBusinessTemplate.id],
		relationName: "productRecipesInBusinessTemplate_ingredientProductId_productsInBusinessTemplate_id"
	}),
	productVariantsInBusinessTemplate_ingredientVariantId: one(productVariantsInBusinessTemplate, {
		fields: [productRecipesInBusinessTemplate.ingredientVariantId],
		references: [productVariantsInBusinessTemplate.id],
		relationName: "productRecipesInBusinessTemplate_ingredientVariantId_productVariantsInBusinessTemplate_id"
	}),
	productsInBusinessTemplate_productId: one(productsInBusinessTemplate, {
		fields: [productRecipesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id],
		relationName: "productRecipesInBusinessTemplate_productId_productsInBusinessTemplate_id"
	}),
	productVariantsInBusinessTemplate_variantId: one(productVariantsInBusinessTemplate, {
		fields: [productRecipesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id],
		relationName: "productRecipesInBusinessTemplate_variantId_productVariantsInBusinessTemplate_id"
	}),
}));

export const productPriceHistoryInBusinessTemplateRelations = relations(productPriceHistoryInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productPriceHistoryInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [productPriceHistoryInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productPriceHistoryInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const productCostHistoryInBusinessTemplateRelations = relations(productCostHistoryInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productCostHistoryInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productCostHistoryInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const stockReservationsInBusinessTemplateRelations = relations(stockReservationsInBusinessTemplate, ({one}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockReservationsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const stockLotBalancesInBusinessTemplateRelations = relations(stockLotBalancesInBusinessTemplate, ({one}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockLotBalancesInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [stockLotBalancesInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockLotBalancesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockLotBalancesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const supplierPayablesInBusinessTemplateRelations = relations(supplierPayablesInBusinessTemplate, ({one, many}) => ({
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [supplierPayablesInBusinessTemplate.purchaseOrderId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [supplierPayablesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [supplierPayablesInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	supplierPaymentAllocationsInBusinessTemplates: many(supplierPaymentAllocationsInBusinessTemplate),
}));

export const supplierPaymentsInBusinessTemplateRelations = relations(supplierPaymentsInBusinessTemplate, ({one, many}) => ({
	paymentMethodsInBusinessTemplate: one(paymentMethodsInBusinessTemplate, {
		fields: [supplierPaymentsInBusinessTemplate.paymentMethodId],
		references: [paymentMethodsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [supplierPaymentsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [supplierPaymentsInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	supplierPaymentAllocationsInBusinessTemplates: many(supplierPaymentAllocationsInBusinessTemplate),
}));

export const supplierPaymentAllocationsInBusinessTemplateRelations = relations(supplierPaymentAllocationsInBusinessTemplate, ({one}) => ({
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [supplierPaymentAllocationsInBusinessTemplate.purchaseOrderId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
	supplierPayablesInBusinessTemplate: one(supplierPayablesInBusinessTemplate, {
		fields: [supplierPaymentAllocationsInBusinessTemplate.supplierPayableId],
		references: [supplierPayablesInBusinessTemplate.id]
	}),
	supplierPaymentsInBusinessTemplate: one(supplierPaymentsInBusinessTemplate, {
		fields: [supplierPaymentAllocationsInBusinessTemplate.supplierPaymentId],
		references: [supplierPaymentsInBusinessTemplate.id]
	}),
}));

export const deliveryOrdersInBusinessTemplateRelations = relations(deliveryOrdersInBusinessTemplate, ({one}) => ({
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [deliveryOrdersInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [deliveryOrdersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const reportDailySalesSnapshotsInBusinessTemplateRelations = relations(reportDailySalesSnapshotsInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [reportDailySalesSnapshotsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const approvalRequestsInBusinessTemplateRelations = relations(approvalRequestsInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [approvalRequestsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const offlineSyncBatchesInBusinessTemplateRelations = relations(offlineSyncBatchesInBusinessTemplate, ({one}) => ({
	registersInBusinessTemplate: one(registersInBusinessTemplate, {
		fields: [offlineSyncBatchesInBusinessTemplate.registerId],
		references: [registersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [offlineSyncBatchesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const invoiceNumberSequencesInBusinessTemplateRelations = relations(invoiceNumberSequencesInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [invoiceNumberSequencesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const salesInvoicesInBusinessTemplateRelations = relations(salesInvoicesInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [salesInvoicesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [salesInvoicesInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [salesInvoicesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	salesInvoiceLinesInBusinessTemplates: many(salesInvoiceLinesInBusinessTemplate),
	salesInvoiceTaxesInBusinessTemplates: many(salesInvoiceTaxesInBusinessTemplate),
	creditNotesInBusinessTemplates: many(creditNotesInBusinessTemplate),
	debitNotesInBusinessTemplates: many(debitNotesInBusinessTemplate),
}));

export const salesInvoiceLinesInBusinessTemplateRelations = relations(salesInvoiceLinesInBusinessTemplate, ({one, many}) => ({
	salesInvoicesInBusinessTemplate: one(salesInvoicesInBusinessTemplate, {
		fields: [salesInvoiceLinesInBusinessTemplate.invoiceId],
		references: [salesInvoicesInBusinessTemplate.id]
	}),
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [salesInvoiceLinesInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [salesInvoiceLinesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [salesInvoiceLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	creditNoteLinesInBusinessTemplates: many(creditNoteLinesInBusinessTemplate),
}));

export const salesInvoiceTaxesInBusinessTemplateRelations = relations(salesInvoiceTaxesInBusinessTemplate, ({one}) => ({
	salesInvoicesInBusinessTemplate: one(salesInvoicesInBusinessTemplate, {
		fields: [salesInvoiceTaxesInBusinessTemplate.invoiceId],
		references: [salesInvoicesInBusinessTemplate.id]
	}),
}));

export const creditNotesInBusinessTemplateRelations = relations(creditNotesInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [creditNotesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesInvoicesInBusinessTemplate: one(salesInvoicesInBusinessTemplate, {
		fields: [creditNotesInBusinessTemplate.invoiceId],
		references: [salesInvoicesInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [creditNotesInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [creditNotesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	creditNoteLinesInBusinessTemplates: many(creditNoteLinesInBusinessTemplate),
}));

export const creditNoteLinesInBusinessTemplateRelations = relations(creditNoteLinesInBusinessTemplate, ({one}) => ({
	creditNotesInBusinessTemplate: one(creditNotesInBusinessTemplate, {
		fields: [creditNoteLinesInBusinessTemplate.creditNoteId],
		references: [creditNotesInBusinessTemplate.id]
	}),
	salesInvoiceLinesInBusinessTemplate: one(salesInvoiceLinesInBusinessTemplate, {
		fields: [creditNoteLinesInBusinessTemplate.invoiceLineId],
		references: [salesInvoiceLinesInBusinessTemplate.id]
	}),
}));

export const debitNotesInBusinessTemplateRelations = relations(debitNotesInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [debitNotesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesInvoicesInBusinessTemplate: one(salesInvoicesInBusinessTemplate, {
		fields: [debitNotesInBusinessTemplate.invoiceId],
		references: [salesInvoicesInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [debitNotesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const taxReportsInBusinessTemplateRelations = relations(taxReportsInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [taxReportsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const cashDrawerMovementsInBusinessTemplateRelations = relations(cashDrawerMovementsInBusinessTemplate, ({one}) => ({
	cashAccountsInBusinessTemplate: one(cashAccountsInBusinessTemplate, {
		fields: [cashDrawerMovementsInBusinessTemplate.cashAccountId],
		references: [cashAccountsInBusinessTemplate.id]
	}),
	registersInBusinessTemplate: one(registersInBusinessTemplate, {
		fields: [cashDrawerMovementsInBusinessTemplate.registerId],
		references: [registersInBusinessTemplate.id]
	}),
	workShiftsInBusinessTemplate: one(workShiftsInBusinessTemplate, {
		fields: [cashDrawerMovementsInBusinessTemplate.shiftId],
		references: [workShiftsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [cashDrawerMovementsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const shiftPaymentSummariesInBusinessTemplateRelations = relations(shiftPaymentSummariesInBusinessTemplate, ({one}) => ({
	paymentMethodsInBusinessTemplate: one(paymentMethodsInBusinessTemplate, {
		fields: [shiftPaymentSummariesInBusinessTemplate.paymentMethodId],
		references: [paymentMethodsInBusinessTemplate.id]
	}),
	workShiftsInBusinessTemplate: one(workShiftsInBusinessTemplate, {
		fields: [shiftPaymentSummariesInBusinessTemplate.shiftId],
		references: [workShiftsInBusinessTemplate.id]
	}),
}));

export const shiftCashCountsInBusinessTemplateRelations = relations(shiftCashCountsInBusinessTemplate, ({one}) => ({
	cashDenominationsInBusinessTemplate: one(cashDenominationsInBusinessTemplate, {
		fields: [shiftCashCountsInBusinessTemplate.denominationId],
		references: [cashDenominationsInBusinessTemplate.id]
	}),
	workShiftsInBusinessTemplate: one(workShiftsInBusinessTemplate, {
		fields: [shiftCashCountsInBusinessTemplate.shiftId],
		references: [workShiftsInBusinessTemplate.id]
	}),
}));

export const cashDenominationsInBusinessTemplateRelations = relations(cashDenominationsInBusinessTemplate, ({many}) => ({
	shiftCashCountsInBusinessTemplates: many(shiftCashCountsInBusinessTemplate),
}));

export const bankStatementImportsInBusinessTemplateRelations = relations(bankStatementImportsInBusinessTemplate, ({one, many}) => ({
	cashAccountsInBusinessTemplate: one(cashAccountsInBusinessTemplate, {
		fields: [bankStatementImportsInBusinessTemplate.cashAccountId],
		references: [cashAccountsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [bankStatementImportsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	bankTransactionsInBusinessTemplates: many(bankTransactionsInBusinessTemplate),
}));

export const bankTransactionsInBusinessTemplateRelations = relations(bankTransactionsInBusinessTemplate, ({one, many}) => ({
	cashAccountsInBusinessTemplate: one(cashAccountsInBusinessTemplate, {
		fields: [bankTransactionsInBusinessTemplate.cashAccountId],
		references: [cashAccountsInBusinessTemplate.id]
	}),
	bankStatementImportsInBusinessTemplate: one(bankStatementImportsInBusinessTemplate, {
		fields: [bankTransactionsInBusinessTemplate.importId],
		references: [bankStatementImportsInBusinessTemplate.id]
	}),
	paymentReconciliationItemsInBusinessTemplates: many(paymentReconciliationItemsInBusinessTemplate),
}));

export const paymentReconciliationsInBusinessTemplateRelations = relations(paymentReconciliationsInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [paymentReconciliationsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	paymentReconciliationItemsInBusinessTemplates: many(paymentReconciliationItemsInBusinessTemplate),
}));

export const paymentReconciliationItemsInBusinessTemplateRelations = relations(paymentReconciliationItemsInBusinessTemplate, ({one}) => ({
	bankTransactionsInBusinessTemplate: one(bankTransactionsInBusinessTemplate, {
		fields: [paymentReconciliationItemsInBusinessTemplate.bankTransactionId],
		references: [bankTransactionsInBusinessTemplate.id]
	}),
	orderPaymentsInBusinessTemplate: one(orderPaymentsInBusinessTemplate, {
		fields: [paymentReconciliationItemsInBusinessTemplate.orderPaymentId],
		references: [orderPaymentsInBusinessTemplate.id]
	}),
	paymentReconciliationsInBusinessTemplate: one(paymentReconciliationsInBusinessTemplate, {
		fields: [paymentReconciliationItemsInBusinessTemplate.reconciliationId],
		references: [paymentReconciliationsInBusinessTemplate.id]
	}),
}));

export const bankDepositsInBusinessTemplateRelations = relations(bankDepositsInBusinessTemplate, ({one}) => ({
	cashAccountsInBusinessTemplate_fromCashAccountId: one(cashAccountsInBusinessTemplate, {
		fields: [bankDepositsInBusinessTemplate.fromCashAccountId],
		references: [cashAccountsInBusinessTemplate.id],
		relationName: "bankDepositsInBusinessTemplate_fromCashAccountId_cashAccountsInBusinessTemplate_id"
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [bankDepositsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	cashAccountsInBusinessTemplate_toCashAccountId: one(cashAccountsInBusinessTemplate, {
		fields: [bankDepositsInBusinessTemplate.toCashAccountId],
		references: [cashAccountsInBusinessTemplate.id],
		relationName: "bankDepositsInBusinessTemplate_toCashAccountId_cashAccountsInBusinessTemplate_id"
	}),
}));

export const supplierReturnsInBusinessTemplateRelations = relations(supplierReturnsInBusinessTemplate, ({one, many}) => ({
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [supplierReturnsInBusinessTemplate.purchaseOrderId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [supplierReturnsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [supplierReturnsInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	supplierReturnLinesInBusinessTemplates: many(supplierReturnLinesInBusinessTemplate),
	supplierCreditNotesInBusinessTemplates: many(supplierCreditNotesInBusinessTemplate),
}));

export const supplierReturnLinesInBusinessTemplateRelations = relations(supplierReturnLinesInBusinessTemplate, ({one}) => ({
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [supplierReturnLinesInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [supplierReturnLinesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	supplierReturnsInBusinessTemplate: one(supplierReturnsInBusinessTemplate, {
		fields: [supplierReturnLinesInBusinessTemplate.supplierReturnId],
		references: [supplierReturnsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [supplierReturnLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const supplierCreditNotesInBusinessTemplateRelations = relations(supplierCreditNotesInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [supplierCreditNotesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	suppliersInBusinessTemplate: one(suppliersInBusinessTemplate, {
		fields: [supplierCreditNotesInBusinessTemplate.supplierId],
		references: [suppliersInBusinessTemplate.id]
	}),
	supplierReturnsInBusinessTemplate: one(supplierReturnsInBusinessTemplate, {
		fields: [supplierCreditNotesInBusinessTemplate.supplierReturnId],
		references: [supplierReturnsInBusinessTemplate.id]
	}),
}));

export const receivingDiscrepanciesInBusinessTemplateRelations = relations(receivingDiscrepanciesInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate_variantId: one(productVariantsInBusinessTemplate, {
		fields: [receivingDiscrepanciesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id],
		relationName: "receivingDiscrepanciesInBusinessTemplate_variantId_productVariantsInBusinessTemplate_id"
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [receivingDiscrepanciesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [receivingDiscrepanciesInBusinessTemplate.purchaseOrderId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
}));

export const inventoryCostLayersInBusinessTemplateRelations = relations(inventoryCostLayersInBusinessTemplate, ({one, many}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [inventoryCostLayersInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [inventoryCostLayersInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [inventoryCostLayersInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [inventoryCostLayersInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	cogsAllocationsInBusinessTemplates: many(cogsAllocationsInBusinessTemplate),
	landedCostAllocationsInBusinessTemplates: many(landedCostAllocationsInBusinessTemplate),
}));

export const cogsAllocationsInBusinessTemplateRelations = relations(cogsAllocationsInBusinessTemplate, ({one}) => ({
	inventoryCostLayersInBusinessTemplate: one(inventoryCostLayersInBusinessTemplate, {
		fields: [cogsAllocationsInBusinessTemplate.costLayerId],
		references: [inventoryCostLayersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [cogsAllocationsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [cogsAllocationsInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [cogsAllocationsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [cogsAllocationsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const landedCostsInBusinessTemplateRelations = relations(landedCostsInBusinessTemplate, ({one, many}) => ({
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [landedCostsInBusinessTemplate.purchaseOrderId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [landedCostsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	landedCostAllocationsInBusinessTemplates: many(landedCostAllocationsInBusinessTemplate),
}));

export const landedCostAllocationsInBusinessTemplateRelations = relations(landedCostAllocationsInBusinessTemplate, ({one}) => ({
	inventoryCostLayersInBusinessTemplate: one(inventoryCostLayersInBusinessTemplate, {
		fields: [landedCostAllocationsInBusinessTemplate.costLayerId],
		references: [inventoryCostLayersInBusinessTemplate.id]
	}),
	landedCostsInBusinessTemplate: one(landedCostsInBusinessTemplate, {
		fields: [landedCostAllocationsInBusinessTemplate.landedCostId],
		references: [landedCostsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [landedCostAllocationsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [landedCostAllocationsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const inventoryCostAdjustmentsInBusinessTemplateRelations = relations(inventoryCostAdjustmentsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [inventoryCostAdjustmentsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [inventoryCostAdjustmentsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [inventoryCostAdjustmentsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const stockValuationSnapshotsInBusinessTemplateRelations = relations(stockValuationSnapshotsInBusinessTemplate, ({one}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockValuationSnapshotsInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockValuationSnapshotsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stockValuationSnapshotsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockValuationSnapshotsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const channelProductMappingsInBusinessTemplateRelations = relations(channelProductMappingsInBusinessTemplate, ({one}) => ({
	salesChannelsInBusinessTemplate: one(salesChannelsInBusinessTemplate, {
		fields: [channelProductMappingsInBusinessTemplate.channelId],
		references: [salesChannelsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [channelProductMappingsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [channelProductMappingsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const salesChannelsInBusinessTemplateRelations = relations(salesChannelsInBusinessTemplate, ({many}) => ({
	channelProductMappingsInBusinessTemplates: many(channelProductMappingsInBusinessTemplate),
	channelOrderMappingsInBusinessTemplates: many(channelOrderMappingsInBusinessTemplate),
	syncJobsInBusinessTemplates: many(syncJobsInBusinessTemplate),
}));

export const channelOrderMappingsInBusinessTemplateRelations = relations(channelOrderMappingsInBusinessTemplate, ({one}) => ({
	salesChannelsInBusinessTemplate: one(salesChannelsInBusinessTemplate, {
		fields: [channelOrderMappingsInBusinessTemplate.channelId],
		references: [salesChannelsInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [channelOrderMappingsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
}));

export const syncJobsInBusinessTemplateRelations = relations(syncJobsInBusinessTemplate, ({one, many}) => ({
	salesChannelsInBusinessTemplate: one(salesChannelsInBusinessTemplate, {
		fields: [syncJobsInBusinessTemplate.channelId],
		references: [salesChannelsInBusinessTemplate.id]
	}),
	syncJobLogsInBusinessTemplates: many(syncJobLogsInBusinessTemplate),
}));

export const syncJobLogsInBusinessTemplateRelations = relations(syncJobLogsInBusinessTemplate, ({one}) => ({
	syncJobsInBusinessTemplate: one(syncJobsInBusinessTemplate, {
		fields: [syncJobLogsInBusinessTemplate.syncJobId],
		references: [syncJobsInBusinessTemplate.id]
	}),
}));

export const shipmentItemsInBusinessTemplateRelations = relations(shipmentItemsInBusinessTemplate, ({one}) => ({
	salesOrderLinesInBusinessTemplate_orderLineId: one(salesOrderLinesInBusinessTemplate, {
		fields: [shipmentItemsInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id],
		relationName: "shipmentItemsInBusinessTemplate_orderLineId_salesOrderLinesInBusinessTemplate_id"
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [shipmentItemsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	shipmentsInBusinessTemplate: one(shipmentsInBusinessTemplate, {
		fields: [shipmentItemsInBusinessTemplate.shipmentId],
		references: [shipmentsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [shipmentItemsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const shipmentsInBusinessTemplateRelations = relations(shipmentsInBusinessTemplate, ({one, many}) => ({
	shipmentItemsInBusinessTemplates: many(shipmentItemsInBusinessTemplate),
	shippingCarriersInBusinessTemplate: one(shippingCarriersInBusinessTemplate, {
		fields: [shipmentsInBusinessTemplate.carrierId],
		references: [shippingCarriersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [shipmentsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [shipmentsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	shipmentPackagesInBusinessTemplates: many(shipmentPackagesInBusinessTemplate),
	shipmentTrackingEventsInBusinessTemplates: many(shipmentTrackingEventsInBusinessTemplate),
	deliveryAttemptsInBusinessTemplates: many(deliveryAttemptsInBusinessTemplate),
}));

export const shippingCarriersInBusinessTemplateRelations = relations(shippingCarriersInBusinessTemplate, ({many}) => ({
	shipmentsInBusinessTemplates: many(shipmentsInBusinessTemplate),
	codReconciliationsInBusinessTemplates: many(codReconciliationsInBusinessTemplate),
}));

export const shipmentPackagesInBusinessTemplateRelations = relations(shipmentPackagesInBusinessTemplate, ({one}) => ({
	shipmentsInBusinessTemplate: one(shipmentsInBusinessTemplate, {
		fields: [shipmentPackagesInBusinessTemplate.shipmentId],
		references: [shipmentsInBusinessTemplate.id]
	}),
}));

export const shipmentTrackingEventsInBusinessTemplateRelations = relations(shipmentTrackingEventsInBusinessTemplate, ({one}) => ({
	shipmentsInBusinessTemplate: one(shipmentsInBusinessTemplate, {
		fields: [shipmentTrackingEventsInBusinessTemplate.shipmentId],
		references: [shipmentsInBusinessTemplate.id]
	}),
}));

export const deliveryAttemptsInBusinessTemplateRelations = relations(deliveryAttemptsInBusinessTemplate, ({one}) => ({
	shipmentsInBusinessTemplate: one(shipmentsInBusinessTemplate, {
		fields: [deliveryAttemptsInBusinessTemplate.shipmentId],
		references: [shipmentsInBusinessTemplate.id]
	}),
}));

export const codReconciliationsInBusinessTemplateRelations = relations(codReconciliationsInBusinessTemplate, ({one}) => ({
	shippingCarriersInBusinessTemplate: one(shippingCarriersInBusinessTemplate, {
		fields: [codReconciliationsInBusinessTemplate.carrierId],
		references: [shippingCarriersInBusinessTemplate.id]
	}),
}));

export const loyaltyPointTransactionsInBusinessTemplateRelations = relations(loyaltyPointTransactionsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [loyaltyPointTransactionsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [loyaltyPointTransactionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const customerVouchersInBusinessTemplateRelations = relations(customerVouchersInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerVouchersInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [customerVouchersInBusinessTemplate.usedOrderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	voucherBatchesInBusinessTemplate: one(voucherBatchesInBusinessTemplate, {
		fields: [customerVouchersInBusinessTemplate.voucherBatchId],
		references: [voucherBatchesInBusinessTemplate.id]
	}),
}));

export const voucherBatchesInBusinessTemplateRelations = relations(voucherBatchesInBusinessTemplate, ({many}) => ({
	customerVouchersInBusinessTemplates: many(customerVouchersInBusinessTemplate),
}));

export const giftCardsInBusinessTemplateRelations = relations(giftCardsInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [giftCardsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	giftCardTransactionsInBusinessTemplates: many(giftCardTransactionsInBusinessTemplate),
}));

export const giftCardTransactionsInBusinessTemplateRelations = relations(giftCardTransactionsInBusinessTemplate, ({one}) => ({
	giftCardsInBusinessTemplate: one(giftCardsInBusinessTemplate, {
		fields: [giftCardTransactionsInBusinessTemplate.giftCardId],
		references: [giftCardsInBusinessTemplate.id]
	}),
}));

export const customerWalletsInBusinessTemplateRelations = relations(customerWalletsInBusinessTemplate, ({one, many}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerWalletsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	walletTransactionsInBusinessTemplates: many(walletTransactionsInBusinessTemplate),
}));

export const walletTransactionsInBusinessTemplateRelations = relations(walletTransactionsInBusinessTemplate, ({one}) => ({
	customerWalletsInBusinessTemplate: one(customerWalletsInBusinessTemplate, {
		fields: [walletTransactionsInBusinessTemplate.walletId],
		references: [customerWalletsInBusinessTemplate.id]
	}),
}));

export const serviceOrdersInBusinessTemplateRelations = relations(serviceOrdersInBusinessTemplate, ({one, many}) => ({
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [serviceOrdersInBusinessTemplate.assignedStaffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [serviceOrdersInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [serviceOrdersInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [serviceOrdersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	serviceOrderLinesInBusinessTemplates: many(serviceOrderLinesInBusinessTemplate),
	warrantyClaimsInBusinessTemplates: many(warrantyClaimsInBusinessTemplate),
}));

export const customerInteractionsInBusinessTemplateRelations = relations(customerInteractionsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerInteractionsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [customerInteractionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [customerInteractionsInBusinessTemplate.createdBy],
		references: [staffMembersInBusinessTemplate.id]
	}),
}));

export const customerConsentsInBusinessTemplateRelations = relations(customerConsentsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerConsentsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
}));

export const customerContactPreferencesInBusinessTemplateRelations = relations(customerContactPreferencesInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerContactPreferencesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
}));

export const campaignMessagesInBusinessTemplateRelations = relations(campaignMessagesInBusinessTemplate, ({one}) => ({
	campaignsInBusinessTemplate: one(campaignsInBusinessTemplate, {
		fields: [campaignMessagesInBusinessTemplate.campaignId],
		references: [campaignsInBusinessTemplate.id]
	}),
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [campaignMessagesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
}));

export const campaignsInBusinessTemplateRelations = relations(campaignsInBusinessTemplate, ({many}) => ({
	campaignMessagesInBusinessTemplates: many(campaignMessagesInBusinessTemplate),
}));

export const customerMergeRequestsInBusinessTemplateRelations = relations(customerMergeRequestsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate_duplicateCustomerId: one(customersInBusinessTemplate, {
		fields: [customerMergeRequestsInBusinessTemplate.duplicateCustomerId],
		references: [customersInBusinessTemplate.id],
		relationName: "customerMergeRequestsInBusinessTemplate_duplicateCustomerId_customersInBusinessTemplate_id"
	}),
	customersInBusinessTemplate_primaryCustomerId: one(customersInBusinessTemplate, {
		fields: [customerMergeRequestsInBusinessTemplate.primaryCustomerId],
		references: [customersInBusinessTemplate.id],
		relationName: "customerMergeRequestsInBusinessTemplate_primaryCustomerId_customersInBusinessTemplate_id"
	}),
}));

export const serviceOrderLinesInBusinessTemplateRelations = relations(serviceOrderLinesInBusinessTemplate, ({one}) => ({
	serviceOrdersInBusinessTemplate: one(serviceOrdersInBusinessTemplate, {
		fields: [serviceOrderLinesInBusinessTemplate.serviceOrderId],
		references: [serviceOrdersInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [serviceOrderLinesInBusinessTemplate.serviceProductId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const packageUsagesInBusinessTemplateRelations = relations(packageUsagesInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [packageUsagesInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [packageUsagesInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	servicePackagesInBusinessTemplate: one(servicePackagesInBusinessTemplate, {
		fields: [packageUsagesInBusinessTemplate.packageId],
		references: [servicePackagesInBusinessTemplate.id]
	}),
}));

export const servicePackagesInBusinessTemplateRelations = relations(servicePackagesInBusinessTemplate, ({one, many}) => ({
	packageUsagesInBusinessTemplates: many(packageUsagesInBusinessTemplate),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [servicePackagesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const warrantyPoliciesInBusinessTemplateRelations = relations(warrantyPoliciesInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [warrantyPoliciesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const warrantyClaimsInBusinessTemplateRelations = relations(warrantyClaimsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [warrantyClaimsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [warrantyClaimsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [warrantyClaimsInBusinessTemplate.salesOrderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	productSerialsInBusinessTemplate: one(productSerialsInBusinessTemplate, {
		fields: [warrantyClaimsInBusinessTemplate.serialId],
		references: [productSerialsInBusinessTemplate.id]
	}),
	serviceOrdersInBusinessTemplate: one(serviceOrdersInBusinessTemplate, {
		fields: [warrantyClaimsInBusinessTemplate.serviceOrderId],
		references: [serviceOrdersInBusinessTemplate.id]
	}),
}));

export const kitchenStationsInBusinessTemplateRelations = relations(kitchenStationsInBusinessTemplate, ({one}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [kitchenStationsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const productionOrdersInBusinessTemplateRelations = relations(productionOrdersInBusinessTemplate, ({one, many}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [productionOrdersInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productionOrdersInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [productionOrdersInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productionOrdersInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	productionOrderLinesInBusinessTemplates: many(productionOrderLinesInBusinessTemplate),
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
}));

export const productionOrderLinesInBusinessTemplateRelations = relations(productionOrderLinesInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productionOrderLinesInBusinessTemplate.ingredientProductId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [productionOrderLinesInBusinessTemplate.ingredientVariantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	productionOrdersInBusinessTemplate: one(productionOrdersInBusinessTemplate, {
		fields: [productionOrderLinesInBusinessTemplate.productionOrderId],
		references: [productionOrdersInBusinessTemplate.id]
	}),
}));

export const ingredientConsumptionsInBusinessTemplateRelations = relations(ingredientConsumptionsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.ingredientProductId],
		references: [productsInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.ingredientVariantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	salesOrdersInBusinessTemplate: one(salesOrdersInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.orderId],
		references: [salesOrdersInBusinessTemplate.id]
	}),
	salesOrderLinesInBusinessTemplate: one(salesOrderLinesInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.orderLineId],
		references: [salesOrderLinesInBusinessTemplate.id]
	}),
	productionOrdersInBusinessTemplate: one(productionOrdersInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.productionOrderId],
		references: [productionOrdersInBusinessTemplate.id]
	}),
	stockTransactionsInBusinessTemplate: one(stockTransactionsInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.stockTransactionId],
		references: [stockTransactionsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [ingredientConsumptionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const stockTransactionsInBusinessTemplateRelations = relations(stockTransactionsInBusinessTemplate, ({one, many}) => ({
	ingredientConsumptionsInBusinessTemplates: many(ingredientConsumptionsInBusinessTemplate),
	wasteLogsInBusinessTemplates: many(wasteLogsInBusinessTemplate),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockTransactionsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [stockTransactionsInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [stockTransactionsInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockTransactionsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [stockTransactionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const prepBatchesInBusinessTemplateRelations = relations(prepBatchesInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [prepBatchesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [prepBatchesInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [prepBatchesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const menuAvailabilityInBusinessTemplateRelations = relations(menuAvailabilityInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [menuAvailabilityInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [menuAvailabilityInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [menuAvailabilityInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const periodLocksInBusinessTemplateRelations = relations(periodLocksInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [periodLocksInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	reopenPeriodRequestsInBusinessTemplates: many(reopenPeriodRequestsInBusinessTemplate),
}));

export const closingRunsInBusinessTemplateRelations = relations(closingRunsInBusinessTemplate, ({one, many}) => ({
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [closingRunsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	closingRunItemsInBusinessTemplates: many(closingRunItemsInBusinessTemplate),
}));

export const closingRunItemsInBusinessTemplateRelations = relations(closingRunItemsInBusinessTemplate, ({one}) => ({
	closingRunsInBusinessTemplate: one(closingRunsInBusinessTemplate, {
		fields: [closingRunItemsInBusinessTemplate.closingRunId],
		references: [closingRunsInBusinessTemplate.id]
	}),
}));

export const reopenPeriodRequestsInBusinessTemplateRelations = relations(reopenPeriodRequestsInBusinessTemplate, ({one}) => ({
	periodLocksInBusinessTemplate: one(periodLocksInBusinessTemplate, {
		fields: [reopenPeriodRequestsInBusinessTemplate.periodLockId],
		references: [periodLocksInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [reopenPeriodRequestsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const wasteLogsInBusinessTemplateRelations = relations(wasteLogsInBusinessTemplate, ({one}) => ({
	stockLocationsInBusinessTemplate: one(stockLocationsInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.locationId],
		references: [stockLocationsInBusinessTemplate.id]
	}),
	productLotsInBusinessTemplate: one(productLotsInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.lotId],
		references: [productLotsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	stockTransactionsInBusinessTemplate: one(stockTransactionsInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.stockTransactionId],
		references: [stockTransactionsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [wasteLogsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
}));

export const roleChangeHistoryInBusinessTemplateRelations = relations(roleChangeHistoryInBusinessTemplate, ({one}) => ({
	rolesInBusinessTemplate: one(rolesInBusinessTemplate, {
		fields: [roleChangeHistoryInBusinessTemplate.roleId],
		references: [rolesInBusinessTemplate.id]
	}),
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [roleChangeHistoryInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [roleChangeHistoryInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const permissionChangeHistoryInBusinessTemplateRelations = relations(permissionChangeHistoryInBusinessTemplate, ({one}) => ({
	permissionsInBusinessTemplate: one(permissionsInBusinessTemplate, {
		fields: [permissionChangeHistoryInBusinessTemplate.permissionId],
		references: [permissionsInBusinessTemplate.id]
	}),
	rolesInBusinessTemplate: one(rolesInBusinessTemplate, {
		fields: [permissionChangeHistoryInBusinessTemplate.roleId],
		references: [rolesInBusinessTemplate.id]
	}),
}));

export const temporaryPermissionGrantsInBusinessTemplateRelations = relations(temporaryPermissionGrantsInBusinessTemplate, ({one}) => ({
	staffMembersInBusinessTemplate: one(staffMembersInBusinessTemplate, {
		fields: [temporaryPermissionGrantsInBusinessTemplate.staffId],
		references: [staffMembersInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [temporaryPermissionGrantsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const purchaseOrderLinesInBusinessTemplateRelations = relations(purchaseOrderLinesInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [purchaseOrderLinesInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	purchaseOrdersInBusinessTemplate: one(purchaseOrdersInBusinessTemplate, {
		fields: [purchaseOrderLinesInBusinessTemplate.poId],
		references: [purchaseOrdersInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [purchaseOrderLinesInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
}));

export const stockTransferItemsInBusinessTemplateRelations = relations(stockTransferItemsInBusinessTemplate, ({one}) => ({
	productVariantsInBusinessTemplate: one(productVariantsInBusinessTemplate, {
		fields: [stockTransferItemsInBusinessTemplate.variantId],
		references: [productVariantsInBusinessTemplate.id]
	}),
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [stockTransferItemsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	stockTransfersInBusinessTemplate: one(stockTransfersInBusinessTemplate, {
		fields: [stockTransferItemsInBusinessTemplate.transferId],
		references: [stockTransfersInBusinessTemplate.id]
	}),
}));

export const cashTransactionsInBusinessTemplateRelations = relations(cashTransactionsInBusinessTemplate, ({one}) => ({
	cashAccountsInBusinessTemplate: one(cashAccountsInBusinessTemplate, {
		fields: [cashTransactionsInBusinessTemplate.cashAccountId],
		references: [cashAccountsInBusinessTemplate.id]
	}),
	storesInBusinessTemplate: one(storesInBusinessTemplate, {
		fields: [cashTransactionsInBusinessTemplate.storeId],
		references: [storesInBusinessTemplate.id]
	}),
}));

export const productTagMappingsInBusinessTemplateRelations = relations(productTagMappingsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productTagMappingsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	productTagsInBusinessTemplate: one(productTagsInBusinessTemplate, {
		fields: [productTagMappingsInBusinessTemplate.tagId],
		references: [productTagsInBusinessTemplate.id]
	}),
}));

export const productTagsInBusinessTemplateRelations = relations(productTagsInBusinessTemplate, ({many}) => ({
	productTagMappingsInBusinessTemplates: many(productTagMappingsInBusinessTemplate),
}));

export const customerTagMappingsInBusinessTemplateRelations = relations(customerTagMappingsInBusinessTemplate, ({one}) => ({
	customersInBusinessTemplate: one(customersInBusinessTemplate, {
		fields: [customerTagMappingsInBusinessTemplate.customerId],
		references: [customersInBusinessTemplate.id]
	}),
	customerTagsInBusinessTemplate: one(customerTagsInBusinessTemplate, {
		fields: [customerTagMappingsInBusinessTemplate.tagId],
		references: [customerTagsInBusinessTemplate.id]
	}),
}));

export const customerTagsInBusinessTemplateRelations = relations(customerTagsInBusinessTemplate, ({many}) => ({
	customerTagMappingsInBusinessTemplates: many(customerTagMappingsInBusinessTemplate),
}));

export const productUnitsInBusinessTemplateRelations = relations(productUnitsInBusinessTemplate, ({one}) => ({
	productsInBusinessTemplate: one(productsInBusinessTemplate, {
		fields: [productUnitsInBusinessTemplate.productId],
		references: [productsInBusinessTemplate.id]
	}),
	unitsInBusinessTemplate: one(unitsInBusinessTemplate, {
		fields: [productUnitsInBusinessTemplate.unitId],
		references: [unitsInBusinessTemplate.id]
	}),
}));