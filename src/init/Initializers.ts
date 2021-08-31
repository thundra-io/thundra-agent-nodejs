/**
 * Defines initializers here
 */

import * as ExpressWrapper from '../wrappers/express/ExpressWrapper';
import * as KoaWrapper from '../wrappers/koa/KoaWrapper';
import * as HapiWrapper from '../wrappers/hapi/HapiWrapper';
import * as ForesightWrapper from '../wrappers/foresight';

export const INITIALIZERS: any = [
    {
        name: 'ExpressWrapper',
        impl: ExpressWrapper,
    },
    {
        name: 'KoaWrapper',
        impl: KoaWrapper,
    },
    {
        name: 'HapiWrapper',
        impl: HapiWrapper,
    },
    {
        name: 'ForesightWrapper',
        impl: ForesightWrapper,
    },
];
