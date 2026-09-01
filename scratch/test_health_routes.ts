import { GET as getLive } from "../app/api/health/live/route";
import { GET as getReady } from "../app/api/health/ready/route";
import { GET as getDeps } from "../app/api/health/dependencies/route";

async function testHealth() {
  console.log("=== Testing /api/health/live ===");
  const liveRes = await getLive();
  console.log("Live:", await liveRes.json());

  console.log("\n=== Testing /api/health/ready ===");
  const readyRes = await getReady();
  console.log("Ready:", await readyRes.json());

  console.log("\n=== Testing /api/health/dependencies ===");
  const depsRes = await getDeps();
  console.log("Dependencies:", await depsRes.json());
}

testHealth().catch(console.error);
