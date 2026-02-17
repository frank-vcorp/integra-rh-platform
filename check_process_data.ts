
import { getAllProcesses } from "./integra-rh-manus/server/db";
import { getDb } from "./integra-rh-manus/server/db";

async function checkData() {
  console.log("Checking data...");
  try {
    const procs = await getAllProcesses();
    console.log(`Total processes: ${procs.length}`);
    
    let withSiteId = 0;
    let withResponsableId = 0;
    let missingSiteName = 0;
    let missingResponsableName = 0;

    for (const p of procs) {
      if (p.clientSiteId) {
        withSiteId++;
        if (!p.siteName) {
            console.log(`Process ${p.id} has clientSiteId ${p.clientSiteId} but NO siteName`);
            missingSiteName++;
        }
      }
      if (p.especialistaAtraccionId) {
        withResponsableId++;
        if (!p.responsableName) {
             console.log(`Process ${p.id} has especialistaAtraccionId ${p.especialistaAtraccionId} but NO responsableName`);
             missingResponsableName++;
        }
      }
    }

    console.log(`Processes with clientSiteId: ${withSiteId}`);
    console.log(`Processes with siteName missing despite having ID: ${missingSiteName}`);
    console.log(`Processes with especialistaAtraccionId: ${withResponsableId}`);
    console.log(`Processes with responsableName missing despite having ID: ${missingResponsableName}`);

    if (procs.length > 0) {
        console.log("Sample process keys:", Object.keys(procs[0]));
        console.log("Sample process:", procs[0]);
    }

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkData();
