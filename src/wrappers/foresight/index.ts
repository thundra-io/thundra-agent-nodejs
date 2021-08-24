/* eslint-disable */

// import path from 'path';

import hook from '../../hook';
import libs from './lib';

// const pathSepExpr = new RegExp(`\\${path.sep}`, 'g');

export function init() {

    const instrumentations: any = Array.from(libs.values())
        .reduce((prev: any, current: any) => prev.concat(current), [])
    
    const instrumentedModules = instrumentations
        .map((instrumentation: any) => instrumentation.name);
    
    function __hookModule (moduleExports: any, moduleName: any, moduleBaseDir: any) {

        /** understand this code is needed for our structure
            moduleName = moduleName.replace(pathSepExpr, '/')
            
            if (moduleBaseDir) {
                moduleBaseDir = moduleBaseDir.replace(pathSepExpr, '/')
            }
       
            const moduleVersion = getVersion(moduleBaseDir)

            Array.from(this._plugins.keys())
            .filter(plugin => [].concat(plugin).some(instrumentation =>
                filename(instrumentation) === moduleName && matchVersion(moduleVersion, instrumentation.versions)
            ))
            .forEach(plugin => this._validate(plugin, moduleName, moduleBaseDir, moduleVersion))
         */
        
        libs
            .forEach((value: any, key: any) => {
                try {
                    [].concat(value)
                    /** understand this code is needed for our structure
                        .filter(instrumentation => moduleName === filename(instrumentation))
                        .filter(instrumentation => matchVersion(moduleVersion, instrumentation.versions))
                     */
                    .forEach(instrumentation => {
                        moduleExports = instrumentation.patch.call(this, moduleExports);
                    })
                } catch (e) {

                    // todo: log error here
                    console.error(e);
                }
            });
        
        return moduleExports
    }
    
    hook(instrumentedModules, __hookModule.bind(this));
};

