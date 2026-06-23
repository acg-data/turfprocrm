/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as admin from "../admin.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as demo from "../demo.js";
import type * as dispatch from "../dispatch.js";
import type * as estimates from "../estimates.js";
import type * as field from "../field.js";
import type * as imports from "../imports.js";
import type * as jobs from "../jobs.js";
import type * as leadIntake from "../leadIntake.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_entities from "../lib/entities.js";
import type * as lib_importRecords from "../lib/importRecords.js";
import type * as lib_imports from "../lib/imports.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_workflow from "../lib/workflow.js";
import type * as operating from "../operating.js";
import type * as pipeline from "../pipeline.js";
import type * as pricing from "../pricing.js";
import type * as setup from "../setup.js";
import type * as specs from "../specs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  crm: typeof crm;
  crons: typeof crons;
  dashboard: typeof dashboard;
  demo: typeof demo;
  dispatch: typeof dispatch;
  estimates: typeof estimates;
  field: typeof field;
  imports: typeof imports;
  jobs: typeof jobs;
  leadIntake: typeof leadIntake;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/entities": typeof lib_entities;
  "lib/importRecords": typeof lib_importRecords;
  "lib/imports": typeof lib_imports;
  "lib/users": typeof lib_users;
  "lib/workflow": typeof lib_workflow;
  operating: typeof operating;
  pipeline: typeof pipeline;
  pricing: typeof pricing;
  setup: typeof setup;
  specs: typeof specs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
