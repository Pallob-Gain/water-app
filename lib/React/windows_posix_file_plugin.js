// Windows → POSIX path normalizer for esbuild-wasm (Deno)
// Usage: plugins: [windowsPosixFilePlugin(), denoLoader()]
export function windowsPosixFilePlugin() {
    return {
        name: "windows-posix-file",
        setup(build) {
            // helper: make esbuild-wasm absolute path
            const toEsbuildAbs = (p) => {
                // turn "D:\x\y" -> "/D:/x/y", and keep "/D:/x/y" as-is
                const posix = p.replace(/\\/g, '/');
                return posix.startsWith('/') ? posix : '/' + posix;
            };

            build.onResolve({ filter: /.*/, namespace: 'file' }, (args, ...others) => {
                let p = args.path;
                //console.log('onResolve:', args,others);

                const isDriveAbs = /^[A-Za-z]:[\\/]/.test(p);                // C:\ or C:/
                const isFileURLDrive = /^file:\/\/\/[A-Za-z]:\//i.test(p);   // file:///C:/

                if (isFileURLDrive) {
                    p = decodeURIComponent(new URL(p).pathname); // -> "/C:/..."
                }
                if (isDriveAbs || isFileURLDrive) {
                    p = toEsbuildAbs(p);                 // "C:\x" -> "/C:/x"
                    //console.log('fixed:', p);
                    return { path: p, namespace: 'file' };
                }

                return null;
            });
        },
    };
}
