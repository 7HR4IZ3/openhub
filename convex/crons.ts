import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly("refresh stale public discovery signals", internal.discovery.refreshStaleSignals);
crons.hourly("seed active public discovery candidates", internal.discovery.refreshPublicCandidates);

export default crons;
