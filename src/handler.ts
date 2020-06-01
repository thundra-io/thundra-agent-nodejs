'use strict';

const thundra = require('@thundra/core');
const thundraWrapper = thundra();

const userHandler = thundra.loadUserHandler();
const wrappedUserHandler = thundraWrapper(userHandler);

exports.wrapper = (event: any, context: any, callback: any) => {
    return wrappedUserHandler(event, context, callback);
};
