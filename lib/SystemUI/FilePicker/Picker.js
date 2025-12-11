import debugSys from '../../debug.js';
// --- Main-thread API: create one worker and send requests ---

let dialogWorker = null;
let nextId = 1;
const pending = new Map();

const osBasedWorker = () => {
    if (typeof window !== "undefined") {
        throw new Error("File picker can not be run in browser environment.");
    }

    switch (Deno.build.os) {
        case 'windows':
            return "./windows/PickerWorker.js";
        case 'darwin':
            throw new Error('macOS File Picker is not implemented yet.');
        case 'linux':
            throw new Error('Linux File Picker is not implemented yet.');
        default:
            throw new Error(`Unsupported platform: ${Deno.build.os}`);
    }
};



function getWorker() {
    if (dialogWorker) return dialogWorker; //check if the worker is already created

    const workerUrl = new URL(osBasedWorker(), import.meta.url);
    dialogWorker = new Worker(workerUrl.href, { type: "module" });

    dialogWorker.onmessage = (ev) => {
        const { id, result, error } = ev.data || {};
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        if (error) entry.reject(new Error(error));
        else entry.resolve(result);
    };

    dialogWorker.onerror = (ev) => {
        debugSys.error("FilePicker error:", ev.message);

        dialogWorker.terminate();
        dialogWorker = null;

        for (const [, entry] of pending) {
            entry.reject(new Error(`FilePicker worker error: ${ev.message}`));
        }

        pending.clear();
    };

    return dialogWorker;
}

function callWorker(method, options) {

    if(Array.isArray(options.filter)){
        //convert to string format
        options.filter=options.filter.map(f=>{
            const exts=f.extensions.map(ext=>'*.'+ext).join(';');
            return f.name+` (${exts})`+'\0'+exts;
        }).join('\0')+'\0\0';
    }

    const worker = getWorker();
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, method, args: options });
    });
}

export default class Picker {
    /**
     * Open a single file.
     * Returns: string (path) or null if canceled.
     *
     * Options:
     *   filter, title, defaultExt
     * 
     * eg: filter: "Text Files\0*.txt\0All Files\0*.*\0\0" 
     *     title: "Open a text file"
     *     defaultExt: "txt"
     */
    static openFileDialog(options = {}) {
        return callWorker("openFile", options);
    }

    /**
     * Open multiple files.
     * Returns: string[] (paths) or null if canceled.
     *
     * Options:
     *   filter, title, defaultExt, maxFilesChars
     * 
     * eg: 
     *    filter: "Images\0*.png;*.jpg;*.jpeg;*.bmp;*.gif\0All Files\0*.*\0\0"
     *    title: "Select images",
     *    defaultExt: "png",
     */
    static openMultipleFilesDialog(options = {}) {
        return callWorker("openMultipleFiles", options);
    }

    /**
     * Show Save As dialog.
     * Returns: string (chosen path) or null if canceled.
     *
     * Options:
     *   filter, title, defaultExt
     * 
     * eg:
     *   filter: "Text Files\0*.txt\0All Files\0*.*\0\0"
     *   title: "Save a text file",
     *   defaultExt: "txt"
     */
    static saveFileDialog(options = {}) {
        return callWorker("saveFile", options);
    }

    /**
     * Open a folder picker dialog (modern Windows dialog).
     * Returns: string (folder path) or null if canceled.
     */
    static openFolderDialog() {
        return callWorker("openFolder", {});
    }
}