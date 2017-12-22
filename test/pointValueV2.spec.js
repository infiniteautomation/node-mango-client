/**
 * Copyright 2017 Infinite Automation Systems Inc.
 * http://infiniteautomation.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const config = require('./setup');
const uuidV4 = require('uuid/v4');

describe('Point values v2', function() {
    before('Login', config.login);
    
    const newDataPoint = (xid, dsXid) => {
        return new DataPoint({
            xid: xid,
            enabled: true,
            name: 'Point values test',
            deviceName: 'Point values test',
            dataSourceXid : dsXid,
            pointLocator : {
                startValue : '0',
                modelType : 'PL.VIRTUAL',
                dataType : 'NUMERIC',
                changeType : 'NO_CHANGE',
                settable: true
            }
        });
    };

    const generateSamples = (xid, startTime, numSamples, pollPeriod) => {
        const pointValues = [];
        let time = startTime;
        for (let i = 0; i < numSamples; i++) {
            pointValues.push({
                xid: xid,
                value: Math.random() * 100,
                timestamp: time,
                dataType: 'NUMERIC'
            });
            time += pollPeriod;
        }
        return pointValues;
    };

    const comparePointValues = (options) => {
        const valueProperty = options.valueProperty || 'value';
        let responseData = options.responseData;

        if (options.reverse) {
            responseData = responseData.slice().reverse();
        }
        
        let expectedValues = pointValues;
        if (options.limit != null) {
            if (options.reverse) {
                expectedValues = expectedValues.slice(-options.limit);
            } else {
                expectedValues = expectedValues.slice(0, options.limit);
            }
        }
        
        assert.isArray(responseData);
        assert.strictEqual(responseData.length, expectedValues.length);
        
        expectedValues.forEach((expectedValue, i) => {
            assert.strictEqual(responseData[i].timestamp, expectedValue.timestamp);
            assert.strictEqual(responseData[i][valueProperty], expectedValue.value);
        });
    };

    const insertionDelay = 1000;
    
    const numSamples = 100;
    const pollPeriod = 1000; //in ms
    const endTime = new Date().getTime();
    const startTime = endTime - (numSamples * pollPeriod);
    const isoFrom = new Date(startTime).toISOString();
    const isoTo = new Date(endTime).toISOString();
    const testPointXid1 = uuidV4();
    const testPointXid2 = uuidV4();
    
    const pointValues1 = generateSamples(testPointXid1, startTime, numSamples, pollPeriod);
    const pointValues2 = generateSamples(testPointXid2, startTime, numSamples, pollPeriod);
    
    before('Create a virtual data source, points, and insert values', function() {
        this.timeout(insertionDelay * 2);
        
        this.ds = new DataSource({
            xid: uuidV4(),
            name: 'Mango client test',
            enabled: true,
            modelType: 'VIRTUAL',
            pollPeriod: { periods: 5, type: 'HOURS' },
            purgeSettings: { override: false, frequency: { periods: 1, type: 'YEARS' } },
            alarmLevels: { POLL_ABORTED: 'URGENT' },
            editPermission: null
        });

        return this.ds.save().then((savedDs) => {
            assert.strictEqual(savedDs.name, 'Mango client test');
            assert.isNumber(savedDs.id);
        }).then(() => {
            this.testPoint1 = newDataPoint(testPointXid1, this.ds.xid);
            this.testPoint2 = newDataPoint(testPointXid2, this.ds.xid);
            return Promise.all([this.testPoint1.save(), this.testPoint2.save()]);
        }).then(() => {
            const valuesToInsert = pointValues1.concat(pointValues2);
            return client.pointValues.insert(valuesToInsert);
        }).then(() => config.delay(insertionDelay));
    });

    after('Deletes the new virtual data source and its points', function() {
        return this.ds.delete();
    });

    it('Gets latest point values for a data point', function() {
        return client.pointValues.latest({
            xid: testPointXid1
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                reverse: true
            });
        });
    });
    
    /*

    it('Gets latest point values for a data point with a limit', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/latest?limit=20`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                reverse: true,
                limit: 20
            });
        });
    });
    
    it('Gets latest point values for data source as single json array', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.ds.xid}/latest-data-source-single-array`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                reverse: true,
                valueProperty: this.testPoint.xid
            });
        });
    });

    it('Gets latest point values for data source as multiple json arrays', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.ds.xid}/latest-data-source-multiple-arrays`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data[this.testPoint.xid],
                reverse: true
            });
        });
    });

    it('Gets latest point values for multiple points as a single json array', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/latest-multiple-points-single-array`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                reverse: true,
                valueProperty: this.testPoint.xid
            });
        });
    });

    it('Gets latest point values for multiple points as a multiple json arrays', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/latest-multiple-points-multiple-arrays`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data[this.testPoint.xid],
                reverse: true
            });
        });
    });

    it('Gets first and last point values', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/first-last?from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            assert.strictEqual(2, response.data.length);
            //Verify first
            assert.strictEqual(pointValues[0].timestamp, response.data[0].timestamp);
            assert.strictEqual(pointValues[0].value, response.data[0].value);
            //Verify last
            assert.strictEqual(pointValues[pointValues.length-1].timestamp, response.data[1].timestamp);
            assert.strictEqual(pointValues[pointValues.length-1].value, response.data[1].value);
        });
    });

    it('Gets point values for multiple points as single array', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/multiple-points-single-array?from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                valueProperty: this.testPoint.xid
            });
        });
    });

    it('Gets point values for multiple points as single array with limit 20', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/multiple-points-single-array?limit=20&from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                valueProperty: this.testPoint.xid,
                limit: 20
            });
        });
    });

    it('Gets point values for multiple points as a multiple json arrays', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/multiple-points-multiple-arrays?from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data[this.testPoint.xid]
            });
        });
    });

    it('Gets latest point values for multiple points as a multiple json arrays with limit 20', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}/multiple-points-multiple-arrays?limit=20&from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data[this.testPoint.xid],
                limit: 20
            });
        });
    });

    it('Gets point values for single point', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}?from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data
            });
        });
    });

    it('Gets point values for single point with limit 20', function() {
        return client.restRequest({
            path: `/rest/v1/point-values/${this.testPoint.xid}?limit=20&from=${isoFrom}&to=${isoTo}`,
            method: 'GET'
        }).then(response => {
            comparePointValues({
                responseData: response.data,
                limit: 20
            });
        });
    });
    */
});
