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
            let _decodedData = data;
            if (ENCODING_FUNCTIONS[encoding]) {
                try {
                    _decodedData = ENCODING_FUNCTIONS[encoding](data);
                } catch (err) {
                    ThundraLogger.debug(`<EncodingUtils> Could decode data with ${encoding}`, err.message);
                }
            }

            const decodedData = _decodedData;
            try {
                /**
                 * Make sure data is json 
                 */ 
                JSON.parse(decodedData);
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