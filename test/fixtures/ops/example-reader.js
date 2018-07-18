'use strict';

const _ = require('lodash');

const defaultResults = _.times(10, () => 'hello');
const defaultSlicerResults = ['howdy', null];

function schema() {
    return {
        errorAt: {
            doc: 'An array of indexes to error at',
            default: [],
            format: 'Array'
        },
        results: {
            doc: 'Reader results to return',
            default: defaultResults,
            format: 'Array'
        },
        slicerErrorAt: {
            doc: 'An array of indexes to error at when newSlicer is invoked',
            default: [],
            format: 'Array'
        },
        slicerResults: {
            doc: 'Slicer results to return',
            default: defaultSlicerResults,
            format: 'Array'
        }
    };
}

module.exports = {
    schema,
    newReader: jest.fn((context, opConfig) => {
        const results = _.get(opConfig, 'results', defaultResults);
        const errorAt = _.get(opConfig, 'errorAt', []);

        if (!context._readerCalls) context._readerCalls = -1;

        return Promise.resolve(() => {
            context._readerCalls += 1;

            if (_.includes(errorAt, context._readerCalls)) {
                return Promise.reject(new Error('Bad news bears'));
            }

            return Promise.resolve(results);
        });
    }),
    newSlicer: jest.fn((context, executionContext) => {
        const slicerResults = _.get(executionContext, 'config.operations[0].slicerResults', defaultSlicerResults);
        const errorAt = _.get(executionContext, 'config.operations[0].slicerErrorAt', []);

        if (!context._slicerCalls) context._slicerCalls = -1;
        context._slicerCalls += 1;

        if (_.includes(errorAt, context._slicerCalls)) {
            return Promise.reject(new Error('Bad news bears'));
        }

        return [
            () => slicerResults.shift(),
        ];
    })
};
