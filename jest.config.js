module.exports = {
    verbose: true,
    testURL: 'http://localhost/',
    testPathIgnorePatterns: ['./tests/__config__'],
    setupFilesAfterEnv: ['./test/__config__/setup/setup-file.js'],
};
