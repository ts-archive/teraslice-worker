'use strict';

const ExecutionRunner = require('./execution-runner');
const ExectionContext = require('./execution-context');

module.exports = function makeExecutionContext(context, executionContext, useExecutionRunner) {
    if (context.apis.op_runner) {
        delete context.apis.op_runner;
    }

    if (useExecutionRunner) {
        return new ExecutionRunner(context, executionContext).initialize();
    }

    return new ExectionContext(context, executionContext).initialize();
};