
const OsBasedFilePicker =async () => {
    if (typeof window !== "undefined") {
       return null; //browser environment
    }

    switch (Deno.build.os) {
        case 'windows':
            return (await import('./windows/Picker.js')).default;
        case 'darwin':
           throw new Error('macOS File Picker is not implemented yet.');
        case 'linux':
           throw new Error('Linux File Picker is not implemented yet.');
        default:
            throw new Error(`Unsupported platform: ${Deno.build.os}`);
    }
};

export default await OsBasedFilePicker();