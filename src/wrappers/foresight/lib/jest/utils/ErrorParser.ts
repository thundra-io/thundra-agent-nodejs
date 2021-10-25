import Utils from '../../../../../utils/Utils';
import ThundraLogger from '../../../../../ThundraLogger';
import stripAnsi from 'strip-ansi';

export default class ErrorParser {

    static buildError(errorArr: any[], asyncError: any) {
        try {
            let error;
            const errorCount = errorArr.length;
            if (errorCount) {
              let stack = '';
              let message = '';

              if (errorCount === 1) {
                let spareStack;
                const errObj = errorArr[0];
                if (errObj) {
                    message = typeof errObj[0] === 'object' ? errObj[0].message : errObj[0];
                }

                if (errObj.length > 1) {
                    spareStack = typeof errObj[1] === 'object' ? errObj[1].stack : errObj[1];
                }

                if (asyncError && asyncError.stack) {
                    stack = asyncError.stack;
                } else {
                    stack = spareStack;
                }
              } else {
                if (Utils.isError(errorArr[0])) {
                  message = errorArr[0].message;
                }

                stack = ErrorParser.deepParseError(errorArr, 1);
              }

              error = new Error(message ? stripAnsi(message) : '');
              error.stack = stack ? stripAnsi(stack) : '';
            }

            return error;
        } catch (error) {
            ThundraLogger.debug('<ErrorParser> Test errors did not parsed', error);
        }
    }

    static parseErrors(errorArr: any[]) {
        const resultArr = [];
        for (const candidateError of errorArr) {
          if (Utils.isError(candidateError)) {
            resultArr.push({
              message: candidateError.message,
              stack: candidateError.stack,
            });
          }
        }

        return resultArr;
    }

    static deepParseError(errorArr: any[], iteration: number = 0): string {
        const result = [];
        for (const candidateError of errorArr) {
          if (Array.isArray(candidateError) && iteration) {
            result.push(ErrorParser.deepParseError([ ...candidateError ], iteration - 1));
          } else if (Utils.isError(candidateError)) {
                let stack = `${candidateError.stack}`;
                if (!stack.includes(candidateError.message)) {
                    stack = `${candidateError.message}`
                    + '\n'
                    + `${candidateError.stack}`;
                }

                result.push(stack);
            }
        }

        return result.join('\n\n');
    }
}
