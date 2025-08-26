import { resolveModuleSpecifier } from "deno-importmap";
import { toFileUrl } from "@std/path";
import { resolve } from "import-meta-resolve";

const module_cacher = new Map();
const dummyModuleCache = new Map();
let resolverImportMap;

export function setImportMap(resolvedImportMap) {
  resolverImportMap = resolvedImportMap;
}

export function isClassInstance(obj) {
  return obj && obj.constructor && obj.constructor !== Object;
}

export function generateExportStatement(originalPath, exports_entries) {
  return exports_entries.map(([name, type]) => {
    //console.log('Module exporting:',name,type);

    switch (type) {
      case 'function':
        return `export const ${name} = () => {
                console.warn('${originalPath}.${name} is not available in browser');
              };`;
      case 'class':
        return `export class ${name} {
                constructor() {
                  console.warn('${originalPath}.${name} is not available in browser');
                }
              }`;
      case 'object':
        return `export const ${name} = {
                __dummyExport: true,
                __module: '${originalPath}'
              };`;
      default:
        return `export const ${name} = undefined;`; // all other normal export
    }
  });
}

function resolveModulePath(args) {
  //console.log('Module:', args);
  const moduleName = args.path;
  // console.log('moduleName:', moduleName);
  //return moduleName;
  if (!resolverImportMap || !moduleName.startsWith('app:')) return moduleName;

  const baseURL = new URL(args?.resolveDir ? toFileUrl(args.resolveDir) : toFileUrl(Deno.cwd()));

  //console.log('baseURL:', baseURL);

  const resolved_path = resolveModuleSpecifier(
    moduleName,
    resolverImportMap,
    baseURL,
  );

  // console.log('resolved_path:', resolved_path);

  if (resolved_path.startsWith('file:')) return resolved_path;

  try {
    //throw 'test';
    return import.meta.resolve(resolved_path);
  }
  catch (err) {
    //need to resolve again
    const [namespace, module_name] = resolved_path.split(':');
    if (namespace != 'npm') throw err;
    const moduleParsedName = module_name.split('@^').shift();
    //console.log('moduleParsedName:', moduleParsedName);
    return resolve(moduleParsedName, baseURL);
  }

}


// Mock module analyzer (in a real implementation, you'd use proper analysis)
export async function analyzeNodeModule(args) {
  const moduleName = args.path;
  if (module_cacher.has(moduleName)) return module_cacher.get(moduleName);
  // This would be replaced with actual module analysis
  //console.log('module importing:', moduleName);
  const module_data = await import(resolveModulePath(args));
  //console.log('module link:', import.meta.resolve(moduleName));

  const all_elements = Object.entries(module_data).map(([k, v]) => {
    if (k == 'default') return null;
    //if commonjs export
    if (k == 'module.exports') {
      return null;
    }

    let type = typeof v;
    if (type == 'object' && isClassInstance(v)) type = 'class';

    return [k, type];
  }).filter(v => v);

  module_cacher.set(moduleName, all_elements);

  return all_elements || {
    '__esModule': 'boolean',
    'default': 'object'
  };
}

export function dummyPlugins() {
  return [{
    name: 'ssr-module-resolver',
    setup(build) {
      //this will by pass the non permitted modules for the browser
      build.onResolve({ filter: /^(node:|deno:|app:)/ }, async (args) => {
        //console.log('found node module:',args);

        // Analyze the module (pseudo-implementation)
        const moduleExports = await analyzeNodeModule(args);

        return {
          path: args.path,
          namespace: 'node-dummy',
          pluginData: {
            originalPath: args.path,
            exports: moduleExports
          }
        };
      });

    }
  },
  {
    name: 'ssr-module-loader',
    setup(build) {
      build.onLoad({ filter: /.*/, namespace: 'node-dummy' }, (args) => {
        //console.log('dummy data:',args.pluginData);

        const { originalPath, exports } = args.pluginData;
        if (dummyModuleCache.has(originalPath)) return dummyModuleCache.get(originalPath);
        // Generate exports dynamically
        const exportStatements = generateExportStatement(originalPath, exports);
        const dummy_module = {
          contents: `
            // Dummy implementation for ${originalPath}
            ${exportStatements.join('\n')}
            
            // Default export
            const defaultExport = {
              __esModule: true,
              __dummyModule: true,
              __originalModule: '${originalPath}',
            };
            
            export default defaultExport;
          `,
          loader: 'js'
        };

        dummyModuleCache.set(originalPath, dummy_module);
        return dummy_module;
      });

    }
  }
  ];
}