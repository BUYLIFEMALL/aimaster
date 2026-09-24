async function main() {
  const serviceKey = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");
  console.log("Fetching OpenAPI spec with Service Role Key...");
  const res = await fetch("https://esgxyikcnnvmlhygjkth.supabase.co/rest/v1/", {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`
    }
  });
  const spec = await res.json();
  if (spec.definitions) {
    console.log("Existing Tables in Supabase DB:");
    Object.keys(spec.definitions).sort().forEach(tableName => {
      console.log(`- ${tableName}`);
    });
  } else {
    console.log("Spec:", Object.keys(spec));
  }
}

main().catch(console.error);
