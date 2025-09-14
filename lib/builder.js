import { createRequire } from 'node:module';
import { includeJson } from './include.js';
import { fileURLToPath, pathToFileURL } from 'node:url'
import path, { dirname } from 'node:path'
import { getDirname } from "./loader.js";
import { initializeManifest } from "./index.js";
import { getClientPath, makeBundle } from './React/bundle.js';
import fs from 'node:fs';

export async function saveFile(filePath, data) {
    // Create the parent folder(s) if missing
    await Deno.mkdir(dirname(filePath), { recursive: true });

     await Deno.writeTextFile(filePath, data);
}

//we need to bundle the main files
export default async function Builder(manifest_filename) {
    const __dirname = getDirname(manifest_filename);
    const details = initializeManifest(manifest_filename);

    if (!fs.existsSync(details.__links)) return;
    const link_info = includeJson(details.__links);
    if (!('views' in link_info)) return;

    const __linkdir = dirname(details.__links);
    const links = link_info.views;
    const __viewdir = details.__viewdir;

    console.log("Bundler directory:", details.__bundles_dir);

    for (const i in links) {
        if (!('filename' in links[i])) continue; //if that is not file redirection type
        const link = links[i];
        const file_link = path.join(__viewdir, link.filename);
        console.log('Bundling file:', file_link);
        const fileUrl = pathToFileURL(file_link);
        const url = fileUrl.href;
        const clientPath = getClientPath(url);
        const bundle_js_code = await makeBundle(url);
        await saveFile(path.join(details.__bundles_dir, clientPath), bundle_js_code);
    }

    console.log('Build completed!');
}