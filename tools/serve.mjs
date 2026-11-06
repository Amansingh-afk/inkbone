#!/usr/bin/env node
// node tools/serve.mjs [port] : opens the storybook on a local port.
import { serve } from './lib.mjs';
const { url } = await serve(+(process.argv[2] ?? 8766)); console.log('storybook at ' + url);
