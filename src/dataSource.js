/**
 * Copyright 2017 Infinite Automation Systems Inc.
 * http://infiniteautomation.com/
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

const uuid = require('uuid/v4');

function dataSourceFactory(client) {
    const MangoObject = client.MangoObject;

    return class DataSource extends MangoObject {
        
        static get defaultProperties() {
            const xid = uuid();
            return {
                xid: xid,
                name: xid + ' Name',
                enabled: false,
                quantize: true,
                useCron: false,
                cronPattern: '',
                pollPeriod: { periods: 5, type: 'SECONDS' },
                purgeSettings: { override: false, frequency: { periods: 1, type: 'YEARS' } },
                eventAlarmLevels: [],
                editPermission: null
            };
        }
        
        static get baseUrl() {
            return '/rest/v3/data-sources';
        }
    };
}

module.exports = dataSourceFactory;
