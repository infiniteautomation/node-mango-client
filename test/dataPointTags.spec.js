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

describe('Data point tags', function() {
    before('Login', config.login);

    before('Create a DS', function() {
        this.pointWithTags = (tags = {}) => {
            return new DataPoint({
                enabled: true,
                name: 'Data point tags test name',
                deviceName: 'Data point tags test deviceName',
                dataSourceXid : this.ds.xid,
                pointLocator : {
                    startValue : '0',
                    modelType : 'PL.VIRTUAL',
                    dataType : 'NUMERIC',
                    changeType : 'NO_CHANGE',
                },
                tags: tags
            });
        };

        this.ds = new DataSource({
            xid: 'data_point_tags_test',
            name: 'Data point tags test',
            enabled: true,
            modelType: 'VIRTUAL',
            pollPeriod: { periods: 5, type: 'SECONDS' },
            purgeSettings: { override: false, frequency: { periods: 1, type: 'YEARS' } },
            alarmLevels: { POLL_ABORTED: 'URGENT' },
            editPermission: null
        });

        return this.ds.save();
    });

    after('Delete the DS', function() {
        return this.ds.delete();
    });

    it('Can create a data point with tags', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            assert.isObject(dp.tags);
            assert.strictEqual(dp.tags.site, 'my site');
        });
    });

    it('Can create a data point with null tags', function() {
        const dp = this.pointWithTags(null);
        dp.name = uuidV4();

        return dp.save().then(dp => {
            assert.isObject(dp.tags);
            assert.lengthOf(Object.keys(dp.tags), 0);

            // even though tags are empty, the name and device tags should have been added
            let query = `tags.name=${encodeURIComponent(dp.name)}`;
            return DataPoint.query(query);
        }).then((points) => {
            assert.isArray(points);
            assert.lengthOf(points, 1);
            assert.strictEqual(points[0].xid, dp.xid);
        });
    });

    it('Can modify tags when saving data point', function() {
        const dp = this.pointWithTags({
            site: 'my site',
            machine: 'machine 1'
        });

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags.site, 'my site');
            assert.strictEqual(dp.tags.machine, 'machine 1');
            assert.lengthOf(Object.keys(dp.tags), 2);

            dp.tags.site = 'my site 2';
            dp.tags.region = 'South';
            return dp.save();
        }).then(dp => {
            assert.strictEqual(dp.tags.site, 'my site 2');
            assert.strictEqual(dp.tags.machine, 'machine 1');
            assert.strictEqual(dp.tags.region, 'South');
            assert.lengthOf(Object.keys(dp.tags), 3);
        });
    });

    it('Can remove tags when saving data point', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags.site, 'my site');
            assert.lengthOf(Object.keys(dp.tags), 1);

            dp.tags = {};
            return dp.save();
        }).then(dp => {
            assert.lengthOf(Object.keys(dp.tags), 0);
        });
    });

    it('Doesn\'t remove tags when saving data point with null tags', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags.site, 'my site');
            assert.lengthOf(Object.keys(dp.tags), 1);

            dp.tags = null;
            return dp.save();
        }).then(dp => {
            assert.strictEqual(dp.tags.site, 'my site');
            assert.lengthOf(Object.keys(dp.tags), 1);
        });
    });

    it('Can\'t set name or device tags', function() {
        const dp = this.pointWithTags({
            site: 'my site',
            name: 'xyz',
            device: 'xyz'
        });

        return dp.save().then(dp => {
            assert.notProperty(dp.tags, 'name');
            assert.notProperty(dp.tags, 'device');
            assert.strictEqual(dp.tags.site, 'my site');
            assert.lengthOf(Object.keys(dp.tags), 1);
        });
    });

    it('Can get tags for an XID', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            return DataPoint.getTags(dp.xid);
        }).then((tags) => {
            assert.strictEqual(tags.site, 'my site');
        });
    });

    it('Can set tags for an XID', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            return DataPoint.setTags(dp.xid, {
                name: 'should not stick',
                region: 'East'
            });
        }).then((tags) => {
            assert.notProperty(tags, 'site');
            assert.notProperty(tags, 'name');
            assert.strictEqual(tags.region, 'East');
            assert.lengthOf(Object.keys(tags), 1);
        });
    });

    it('Can add tags for an XID', function() {
        const dp = this.pointWithTags({
            site: 'my site'
        });

        return dp.save().then(dp => {
            return DataPoint.addTags(dp.xid, {
                name: 'should not stick',
                region: 'East'
            });
        }).then((tags) => {
            assert.notProperty(tags, 'name');
            assert.strictEqual(tags.site, 'my site');
            assert.strictEqual(tags.region, 'East');
            assert.lengthOf(Object.keys(tags), 2);
        });
    });

    it('Can get possible tag keys', function() {
        const dp = this.pointWithTags({
            site: 'my site',
            region: 'West'
        });

        return dp.save().then(dp => {
            return client.restRequest({
                path: '/rest/v2/data-point-tags/keys',
                method: 'GET'
            });
        }).then((response) => {
            const keys = response.data;
            assert.isArray(keys);
            assert.include(keys, 'name');
            assert.include(keys, 'device');
            assert.include(keys, 'site');
            assert.include(keys, 'region');
        });
    });

    it('Can get possible tag values for a tag key', function() {
        const dp = this.pointWithTags({
            site: 'Big site A',
            region: 'North'
        });

        return dp.save().then(dp => {
            return client.restRequest({
                path: '/rest/v2/data-point-tags/values/region',
                method: 'GET'
            });
        }).then((response) => {
            const values = response.data;
            assert.isArray(values);
            assert.include(values, 'North');
        });
    });

    it('Can get possible tag values for a tag key when restricting on another key', function() {
        const tagKey1 = uuidV4();
        const tagKey2 = uuidV4();
        const tagValue1 = uuidV4();
        const tagValue2 = uuidV4();

        const tags = {};
        tags[tagKey1] = tagValue1;
        tags[tagKey2] = tagValue2;

        const dp = this.pointWithTags(tags);

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags[tagKey1], tagValue1);
            assert.strictEqual(dp.tags[tagKey2], tagValue2);

            let url = `/rest/v2/data-point-tags/values/${encodeURIComponent(tagKey1)}?`;
            url += `${encodeURIComponent(tagKey2)}=${encodeURIComponent(tagValue2)}`;

            return client.restRequest({
                path: url,
                method: 'GET'
            });
        }).then((response) => {
            const values = response.data;
            assert.isArray(values);
            assert.lengthOf(values, 1);
            assert.include(values, tagValue1);
        });
    });

    it('Can query for data points using tags', function() {
        const tagKey1 = uuidV4();
        const tagKey2 = uuidV4();
        const tagValue1 = uuidV4();
        const tagValue2 = uuidV4();

        const tags = {};
        tags[tagKey1] = tagValue1;
        tags[tagKey2] = tagValue2;

        const dp = this.pointWithTags(tags);

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags[tagKey1], tagValue1);
            assert.strictEqual(dp.tags[tagKey2], tagValue2);

            let query = `tags.${encodeURIComponent(tagKey1)}=${encodeURIComponent(tagValue1)}&`;
            query += `tags.${encodeURIComponent(tagKey2)}=${encodeURIComponent(tagValue2)}`;

            return DataPoint.query(query);
        }).then((points) => {
            assert.isArray(points);
            assert.lengthOf(points, 1);
            assert.strictEqual(points[0].xid, dp.xid);
        });
    });

    it('Can query for data points using tags.name and tags.device', function() {
        const tagKey1 = uuidV4();
        const tagValue1 = uuidV4();

        const tags = {};
        tags[tagKey1] = tagValue1;

        const dp = this.pointWithTags(tags);
        const name = dp.name;
        const device = dp.deviceName;

        return dp.save().then(dp => {
            assert.strictEqual(dp.tags[tagKey1], tagValue1);

            let query = `tags.${encodeURIComponent(tagKey1)}=${encodeURIComponent(tagValue1)}&`;
            query += `tags.name=${encodeURIComponent(name)}&`;
            query += `tags.device=${encodeURIComponent(device)}`;

            return DataPoint.query(query);
        }).then((points) => {
            assert.isArray(points);
            assert.lengthOf(points, 1);
            assert.strictEqual(points[0].xid, dp.xid);
        });
    });
});