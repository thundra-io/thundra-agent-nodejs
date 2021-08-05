/**
 * Defines initializers here
 */

import * as ExpressWrapper from '../wrappers/express/ExpressWrapper';
import * as KoaWrapper from '../wrappers/koa/KoaWrapper';

export const INITIALIZERS: any = [
    {
        name: 'ExpressWrapper',
        impl: ExpressWrapper,
    },
    {
        name: 'KoaWrapper',
        impl: KoaWrapper,
    },
];
