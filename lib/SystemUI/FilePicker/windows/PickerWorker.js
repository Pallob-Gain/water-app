if (Deno.build.os !== "windows") {
  throw new Error("Dialog worker is Windows-only.");
}

// ---------- Shared helpers ----------

function strToU16(str) {
  const buf = new Uint16Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

function strToU16Z(str) {
  const buf = new Uint16Array(str.length + 1);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  buf[str.length] = 0;
  return buf;
}

function u16ToStr(u16) {
  let len = 0;
  while (len < u16.length && u16[len] !== 0) len++;
  return String.fromCharCode(...u16.subarray(0, len));
}

function setPtr(view, offset, ptr) {
  const addr = Deno.UnsafePointer.value(ptr);
  view.setBigUint64(offset, BigInt(addr), true);
}


function writeU16Z(destU16, str) {
  // writes "str\0" into destU16, truncating if needed
  const n = Math.min(str.length, destU16.length - 1);
  for (let i = 0; i < n; i++) destU16[i] = str.charCodeAt(i);
  destU16[n] = 0;
  return n;
}


// ---------- File open/save dialogs via comdlg32.dll ----------

const comdlg32 = Deno.dlopen("comdlg32.dll", {
  GetOpenFileNameW: { parameters: ["pointer"], result: "i32" },
  GetSaveFileNameW: { parameters: ["pointer"], result: "i32" },
  CommDlgExtendedError: { parameters: [], result: "u32" },
});

// Flags
const OFN_EXPLORER = 0x00080000;
const OFN_FILEMUSTEXIST = 0x00001000;
const OFN_PATHMUSTEXIST = 0x00000800;
const OFN_NOCHANGEDIR = 0x00000008;
const OFN_ALLOWMULTISELECT = 0x00000200;
const OFN_OVERWRITEPROMPT = 0x00000002;

// Build OPENFILENAMEW (64-bit) + buffers
function buildOpenFilenameStruct({
  filter,
  title,
  defaultExt,
  flags,
  maxFilesChars = 32768,
  defaultFileName = "",
}) {
  const fileBuf = new Uint16Array(maxFilesChars);

  // Prefill default name for Save dialog (or any dialog if you want)
  if (defaultFileName && typeof defaultFileName === "string") {
    writeU16Z(fileBuf, defaultFileName);
  } else {
    fileBuf[0] = 0;
  }

  const filePtr = Deno.UnsafePointer.of(fileBuf);

  const filterBuf = strToU16(filter);
  const filterPtr = Deno.UnsafePointer.of(filterBuf);

  const titleBuf = strToU16(title);
  const titlePtr = Deno.UnsafePointer.of(titleBuf);

  const defExtBuf = strToU16(defaultExt);
  const defExtPtr = Deno.UnsafePointer.of(defExtBuf);

  const ofnBuf = new Uint8Array(152);
  const view = new DataView(ofnBuf.buffer);

  view.setUint32(0, ofnBuf.byteLength, true);
  view.setBigUint64(8, 0n, true);   // hwndOwner
  view.setBigUint64(16, 0n, true);  // hInstance
  setPtr(view, 24, filterPtr);      // lpstrFilter
  view.setBigUint64(32, 0n, true);  // lpstrCustomFilter
  view.setUint32(40, 0, true);      // nMaxCustFilter
  view.setUint32(44, 1, true);      // nFilterIndex
  setPtr(view, 48, filePtr);        // lpstrFile
  view.setUint32(56, fileBuf.length, true); // nMaxFile
  view.setBigUint64(64, 0n, true);  // lpstrFileTitle
  view.setUint32(72, 0, true);      // nMaxFileTitle
  view.setBigUint64(80, 0n, true);  // lpstrInitialDir
  setPtr(view, 88, titlePtr);       // lpstrTitle
  view.setUint32(96, flags, true);  // Flags
  view.setUint16(100, 0, true);     // nFileOffset
  view.setUint16(102, 0, true);     // nFileExtension
  setPtr(view, 104, defExtPtr);     // lpstrDefExt
  view.setBigUint64(112, 0n, true); // lCustData
  view.setBigUint64(120, 0n, true); // lpfnHook
  view.setBigUint64(128, 0n, true); // lpTemplateName
  view.setBigUint64(136, 0n, true); // pvReserved
  view.setUint32(144, 0, true);     // dwReserved
  view.setUint32(148, 0, true);     // FlagsEx

  return { ofnBuf, fileBuf };
}

function parseMultiSelectBuffer(fileBuf) {
  const segments = [];
  let current = [];
  for (let i = 0; i < fileBuf.length; i++) {
    const code = fileBuf[i];
    if (code === 0) {
      if (current.length === 0) break;
      segments.push(String.fromCharCode(...current));
      current = [];
    } else {
      current.push(code);
    }
  }

  if (segments.length === 0) return [];
  if (segments.length === 1) return [segments[0]];

  const dir = segments[0].replace(/\\\\+$/, "");
  const files = segments.slice(1);
  return files.map((name) => dir + "\\\\" + name);
}

function callGetOpen(ofnBuf, multi) {
  const ofnPtr = Deno.UnsafePointer.of(ofnBuf);
  const ok = comdlg32.symbols.GetOpenFileNameW(ofnPtr);

  if (ok === 0) {
    const err = comdlg32.symbols.CommDlgExtendedError();
    if (err === 0) return null;
    throw new Error("Common dialog error (open): 0x" + err.toString(16));
  }
}

function callGetSave(ofnBuf) {
  const ofnPtr = Deno.UnsafePointer.of(ofnBuf);
  const ok = comdlg32.symbols.GetSaveFileNameW(ofnPtr);

  if (ok === 0) {
    const err = comdlg32.symbols.CommDlgExtendedError();
    if (err === 0) return null;
    throw new Error("Common dialog error (save): 0x" + err.toString(16));
  }
}

function dialogOpenSingle(opts) {
  const filter = opts.filter || "All Files\\0*.*\\0\\0";
  const title = opts.title || "Select a file";
  const defExt = opts.defaultExt || "";

  const flags =
    OFN_EXPLORER |
    OFN_FILEMUSTEXIST |
    OFN_PATHMUSTEXIST |
    OFN_NOCHANGEDIR;

  const { ofnBuf, fileBuf } = buildOpenFilenameStruct({
    filter,
    title,
    defaultExt: defExt,
    flags,
    maxFilesChars: 32768,
  });

  const result = callGetOpen(ofnBuf, false);
  if (result === null) return null;

  const paths = parseMultiSelectBuffer(fileBuf);
  if (paths.length === 0) return null;
  return paths[0];
}

function dialogOpenMultiple(opts) {
  const filter = opts.filter || "All Files\\0*.*\\0\\0";
  const title = opts.title || "Select file(s)";
  const defExt = opts.defaultExt || "";

  const flags =
    OFN_EXPLORER |
    OFN_FILEMUSTEXIST |
    OFN_PATHMUSTEXIST |
    OFN_NOCHANGEDIR |
    OFN_ALLOWMULTISELECT;

  const { ofnBuf, fileBuf } = buildOpenFilenameStruct({
    filter,
    title,
    defaultExt: defExt,
    flags,
    maxFilesChars: opts.maxFilesChars || 32768,
  });

  const result = callGetOpen(ofnBuf, true);
  if (result === null) return null;
  const paths = parseMultiSelectBuffer(fileBuf);
  return paths;
}

function dialogSave(opts) {
  const filter = opts.filter || "All Files\\0*.*\\0\\0";
  const title = opts.title || "Save file as";
  const defExt = opts.defaultExt || "";
  const defaultFileName = opts.defaultFileName || "";

  const flags =
    OFN_EXPLORER |
    OFN_PATHMUSTEXIST |
    OFN_NOCHANGEDIR |
    OFN_OVERWRITEPROMPT;

  const { ofnBuf, fileBuf } = buildOpenFilenameStruct({
    filter,
    title,
    defaultExt: defExt,
    flags,
    maxFilesChars: 32768,
    defaultFileName
  });

  const result = callGetSave(ofnBuf);
  if (result === null) return null;

  const paths = parseMultiSelectBuffer(fileBuf);
  if (paths.length === 0) return null;
  return paths[0];
}

// ---------- Folder picker via COM (IFileOpenDialog FOS_PICKFOLDERS) ----------

function guidToBytes(guid) {
  const hex = guid.replace(/[{}-]/g, "");

  const data1 = Number.parseInt(hex.slice(0, 8), 16);
  const data2 = Number.parseInt(hex.slice(8, 12), 16);
  const data3 = Number.parseInt(hex.slice(12, 16), 16);

  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);

  view.setUint32(0, data1, true);
  view.setUint16(4, data2, true);
  view.setUint16(6, data3, true);

  for (let i = 0; i < 8; i++) {
    out[8 + i] = Number.parseInt(hex.slice(16 + i * 2, 18 + i * 2), 16);
  }

  return out;
}

function ptrFromBuf(buf, offset = 0) {
  const addr = new DataView(buf.buffer).getBigUint64(offset, true);
  return Deno.UnsafePointer.create(addr);
}

function releaseCom(ptr) {
  if (ptr == null) return;

  const vtbl = new Deno.UnsafePointerView(ptr).getPointer(0);
  const vtblView = new Deno.UnsafePointerView(vtbl);

  // IUnknown::Release = slot 2
  const fnPtr = vtblView.getPointer(2 * 8);
  const fn = new Deno.UnsafeFnPointer(fnPtr, {
    parameters: ["pointer"],
    result: "u32",
  });
  fn.call(ptr);
}


const ole32 = Deno.dlopen("ole32.dll", {
  CoInitializeEx: { parameters: ["pointer", "u32"], result: "u32" },
  CoCreateInstance: {
    parameters: ["buffer", "pointer", "u32", "buffer", "buffer"],
    result: "u32",
  },
  CoTaskMemFree: { parameters: ["pointer"], result: "void" },
  CoUninitialize: { parameters: [], result: "void" },
});

const CLSCTX_INPROC_SERVER = 0x1;
const COINIT_APARTMENTTHREADED = 0x2;

const CLSID_FileOpenDialog = guidToBytes("{DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7}");
const IID_IFileOpenDialog = guidToBytes("{D57C7288-D4AD-4768-BE02-9D969532D960}");
const IID_IShellItem = guidToBytes("{43826D1E-E718-42EE-BC55-A1E261C37BFE}");

const FOS_PICKFOLDERS = 0x00000020;

// Correct slots
const V_Show = 3;        // IModalWindow::Show
const V_SetOptions = 9;  // IFileDialog::SetOptions
const V_SetTitle = 17;   // IFileDialog::SetTitle
const V_GetResult = 20;  // IFileDialog::GetResult

function readWString(ptr) {
  const view = new Deno.UnsafePointerView(ptr);
  const codes = [];
  let offset = 0;
  while (true) {
    const u16 = view.getUint16(offset);
    if (u16 === 0) break;
    codes.push(u16);
    offset += 2;
  }
  return String.fromCharCode(...codes);
}

function dialogOpenFolder(opts) {
  let dialog = null;
  let shellItem = null;
  let pWide = null;
  let titleBuf = null;
  let comInit = false;

  try {
    const hrInit = ole32.symbols.CoInitializeEx(null, COINIT_APARTMENTTHREADED);
    if (hrInit !== 0 && hrInit !== 1) {
      throw new Error("CoInitializeEx failed: 0x" + hrInit.toString(16));
    }
    comInit = true;

    const ppv = new Uint8Array(8);
    const hr1 = ole32.symbols.CoCreateInstance(
      CLSID_FileOpenDialog,
      null,
      CLSCTX_INPROC_SERVER,
      IID_IFileOpenDialog,
      ppv,
    );

    if (hr1 !== 0) {
      throw new Error("CoCreateInstance failed: 0x" + hr1.toString(16));
    }

    dialog = ptrFromBuf(ppv);
    if (dialog == null) {
      throw new Error("Dialog pointer is NULL.");
    }

    const vtablePtr = new Deno.UnsafePointerView(dialog).getPointer(0);
    const vtable = new Deno.UnsafePointerView(vtablePtr);

    if (opts && typeof opts.title === "string" && opts.title.length > 0) {
      titleBuf = strToU16Z(opts.title);

      const fnPtr = vtable.getPointer(V_SetTitle * 8);
      const fn = new Deno.UnsafeFnPointer(fnPtr, {
        parameters: ["pointer", "pointer"],
        result: "u32",
      });

      const hr = fn.call(dialog, Deno.UnsafePointer.of(titleBuf));
      if (hr !== 0) {
        throw new Error("SetTitle failed: 0x" + hr.toString(16));
      }
    }

    {
      const fnPtr = vtable.getPointer(V_SetOptions * 8);
      const fn = new Deno.UnsafeFnPointer(fnPtr, {
        parameters: ["pointer", "u32"],
        result: "u32",
      });

      const hr = fn.call(dialog, FOS_PICKFOLDERS);
      if (hr !== 0) {
        throw new Error("SetOptions failed: 0x" + hr.toString(16));
      }
    }

    {
      const fnPtr = vtable.getPointer(V_Show * 8);
      const fn = new Deno.UnsafeFnPointer(fnPtr, {
        parameters: ["pointer", "pointer"],
        result: "u32",
      });

      const hr = fn.call(dialog, null);
      if (hr === 0x800704c7) return null;
      if (hr !== 0) {
        throw new Error("Show failed: 0x" + hr.toString(16));
      }
    }

    {
      const pShellItem = new Uint8Array(8);
      const fnPtr = vtable.getPointer(V_GetResult * 8);
      const fn = new Deno.UnsafeFnPointer(fnPtr, {
        parameters: ["pointer", "buffer"],
        result: "u32",
      });

      const hr = fn.call(dialog, pShellItem);
      if (hr !== 0) {
        throw new Error("GetResult failed: 0x" + hr.toString(16));
      }

      shellItem = ptrFromBuf(pShellItem);
      if (shellItem == null) {
        throw new Error("Shell item pointer is NULL.");
      }
    }

    const shellVtablePtr = new Deno.UnsafePointerView(shellItem).getPointer(0);
    const shellVtable = new Deno.UnsafePointerView(shellVtablePtr);

    const V_GetDisplayName = 5;
    const SIGDN_FILESYSPATH = 0x80058000;

    {
      const pStr = new Uint8Array(8);
      const fnPtr = shellVtable.getPointer(V_GetDisplayName * 8);
      const fn = new Deno.UnsafeFnPointer(fnPtr, {
        parameters: ["pointer", "u32", "buffer"],
        result: "u32",
      });

      const hr = fn.call(shellItem, SIGDN_FILESYSPATH, pStr);
      if (hr !== 0) {
        throw new Error("GetDisplayName failed: 0x" + hr.toString(16));
      }

      pWide = ptrFromBuf(pStr);
      if (pWide == null) {
        throw new Error("Path pointer is NULL.");
      }
    }

    return readWString(pWide);
  } catch (e) {
    console.error("Error in dialogOpenFolder:", e);
    throw e;
  } finally {
    if (pWide) ole32.symbols.CoTaskMemFree(pWide);
    if (shellItem) releaseCom(shellItem);
    if (dialog) releaseCom(dialog);
    if (comInit) ole32.symbols.CoUninitialize();
  }
}

// ---------- Worker message handling ----------

self.onmessage = (ev) => {
  const { id, method, args } = ev.data || {};
  //console.log("Worker received method:", method, "args:", args);
  try {
    let result;
    switch (method) {
      case "openFile":
        result = dialogOpenSingle(args || {});
        break;
      case "openMultipleFiles":
        result = dialogOpenMultiple(args || {});
        break;
      case "saveFile":
        result = dialogSave(args || {});
        break;
      case "openFolder":
        result = dialogOpenFolder(args || {});
        break;
      default:
        throw new Error("Unknown method: " + method);
    }
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: e && e.message ? e.message : String(e) });
  }
};

// Note: we intentionally do NOT close comdlg32 / ole32 here, so the worker
// can serve multiple calls over its lifetime.