async function testLogin() {
  const baseURL = "https://antbox-hrms-one.vercel.app";
  
  // 1. Get CSRF Token and Cookies
  const csrfRes = await fetch(`${baseURL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const setCookieHeader = csrfRes.headers.get("set-cookie");
  console.log("CSRF Token:", csrfToken);
  console.log("Cookies:", setCookieHeader);

  // 2. Perform Login POST
  console.log("Submitting login credentials...");
  try {
    const loginRes = await fetch(
      `${baseURL}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: setCookieHeader ? setCookieHeader.split(";")[0] : ""
        },
        body: new URLSearchParams({
          email: "admin@theantbox.com",
          password: "AntBox@2025",
          csrfToken: csrfToken,
          json: "true"
        }).toString(),
        redirect: "manual" // Stop redirect
      }
    );
    console.log("Response Status:", loginRes.status);
    console.log("Response Headers:", Object.fromEntries(loginRes.headers.entries()));
    const responseBody = await loginRes.text();
    console.log("Response Body (Truncated):", responseBody.substring(0, 500));
  } catch (error: any) {
    console.error("Login failed:", error.message);
  }
}

testLogin();
