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

    static getPayload(data: any, encoding: string, maxLength: number): string | undefined {
        try {
            let decodedData = data;
            if (encoding && ENCODING_FUNCTIONS[encoding]) {
                try {
                    decodedData = ENCODING_FUNCTIONS[encoding](data);
                    if (decodedData.length > maxLength) {
                        return;
                    }
                } catch (err) {
                    ThundraLogger.debug(`<EncodingUtils> Could decode data with ${encoding}`, err.message);
                }
            }

            try {
                return decodedData.toString('utf8');
            } catch (err) {
                ThundraLogger.debug('<EncodingUtils> An error occured while parsing json data.', err.message);
            }
        } catch (err) {
            ThundraLogger.debug('<EncodingUtils> An error occured while obtaining json from encoded data.', err.message);
        }
    }
}

export default EncodingUtils;
