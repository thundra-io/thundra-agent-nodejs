const path = require('path');
const credentialPath = path.resolve(__dirname, '../gcloud-credential.json');

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = credentialPath;