import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { productImportListSchema } from "../src/lib/products/import-schema";

async function main() {
  const path = resolve(process.cwd(), process.argv[2] ?? "data/products.import.json");
  const input = JSON.parse(await readFile(path, "utf8")) as unknown;
  const result = productImportListSchema.safeParse(input);

  if (!result.success) {
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exitCode = 1;
  } else {
    const label = result.data.length === 1 ? "produkt" : "produktů";
    console.info(`Validace proběhla úspěšně: ${result.data.length} ${label}.`);
  }
}

void main();
