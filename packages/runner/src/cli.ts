import { buildRunnerApp } from "./server.js";
import { loadRunnerConfig } from "./config.js";

async function main(): Promise<void> {
  const config = loadRunnerConfig();
  const app = await buildRunnerApp({ config });
  await app.listen({ port: config.port, host: "127.0.0.1" });
  app.log.info(`automation runner listening at http://127.0.0.1:${config.port}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
