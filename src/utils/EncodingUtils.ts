import ThundraLogger from '../ThundraLogger';
import zlib from 'zlib';

export const ENCODING_FUNCTIONS: { [key: string]: any } = {
    br: zlib.brotliDecompressSync,
    brotli: zlib.brotliDecompressSync,
    gzip: zlib.gunzipSync,
    deflate: zlib.deflateSync,
};

class EncodingUtils {

    private constructor() {
    }

    static getJsonPayload(data: any, encoding: string) {
        try {
            let decodedData = data;
            if (ENCODING_FUNCTIONS[encoding]) {
                try {
                    decodedData = ENCODING_FUNCTIONS[encoding](data);
                } catch (err) {
                    ThundraLogger.debug(`<EncodingUtils> Could decode data with ${encoding}`, err.message);
                }
            }

            const decodedDataRef = decodedData;
            try {
                /**
                 * Make sure data is json
                 */
                JSON.parse(decodedDataRef);
                return decodedData.toString();
            } catch (err) {
                ThundraLogger.debug('<EncodingUtils> An error occured while parsing json data.', err.message);
            }
        } catch (err) {
            ThundraLogger.debug('<EncodingUtils> An error occured while obtaining json from encoded data.', err.message);
        }
    }
}

export default EncodingUtils;
