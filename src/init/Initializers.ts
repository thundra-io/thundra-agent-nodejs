/**
 * Defines initializers here
 */

import * as ExpressWrapper from '../wrappers/express/ExpressWrapper';
import * as HapiWrapper from '../wrappers/hapi/HapiWrapper';

export const INITIALIZERS: any = [
    {
        name: 'ExpressWrapper',
        impl: ExpressWrapper,
    },
    {
        name: 'HapiWrapper',
        impl: HapiWrapper,
    },
];
