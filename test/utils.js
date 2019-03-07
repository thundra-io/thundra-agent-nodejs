const clearEnvironmentVariables = () => {
    for (const key of Object.keys(process.env)) {
        if (key.includes('thundra')) {
            process.env[key] = undefined;
        }
    }
};

module.exports = {
    clearEnvironmentVariables
};  
  