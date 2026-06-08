const BASE_URL = "http://localhost:3000";

const checks = [
  { name: "Homepage", url: "/" },
  { name: "Login Page", url: "/login" },
  { name: "Dashboard Redirect/Access", url: "/dashboard" },
  { name: "Audit API Health", url: "/api/audit" },
  { name: "User API", url: "/api/user/me" },
  { name: "Reports API", url: "/api/reports" },
];

async function checkRoute(item) {
  try {
    const res = await fetch(BASE_URL + item.url);

    return {
      name: item.name,
      url: item.url,
      status: res.status,
      ok: res.status < 500,
    };
  } catch (error) {
    return {
      name: item.name,
      url: item.url,
      status: "FAILED",
      ok: false,
      error: error.message,
    };
  }
}

console.log("\nCrawler Que System Check Started...\n");

const results = [];

for (const item of checks) {
  const result = await checkRoute(item);
  results.push(result);

  console.log(
    `${result.ok ? "✅" : "❌"} ${result.name} | ${result.url} | ${result.status}`
  );
}

const failed = results.filter((r) => !r.ok);

console.log("\nSummary:");
console.log(`Passed: ${results.length - failed.length}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log("\nFailed checks:");
  failed.forEach((f) => console.log(`- ${f.name}: ${f.url}`));
  process.exit(1);
}

console.log("\nAll basic system checks passed.\n");