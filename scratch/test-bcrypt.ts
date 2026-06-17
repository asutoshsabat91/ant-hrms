import bcrypt from "bcryptjs";

async function check() {
  const hash = "$2b$12$d6T/5eF0JavIp8Y2pKwOb.zZiK5wtPJQr74W5opV.d8zrGO0PRw1W";
  const valid = await bcrypt.compare("AntBox@2025", hash);
  console.log("Password valid:", valid);
}

check();
