
import { getAllProcesses } from "./server/db";
import { getDb } from "./server/db";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  console.log("Testing getAllProcesses...");
  try {
    const procs = await getAllProcesses();
    console.log(`Found ${procs.length} processes.`);
    if (procs.length > 0) {
      console.log("First process:", JSON.stringify(procs[0], null, 2));
      const withSite = procs.find(p => (p as any).clientSiteId);
      if (withSite) {
        console.log("Process with clientSiteId:", JSON.stringify(withSite, null, 2));
      } else {
        console.log("No process found with clientSiteId set.");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

main();
