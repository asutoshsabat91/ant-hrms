import { POST } from "../app/api/ai/chat/route";

async function main() {
  const req = new Request("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "hey" }]
    })
  });

  const res = await POST(req);
  const data = await res.json();
  console.log("AntBox Chachi Response:", data);
}

main().catch(console.error);
