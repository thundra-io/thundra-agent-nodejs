const globalObj: any = global;

if (globalObj.loadThundraTestModules) {
    globalObj.loadThundraTestModules(require);
}
