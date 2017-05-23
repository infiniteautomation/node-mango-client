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

describe('Test SNMP Data Source REST', function() {
    before('Login', config.login);

    it('Create SNMP data source', () => {

      const ds = new DataSource({
        xid : "DS_SNMP_TEST",
        name : "SNMP Test",
        enabled : false,
        modelType : "SNMP",
        host : "localhost",
        port : 161,
        timeout : 1000,
        retries : 2,
        authPassphrase : "",
        authProtocol : "",
        community : "community",
        contextEngineId : "",
        engineId : "",
        privPassphrase : "",
        privProtocol : "",
        securityName : "",
        snmpVersion : 0,
        trapPort : 162,
        maxRequestVars : 0,
        localAddress : "",
        contextName : "",
        pollPeriod : {
          periods : 5,
          type : "SECONDS"
        },
        editPermission : "edit-test",
        purgeSettings : {
          override : false,
          frequency : {
            periods : 1,
            type : "YEARS"
          }
        },
        alarmLevels : {
          POLL_ABORTED : "URGENT",
          PDU_EXCEPTION : "URGENT",
          DATA_SOURCE_EXCEPTION : "URGENT"
        }
      });

      return ds.save().then((savedDs) => {
        assert.equal(savedDs.xid, 'DS_SNMP_TEST');
        assert.equal(savedDs.name, 'SNMP Test');
        assert.equal(savedDs.enabled, false);
        assert.equal(savedDs.host, "localhost");
        assert.equal(savedDs.port, 161);
        assert.equal(savedDs.timeout, 1000);
        assert.equal(savedDs.retries, 2);
        assert.equal(savedDs.authPassphrase, "");
        assert.equal(savedDs.authProtocol, "");
        assert.equal(savedDs.community, "community");

        assert.equal(savedDs.editPermission, "edit-test");
        assert.isNumber(savedDs.id);
      });
    });

    //TODO Create SNMP Point
    it('Create SNMP data point', () => {

      const dp = new DataPoint({
            xid : "DP_SNMP_TEST",
            deviceName : "SNMP",
            name : "SNMP Test Point 1",
            enabled : false,
            templateXid : "Binary_Default",
            loggingProperties : {
              tolerance : 0.0,
              discardExtremeValues : false,
              discardLowLimit : -1.7976931348623157E308,
              discardHighLimit : 1.7976931348623157E308,
              loggingType : "ON_CHANGE",
              intervalLoggingType: "INSTANT",
              intervalLoggingPeriod : {
                periods : 15,
                type : "MINUTES"
              },
              overrideIntervalLoggingSamples : false,
              intervalLoggingSampleWindowSize : 0,
              cacheSize : 1
            },
            textRenderer : {
              zeroLabel : "zero",
              zeroColour : "blue",
              oneLabel : "one",
              oneColour : "black",
              type : "textRendererBinary"
            },
            chartRenderer : {
              limit : 10,
              type : "chartRendererTable"
            },
            dataSourceXid : "DS_SNMP_TEST",
            useIntegralUnit : false,
            useRenderedUnit : false,
            readPermission : "read",
            setPermission : "write",
            chartColour : "",
            rollup : "NONE",
            plotType : "STEP",
            purgeOverride : false,
            purgePeriod : {
              periods : 1,
              type : "YEARS"
            },
            unit : "",
            pointFolderId : 0,
            integralUnit : "s",
            renderedUnit : "",
            modelType : "DATA_POINT",
            pointLocator : {
              oid : "1.1.1.1.1.3",
              setType : "NONE",
              trapOnly : false,
              multiplicand : 1.0,
              augend : 0.0,
              binary0Value : "0",
              modelType : "PL.SNMP",
              dataType : "BINARY",
              settable : false,
              relinquishable : false
            },
          });

      return dp.save().then((savedDp) => {
        assert.equal(savedDp.xid, 'DP_SNMP_TEST');
        assert.equal(savedDp.name, 'SNMP Test Point 1');
        assert.equal(savedDp.enabled, false);

        assert.equal(savedDp.pointLocator.oid, "1.1.1.1.1.3");
        assert.equal(savedDp.pointLocator.setType, "NONE");
        assert.equal(savedDp.pointLocator.trapOnly, false);
        assert.equal(savedDp.pointLocator.multiplicand, 1.0);
        assert.equal(savedDp.pointLocator.augend, 0.0);
        assert.equal(savedDp.pointLocator.binary0Value, "0");
        assert.equal(savedDp.pointLocator.dataType, "BINARY");
        assert.equal(savedDp.pointLocator.settable, false);
        assert.equal(savedDp.pointLocator.relinquishable, false);

        assert.isNumber(savedDp.id);
      });
    });

    it('Copy SNMP data source', () => {
      return client.restRequest({
          path: '/rest/v1/data-sources/copy/DS_SNMP_TEST?copyXid=DS_SNMP_TEST_COPY&copyName=SNMP_TEST_COPY_NAME',
          method: 'PUT'
      }).then(response => {
        assert.equal(response.data.xid, 'DS_SNMP_TEST_COPY');
        assert.equal(response.data.name, 'SNMP_TEST_COPY_NAME');
        assert.isNumber(response.data.id);
      });
    });

    it('Deletes the copy snmp data source and its point', () => {
        return DataSource.delete('DS_SNMP_TEST_COPY');
    });

    it('Deletes the new snmp data source and its point', () => {
        return DataSource.delete('DS_SNMP_TEST');
    });
});