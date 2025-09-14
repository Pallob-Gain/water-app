#!/usr/bin/env deno
import WaterApp from "@mvc/water-app/builder";

console.log('Water App Builder');

await WaterApp(import.meta.resolve('./manifest.json'));

Deno.exit(0);