import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { commitLeadImportJob, createLeadImportPreviewJob, listLeadImportJobs } from "./lib/importRecords";

export const createLeadImportPreview = mutation({
  args: {
    organizationId: v.id("organizations"),
    fileName: v.optional(v.string()),
    csvText: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    return await createLeadImportPreviewJob(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      fileName: args.fileName,
      csvText: args.csvText,
    });
  },
});

export const commitLeadImportRows = mutation({
  args: {
    organizationId: v.id("organizations"),
    importJobId: v.id("importJobs"),
    rowIds: v.optional(v.array(v.id("importRows"))),
    includeReviewRows: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    return await commitLeadImportJob(ctx, {
      organizationId: args.organizationId,
      importJobId: args.importJobId,
      actorUserId: user._id,
      rowIds: args.rowIds,
      includeReviewRows: args.includeReviewRows,
    });
  },
});

export const listLeadImports = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "managePipeline");
    return await listLeadImportJobs(ctx, args.organizationId);
  },
});
