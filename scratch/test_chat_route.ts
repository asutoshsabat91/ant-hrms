import { POST } from "../app/api/ai/chat/route";

async function testChatRoute() {
  console.log("=== Testing /api/ai/chat endpoint ===");
  const req = new Request("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "hi" }]
    })
  });

  const start = Date.now();
  const res = await POST(req);
  const data = await res.json();
  console.log(`Response in ${Date.now() - start}ms:`, data);
}

testChatRoute().catch(console.error);
