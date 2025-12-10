import debugSys from '../../../debug.js';
// --- Main-thread API: create one worker and send requests ---

let dialogWorker = null;
let nextId = 1;
const pending = new Map();


function getWorker() {
    if (dialogWorker) return dialogWorker;
    const workerUrl = new URL("./PickerWorker.js", import.meta.url);
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
        debugSys.error("Dialog worker error:", ev.message);
    };

    return dialogWorker;
}

function callWorker(method, args) {

    const worker = getWorker();
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, method, args });
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