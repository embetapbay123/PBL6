// Validate the reviewed contract using the repository lockfile dependency.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const parserDir = process.env.PBL6_SWAGGER_PARSER || '@apidevtools/swagger-parser';
const SwaggerParser = require(parserDir);
const apiPath = fileURLToPath(new URL('../docs/contracts/openapi.json', import.meta.url));
for (const path of [apiPath,fileURLToPath(new URL('../docs/contracts/internal-api.json',import.meta.url))]) {
  const api = await SwaggerParser.validate(path);
  process.stdout.write(`Validated OpenAPI ${api.info.version}: ${Object.keys(api.paths).length} paths\n`);
}
