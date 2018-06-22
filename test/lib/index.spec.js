'use strict';

const { EventEmitter } = require('events');
const TerasliceWorker = require('../../lib');

describe('TerasliceWorker', () => {
    let worker;
    beforeEach(() => {
        const config = {
            terafoundation: {
                environment: 'development',
                connectors: {
                    elasticsearch: {
                        default: {
                            host: ['example.dev:9200']
                        }
                    }
                }
            },
            teraslice: {
                name: 'test-teraslice-cluster',
                master_hostname: 'localhost'
            }
        };
        const jobConfig = {
            type: 'example',
            job: {
                example: true
            },
            exId: 'example-ex-id',
            jobId: 'example-job-id',
            slicerPort: 0
        };
        worker = new TerasliceWorker(config, jobConfig);
    });

    it('should create a logger', () => {
        expect(worker).toHaveProperty('logger');
        expect(worker.logger).toHaveProperty('flush');
        expect(worker.logger).toHaveProperty('debug');
        expect(worker.logger).toHaveProperty('info');
        expect(worker.logger).toHaveProperty('trace');
        expect(worker.logger).toHaveProperty('error');
        expect(worker.logger).toHaveProperty('warn');
    });

    it('should have have workerId', () => {
        expect(worker).toHaveProperty('workerId');
        const { hostname } = worker.context.sysconfig.teraslice;
        const { id } = worker.context.cluster.worker;
        expect(worker.workerId).toEqual(`${hostname}__${id}`);
    });

    it('should have an event emitter', () => {
        expect(worker.events instanceof EventEmitter).toBe(true);
    });
});