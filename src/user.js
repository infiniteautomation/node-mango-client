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

function userFactory(client) {
    const MangoObject = client.MangoObject;

    return class User extends MangoObject {
        static get baseUrl() {
            return '/rest/v1/users';
        }

        static get idProperty() {
            return 'username';
        }

        static login(username, password, retries, retryDelay) {
            return client.restRequest({
                path: '/rest/v2/login',
                method: 'POST',
                data: {username, password},
                retries: retries || 0,
                retryDelay: retryDelay || 5000
            }).then(response => {
                return (new User()).updateSelf(response);
            });
        }
        
        static logout() {
            return client.restRequest({
                path: '/rest/v2/logout',
                method: 'POST'
            });
        }

        static current() {
            return client.restRequest({
                path: this.baseUrl + '/current'
            }).then(response => {
                return (new User()).updateSelf(response);
            });
        }
    };
}

module.exports = userFactory;
