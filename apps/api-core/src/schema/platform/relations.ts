import { relations } from "drizzle-orm/relations";
import { businessesInPlatform, billingEventsInPlatform, webhookSubscriptionsInPlatform, accountsInPlatform, accountRoleBindingsInPlatform, rolesInPlatform, permissionsInPlatform, rolePermissionsInPlatform, subscriptionPlansInPlatform, planLimitsInPlatform, platformInvoicesInPlatform, platformInvoiceLinesInPlatform, authSessionsInPlatform, deviceIdentitiesInPlatform, accountBusinessesInPlatform, accountBranchAccessInPlatform, businessBranchesInPlatform, platformPaymentsInPlatform, usageBillingItemsInPlatform, webhookEndpointsInPlatform, webhookDeliveryLogsInPlatform, supportTicketsInPlatform, supportTicketMessagesInPlatform, impersonationSessionsInPlatform, platformAnnouncementsInPlatform, systemSettingsInPlatform, businessModulesInPlatform, businessSubscriptionsInPlatform, businessUsageCountersInPlatform, businessUsageDailyInPlatform, sessionLimitsInPlatform } from "./schema";

export const billingEventsInPlatformRelations = relations(billingEventsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [billingEventsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const businessesInPlatformRelations = relations(businessesInPlatform, ({many}) => ({
	billingEventsInPlatforms: many(billingEventsInPlatform),
	webhookSubscriptionsInPlatforms: many(webhookSubscriptionsInPlatform),
	platformPaymentsInPlatforms: many(platformPaymentsInPlatform),
	usageBillingItemsInPlatforms: many(usageBillingItemsInPlatform),
	supportTicketsInPlatforms: many(supportTicketsInPlatform),
	impersonationSessionsInPlatforms: many(impersonationSessionsInPlatform),
	businessModulesInPlatforms: many(businessModulesInPlatform),
	accountBusinessesInPlatforms: many(accountBusinessesInPlatform),
	businessBranchesInPlatforms: many(businessBranchesInPlatform),
	businessSubscriptionsInPlatforms: many(businessSubscriptionsInPlatform),
	businessUsageCountersInPlatforms: many(businessUsageCountersInPlatform),
	businessUsageDailyInPlatforms: many(businessUsageDailyInPlatform),
	platformInvoicesInPlatforms: many(platformInvoicesInPlatform),
}));

export const webhookSubscriptionsInPlatformRelations = relations(webhookSubscriptionsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [webhookSubscriptionsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const accountRoleBindingsInPlatformRelations = relations(accountRoleBindingsInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [accountRoleBindingsInPlatform.accountId],
		references: [accountsInPlatform.id]
	}),
	rolesInPlatform: one(rolesInPlatform, {
		fields: [accountRoleBindingsInPlatform.roleId],
		references: [rolesInPlatform.id]
	}),
}));

export const accountsInPlatformRelations = relations(accountsInPlatform, ({many}) => ({
	accountRoleBindingsInPlatforms: many(accountRoleBindingsInPlatform),
	authSessionsInPlatforms: many(authSessionsInPlatform),
	supportTicketsInPlatforms_assignedTo: many(supportTicketsInPlatform, {
		relationName: "supportTicketsInPlatform_assignedTo_accountsInPlatform_id"
	}),
	supportTicketsInPlatforms_openedBy: many(supportTicketsInPlatform, {
		relationName: "supportTicketsInPlatform_openedBy_accountsInPlatform_id"
	}),
	supportTicketMessagesInPlatforms: many(supportTicketMessagesInPlatform),
	impersonationSessionsInPlatforms: many(impersonationSessionsInPlatform),
	platformAnnouncementsInPlatforms: many(platformAnnouncementsInPlatform),
	systemSettingsInPlatforms: many(systemSettingsInPlatform),
	businessModulesInPlatforms: many(businessModulesInPlatform),
	accountBusinessesInPlatforms: many(accountBusinessesInPlatform),
	sessionLimitsInPlatforms: many(sessionLimitsInPlatform),
}));

export const rolesInPlatformRelations = relations(rolesInPlatform, ({many}) => ({
	accountRoleBindingsInPlatforms: many(accountRoleBindingsInPlatform),
	rolePermissionsInPlatforms: many(rolePermissionsInPlatform),
}));

export const rolePermissionsInPlatformRelations = relations(rolePermissionsInPlatform, ({one}) => ({
	permissionsInPlatform: one(permissionsInPlatform, {
		fields: [rolePermissionsInPlatform.permissionId],
		references: [permissionsInPlatform.id]
	}),
	rolesInPlatform: one(rolesInPlatform, {
		fields: [rolePermissionsInPlatform.roleId],
		references: [rolesInPlatform.id]
	}),
}));

export const permissionsInPlatformRelations = relations(permissionsInPlatform, ({many}) => ({
	rolePermissionsInPlatforms: many(rolePermissionsInPlatform),
}));

export const planLimitsInPlatformRelations = relations(planLimitsInPlatform, ({one}) => ({
	subscriptionPlansInPlatform: one(subscriptionPlansInPlatform, {
		fields: [planLimitsInPlatform.planCode],
		references: [subscriptionPlansInPlatform.planCode]
	}),
}));

export const subscriptionPlansInPlatformRelations = relations(subscriptionPlansInPlatform, ({many}) => ({
	planLimitsInPlatforms: many(planLimitsInPlatform),
	businessSubscriptionsInPlatforms: many(businessSubscriptionsInPlatform),
}));

export const platformInvoiceLinesInPlatformRelations = relations(platformInvoiceLinesInPlatform, ({one}) => ({
	platformInvoicesInPlatform: one(platformInvoicesInPlatform, {
		fields: [platformInvoiceLinesInPlatform.invoiceId],
		references: [platformInvoicesInPlatform.id]
	}),
}));

export const platformInvoicesInPlatformRelations = relations(platformInvoicesInPlatform, ({one, many}) => ({
	platformInvoiceLinesInPlatforms: many(platformInvoiceLinesInPlatform),
	platformPaymentsInPlatforms: many(platformPaymentsInPlatform),
	usageBillingItemsInPlatforms: many(usageBillingItemsInPlatform),
	businessesInPlatform: one(businessesInPlatform, {
		fields: [platformInvoicesInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const authSessionsInPlatformRelations = relations(authSessionsInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [authSessionsInPlatform.accountId],
		references: [accountsInPlatform.id]
	}),
	deviceIdentitiesInPlatform: one(deviceIdentitiesInPlatform, {
		fields: [authSessionsInPlatform.deviceIdentityId],
		references: [deviceIdentitiesInPlatform.id]
	}),
}));

export const deviceIdentitiesInPlatformRelations = relations(deviceIdentitiesInPlatform, ({many}) => ({
	authSessionsInPlatforms: many(authSessionsInPlatform),
}));

export const accountBranchAccessInPlatformRelations = relations(accountBranchAccessInPlatform, ({one}) => ({
	accountBusinessesInPlatform: one(accountBusinessesInPlatform, {
		fields: [accountBranchAccessInPlatform.accountBusinessId],
		references: [accountBusinessesInPlatform.id]
	}),
	businessBranchesInPlatform: one(businessBranchesInPlatform, {
		fields: [accountBranchAccessInPlatform.businessBranchId],
		references: [businessBranchesInPlatform.id]
	}),
}));

export const accountBusinessesInPlatformRelations = relations(accountBusinessesInPlatform, ({one, many}) => ({
	accountBranchAccessInPlatforms: many(accountBranchAccessInPlatform),
	accountsInPlatform: one(accountsInPlatform, {
		fields: [accountBusinessesInPlatform.accountId],
		references: [accountsInPlatform.id]
	}),
	businessesInPlatform: one(businessesInPlatform, {
		fields: [accountBusinessesInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const businessBranchesInPlatformRelations = relations(businessBranchesInPlatform, ({one, many}) => ({
	accountBranchAccessInPlatforms: many(accountBranchAccessInPlatform),
	businessesInPlatform: one(businessesInPlatform, {
		fields: [businessBranchesInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const platformPaymentsInPlatformRelations = relations(platformPaymentsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [platformPaymentsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	platformInvoicesInPlatform: one(platformInvoicesInPlatform, {
		fields: [platformPaymentsInPlatform.invoiceId],
		references: [platformInvoicesInPlatform.id]
	}),
}));

export const usageBillingItemsInPlatformRelations = relations(usageBillingItemsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [usageBillingItemsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	platformInvoicesInPlatform: one(platformInvoicesInPlatform, {
		fields: [usageBillingItemsInPlatform.invoiceId],
		references: [platformInvoicesInPlatform.id]
	}),
}));

export const webhookDeliveryLogsInPlatformRelations = relations(webhookDeliveryLogsInPlatform, ({one}) => ({
	webhookEndpointsInPlatform: one(webhookEndpointsInPlatform, {
		fields: [webhookDeliveryLogsInPlatform.webhookEndpointId],
		references: [webhookEndpointsInPlatform.id]
	}),
}));

export const webhookEndpointsInPlatformRelations = relations(webhookEndpointsInPlatform, ({many}) => ({
	webhookDeliveryLogsInPlatforms: many(webhookDeliveryLogsInPlatform),
}));

export const supportTicketsInPlatformRelations = relations(supportTicketsInPlatform, ({one, many}) => ({
	accountsInPlatform_assignedTo: one(accountsInPlatform, {
		fields: [supportTicketsInPlatform.assignedTo],
		references: [accountsInPlatform.id],
		relationName: "supportTicketsInPlatform_assignedTo_accountsInPlatform_id"
	}),
	businessesInPlatform: one(businessesInPlatform, {
		fields: [supportTicketsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	accountsInPlatform_openedBy: one(accountsInPlatform, {
		fields: [supportTicketsInPlatform.openedBy],
		references: [accountsInPlatform.id],
		relationName: "supportTicketsInPlatform_openedBy_accountsInPlatform_id"
	}),
	supportTicketMessagesInPlatforms: many(supportTicketMessagesInPlatform),
	impersonationSessionsInPlatforms: many(impersonationSessionsInPlatform),
}));

export const supportTicketMessagesInPlatformRelations = relations(supportTicketMessagesInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [supportTicketMessagesInPlatform.senderId],
		references: [accountsInPlatform.id]
	}),
	supportTicketsInPlatform: one(supportTicketsInPlatform, {
		fields: [supportTicketMessagesInPlatform.ticketId],
		references: [supportTicketsInPlatform.id]
	}),
}));

export const impersonationSessionsInPlatformRelations = relations(impersonationSessionsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [impersonationSessionsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	accountsInPlatform: one(accountsInPlatform, {
		fields: [impersonationSessionsInPlatform.supportAccountId],
		references: [accountsInPlatform.id]
	}),
	supportTicketsInPlatform: one(supportTicketsInPlatform, {
		fields: [impersonationSessionsInPlatform.supportTicketId],
		references: [supportTicketsInPlatform.id]
	}),
}));

export const platformAnnouncementsInPlatformRelations = relations(platformAnnouncementsInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [platformAnnouncementsInPlatform.createdBy],
		references: [accountsInPlatform.id]
	}),
}));

export const systemSettingsInPlatformRelations = relations(systemSettingsInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [systemSettingsInPlatform.updatedBy],
		references: [accountsInPlatform.id]
	}),
}));

export const businessModulesInPlatformRelations = relations(businessModulesInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [businessModulesInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	accountsInPlatform: one(accountsInPlatform, {
		fields: [businessModulesInPlatform.enabledBy],
		references: [accountsInPlatform.id]
	}),
}));

export const businessSubscriptionsInPlatformRelations = relations(businessSubscriptionsInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [businessSubscriptionsInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
	subscriptionPlansInPlatform: one(subscriptionPlansInPlatform, {
		fields: [businessSubscriptionsInPlatform.planCode],
		references: [subscriptionPlansInPlatform.planCode]
	}),
}));

export const businessUsageCountersInPlatformRelations = relations(businessUsageCountersInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [businessUsageCountersInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const businessUsageDailyInPlatformRelations = relations(businessUsageDailyInPlatform, ({one}) => ({
	businessesInPlatform: one(businessesInPlatform, {
		fields: [businessUsageDailyInPlatform.businessId],
		references: [businessesInPlatform.id]
	}),
}));

export const sessionLimitsInPlatformRelations = relations(sessionLimitsInPlatform, ({one}) => ({
	accountsInPlatform: one(accountsInPlatform, {
		fields: [sessionLimitsInPlatform.accountId],
		references: [accountsInPlatform.id]
	}),
}));