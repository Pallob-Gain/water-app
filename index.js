#!/usr/bin/env deno
import WaterApp from "@mvc/water-app";

console.log('Water App');

try{
    await WaterApp(import.meta.resolve('./manifest.json'));
    console.log('Fully started');
}
catch(err){
    console.log('Executation:',err);
    Deno.exit(-1);
}

