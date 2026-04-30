#!/usr/bin/env node
import { makeClient, getOrCreateActiveSession, printProgress } from "./common.mjs";

const c = await makeClient();
try {
  const s = await getOrCreateActiveSession(c);
  await printProgress(c, s.id);
} finally {
  await c.end();
}
