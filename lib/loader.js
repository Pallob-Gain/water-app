import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { exists } from "@std/fs";

import alias from 'esbuild_plugin_alias';
import { isPlainObject } from "./UI/componentPorcess.js";

import Configuration from "../deno.json" with {type: "json"};
import Package from "../package.json" with {type: "json"};


export function getDirname(meta_url) {
    const __filename = fileURLToPath(meta_url);
    return path.resolve(path.dirname(__filename));
}

export async function importModule(link, options = null) {
    // console.log('importing:',link);

    // if(link.indexOf('file://')==0){
    //     const blob = new Blob([(await fs.readFile(fileURLToPath(link))).toString()], { type: 'application/javascript' });
    //     link=URL.createObjectURL(blob);
    // }

    return await options ? import(link, options) : import(link);
}

const pathToNameSpace = (path) => {

    if (path.startsWith("file:")) return 'file';
    if (path.startsWith("npm:")) return 'npm';
    if (path.startsWith("jsr:")) return 'jsr';
    else if (path.startsWith("https//esm")) return 'esm';
    else if (path.startsWith("https//jsr.io")) return 'jsr';

    return null;
}

export async function loadExportedAlias(config_file) {
    const config_dirname = path.dirname(config_file);
    const { default: current_config } = await import(pathToFileURL(config_file), { with: { type: "json" } });

    let alias_stores = {};
    let all_modules = [];

    if (current_config?.exports) {

        let package_name = current_config?.name;
        let all_exports = Object.entries(current_config?.exports).map(([key, val]) => {
            const mentioned_key = package_name ? path.join(package_name, key).replaceAll("\\", "/").replace(/\/+/g, "/") : key;
            return [mentioned_key, pathToFileURL(path.join(config_dirname, val))];
        });

        Object.assign(alias_stores, Object.fromEntries(all_exports));
    }

    //console.log('alias_stores:',config_file,alias_stores);

    return alias(alias_stores);
}


export async function loadAllModuleAlias(config_file, only_absolute_path = true) {

    const { default: current_config } = await import(config_file, { with: { type: "json" } });
    //console.log('loading module from:',config_dirname);
    //exports files
    const alias_stores = {};
    const all_modules = [];

    if (current_config?.exports && config_file.startsWith('file:')) {
        const config_dirname = path.dirname(fileURLToPath(config_file));
        const package_name = current_config?.name;
        const all_exports = Object.entries(current_config?.exports).map(([key, val]) => {
            const mentioned_key = package_name ? path.join(package_name, key).replaceAll("\\", "/").replace(/\/+/g, "/") : key;
            return [mentioned_key, path.join(config_dirname, val)];
        });

        Object.assign(alias_stores, Object.fromEntries(all_exports));
    }
    if (current_config?.imports) {
        const all_imports = Object.entries(current_config?.imports).map(([key, val]) => {
            return [key, val];
        });

        all_modules.push(...all_imports);
    }

    Object.assign(alias_stores, Object.fromEntries(all_modules.map(([name, resolved_path]) => {
        const namespace = pathToNameSpace(resolved_path);
        if (only_absolute_path && namespace != 'file') return null;
        //console.log('test-->',namespace,resolved_path);
        const file_path = namespace == 'file' ? resolved_path : import.meta.resolve(resolved_path);
        //console.log('test-->',namespace,file_path);
        return [name, file_path.startsWith('file:') ? fileURLToPath(file_path) : file_path]; //if file then use path other wise get the path making resolve and use it
    }).filter(v => v)));

    //console.log("alias_stores:",alias_stores);

    return alias(alias_stores
        , {
            // Tell esbuild which paths need a namespace
            findNamespace: (path) => {
                //console.log(path);
                const namespace = pathToNameSpace(path);
                return namespace ? namespace : 'file';
            },
        }

    );
}


export async function getStaticFilePath(fileUrl) {
    try {
        if (fileUrl.startsWith("file://")) {
            // Local development: Return the file path directly
            return fileURLToPath(fileUrl);
        }

        // Hosted on JSR: Fetch the file
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
        }

        // Get the file as a binary ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Compute SHA-256 hash of the file content for uniqueness
        const hash = createHash("sha256").update(data).digest("hex");

        // Extract file extension from the URL
        const url = new URL(fileUrl);
        const fileName = url.pathname.split("/").pop() || "tempfile";
        const suffix = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";

        // Check if a temp file with this hash exists
        const tempDir = Deno.makeTempDirSync(); // Get system temp directory
        const tempFilePath = `${tempDir}/${hash}${suffix}`;
        if (await exists(tempFilePath)) {
            return tempFilePath; // Reuse existing file
        }

        // Create a new temporary file
        await Deno.writeFile(tempFilePath, data);

        return tempFilePath;
        // Note: The temp file persists until manually deleted or system cleanup
    } catch (error) {
        throw new Error(`Failed to get static file: ${error.message}`);
    }
}