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

describe('User Event query tests', function(){
    before('Login', config.login);

    before('Insert a User Event', function(){
        return client.restRequest({
            path: '/rest/v2/example/raise-missing-event',
            method: 'POST',
            data: {
                event: {
                    typeName: "SYSTEM",
                    systemEventType: 'Test event',
                    ref1: -1,
                },
                level: 'URGENT',
                message: 'testing',
                context: {
                    'value': "Testing"
                }
            }
        }).then(response => {
          //console.log(response.data);
        });
    });



    it('Describe event query', () => {
      return client.restRequest({
          path: '/rest/v2/user-events/explain-query',
          method: 'GET'
      }).then(response => {
        //console.log(response.data);
      });
    });


    it('Query inserted event', () => {
      return client.restRequest({
          path: '/rest/v2/user-events?sort(-activeTimestamp)&limit(1)',
          method: 'GET'
      }).then(response => {
          assert.isAbove(response.data.total, 0);
          assert.equal(response.data.items.length, 1);
          assert.equal(response.data.items[0].eventType.eventType, 'SYSTEM');
          assert.equal(response.data.items[0].eventType.eventSubtype, 'Test event');
      });
    });

    /* Helper Method */
    function delay(time) {
        return new Promise((resolve) => {
            setTimeout(resolve, time);
        });
    }
});
