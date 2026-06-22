async function test() {
  const url = "http://localhost:3002/onboarding/cmqjlchng006qywj6ycbjl3yr";
  console.log("Fetching url:", url);
  try {
    const res = await fetch(url, { redirect: "manual" });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
