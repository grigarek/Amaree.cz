import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [globalIgnores([".open-next/**", ".wrangler/**", "cloudflare-env.d.ts"]), ...nextVitals];

export default eslintConfig;
