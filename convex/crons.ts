import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("refresh cost intelligence snapshots", { hours: 12 }, internal.operating.scheduledRefreshCostIntelligence, {});
crons.interval("refresh job-site weather snapshots", { hours: 6 }, internal.operating.scheduledRefreshWeatherSnapshots, {});
crons.interval("check stale leads", { hours: 24 }, internal.operating.scheduledStaleLeadChecks, {});
crons.interval("recalculate job cost summaries", { hours: 1 }, internal.operating.scheduledRecalculateJobCosts, {});

export default crons;
