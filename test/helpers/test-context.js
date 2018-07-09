'use strict';

/* eslint-disable no-console */

const { createTempDirSync, cleanupTempDirs } = require('jest-fixtures');
const path = require('path');
const fs = require('fs-extra');
const {
    makeAssetStore,
    makeStateStore,
    makeAnalyticsStore,
    makeExStore,
} = require('../../lib/teraslice');
const { newId, generateContext } = require('../../lib/utils');
const overrideLogger = require('./override-logger');
const { newJobConfig, newSysConfig, newSliceConfig } = require('./configs');
const zipDirectory = require('./zip-directory');
const defaultReaderSchema = require('../fixtures/ops/example-reader').schema;
const defaultOpSchema = require('../fixtures/ops/example-op').schema;

jest.setTimeout(8000);

const cleanups = {};
const clusterName = `${process.env.TERASLICE_CLUSTER_NAME}${newId('', true, 5)}`;

class TestContext {
    constructor(testName, options = {}) {
        const {
            clusterMasterPort,
            slicerPort,
            analytics,
            maxRetries,
            operations,
            assignment,
            assets,
        } = options;

        jest.doMock('../fixtures/ops/example-reader', () => {
            const reader = jest.fn(() => Promise.resolve(Array(10).fill('hello')));
            const newReader = jest.fn(() => Promise.resolve(reader));
            const slicer = jest.fn(() => Promise.resolve(Array(10).fill('howdy')));
            const newSlicer = jest.fn(() => Promise.resolve(slicer));
            return {
                schema: jest.fn(defaultReaderSchema),
                reader,
                newReader,
                slicer,
                newSlicer,
            };
        });

        jest.doMock('../fixtures/ops/example-op', () => {
            const op = jest.fn(() => Array(10).fill('hi'));
            const newProcessor = jest.fn(() => Promise.resolve(op));
            return {
                schema: jest.fn(defaultOpSchema),
                op,
                newProcessor,
            };
        });

        this.exampleReader = require('../fixtures/ops/example-reader');
        this.exampleOp = require('../fixtures/ops/example-op');

        this.setupId = newId('setup', true);
        this.assetDir = createTempDirSync();

        this.sysconfig = newSysConfig({
            clusterName,
            assetDir: this.assetDir,
            clusterMasterPort,
        });

        this.jobConfig = newJobConfig({
            assignment,
            slicerPort,
            analytics,
            maxRetries,
            operations,
            assets,
        });

        this.exId = this.jobConfig.ex_id;
        this.jobId = this.jobConfig.job_id;

        this.context = generateContext(this.sysconfig);
        overrideLogger(this.context, testName);

        this.events = this.context.apis.foundation.getSystemEvents();

        this.stores = {};
        this.clean = false;
        this._cleanupFns = [];

        cleanups[this.setupId] = () => this.cleanup();
    }

    attachCleanup(fn) {
        this._cleanupFns.push(fn);
    }

    async saveAsset(assetDir, cleanup) {
        await this.addAssetStore();
        const exists = await fs.pathExists(assetDir);
        if (!exists) {
            const err = new Error(`Asset Directory ${assetDir} does not exist`);
            console.error(err.stack); // eslint-disable-line no-console
            throw err;
        }
        const assetZip = await zipDirectory(assetDir);
        const assetId = await this.stores.assetStore.save(assetZip);
        if (cleanup) await fs.remove(path.join(this.assetDir, assetId));
        return assetId;
    }

    async newSlice() {
        const sliceConfig = newSliceConfig();
        await this.addStateStore();
        await this.stores.stateStore.createState(this.exId, sliceConfig, 'start');
        return sliceConfig;
    }

    async addAssetStore() {
        if (this.stores.assetStore) return;
        this.stores.assetStore = await makeAssetStore(this.context);
        delete this.context.apis.assets;
    }

    async addStateStore() {
        if (this.stores.stateStore) return;
        this.stores.stateStore = await makeStateStore(this.context);
    }

    async addAnalyticsStore() {
        if (this.stores.analyticsStore) return;
        this.stores.analyticsStore = await makeAnalyticsStore(this.context);
    }

    async addExStore() {
        if (this.stores.exStore) return;
        this.stores.exStore = await makeExStore(this.context);
    }

    async cleanup() {
        if (this.clean) return;

        await Promise.map(this._cleanupFns, fn => fn());
        this._cleanupFns.length = 0;

        Object.values(this.exampleReader).forEach((mock) => {
            mock.mockClear();
        });

        Object.values(this.exampleOp).forEach((mock) => {
            mock.mockClear();
        });

        const stores = Object.values(this.stores);
        try {
            await Promise.map(stores, store => store.shutdown(true));
        } catch (err) { } // eslint-disable-line

        try {
            cleanupTempDirs();
        } catch (err) { }  // eslint-disable-line

        this.events.removeAllListeners();

        delete cleanups[this.setupId];

        this.clean = true;
    }
}

// make sure we cleanup if any test fails to cleanup properly
afterEach(async () => {
    const count = Object.keys(cleanups).length;
    if (!count) return;

    console.error(`cleaning up ${count}`);

    const fns = Object.keys(cleanups).map(async (name) => {
        const fn = cleanups[name];
        try {
            await fn();
        } catch (err) {
            console.error(`Failed to cleanup ${name}`, err);
        }
        delete cleanups[name];
    });
    await Promise.all(fns);
}, Object.keys(cleanups).length * 5000);

module.exports = TestContext;
