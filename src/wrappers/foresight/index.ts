/* eslint-disable */

import path from 'path';

import hook from '../../hook';
import libs from './lib';

import ConfigProvider from '../../config/ConfigProvider';
import TestReporter from './reporter';

const libsMap = new Map();

const pathSepExpr = new RegExp(`\\${path.sep}`, 'g');

Object.keys(libs).forEach(key => {
    libsMap.set(libs[key], { name: key, config: {} });
})

export function init() {

    const { apiKey } = ConfigProvider.thundraConfig;
    
    const reporter = new TestReporter(apiKey);

    const instrumentations: any = Array.from(libsMap.keys())
    .reduce((prev: any, current: any) => prev.concat(current), [])
    
    const instrumentedModules = instrumentations
    .map(instrumentation => instrumentation.name)
    
    function __hookModule (moduleExports: any, moduleName: any, moduleBaseDir: any) {

        moduleName = moduleName.replace(pathSepExpr, '/')
        
        if (moduleBaseDir) {
            moduleBaseDir = moduleBaseDir.replace(pathSepExpr, '/')
        }
        
        libsMap
        .forEach((meta: any, plugin: any) => {
            try {
                [].concat(plugin)
                // .filter(instrumentation => moduleName === filename(instrumentation))
                // .filter(instrumentation => matchVersion(moduleVersion, instrumentation.versions))
                .forEach(instrumentation => {
                    const config = libsMap.get(plugin).config
                                      
                    if (config.enabled !== false) {   
                        moduleExports = instrumentation.patch.call(this, moduleExports, reporter, config)
                    }
                })
            } catch (e) {

                // todo: log error here
                console.error(e);
            }
        })
        
        return moduleExports
    }
    
    hook(instrumentedModules, __hookModule.bind(this));
};

