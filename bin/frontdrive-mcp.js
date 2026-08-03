#!/usr/bin/env node
import { startServer } from '../dist/mcp/server.js';

startServer().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
