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

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const uuidV4 = require('uuid/v4');
const FormData = require('form-data');

const DataSourceFactory = require('./dataSource');
const DataPointFactory = require('./dataPoint');
const UserFactory = require('./user');
const MangoObjectFactory = require('./mangoObject');
const pointValuesFactory = require('./pointValue.js');

class MangoClient {
    constructor(options) {
        options = options || {};

        const enableCookies = options.enableCookies == null || options.enableCookies;

        if (enableCookies) {
            this.cookies = {
                'XSRF-TOKEN': uuidV4()
            };
        }
        
        this.defaultHeaders = options.defaultHeaders || {};

        if (options.agent) {
            this.agent = options.agent;
            return;
        }

        const agentOpts = {
            host: options.host || 'localhost',
            port: options.port || (options.protocol === 'https' ? 8443 : 8080),
            rejectUnauthorized: options.rejectUnauthorized == null ? true : !!options.rejectUnauthorized,
            keepAlive: true
        };

        if (options.protocol === 'https') {
            this.agent = new https.Agent(agentOpts);
        } else {
            this.agent = new http.Agent(agentOpts);
        }

        this.MangoObject = MangoObjectFactory(this);
        this.DataSource = DataSourceFactory(this);
        this.DataPoint = DataPointFactory(this);
        this.User = UserFactory(this);
        const PointValues = pointValuesFactory(this);
        this.pointValues = new PointValues();
    }
    
    setBearerAuthentication(token) {
        this.defaultHeaders.Authorization = `Bearer ${token}`;
    }
    
    setBasicAuthentication(username, password) {
        const encoded = new Buffer(`${username}:${password}`).toString('base64');
        this.defaultHeaders.Authorization = `Basic ${encoded}`;
    }

    restRequest(optionsArg) {
        let requestPromise = new Promise((resolve, reject) => {
            const options = {
                path : optionsArg.path,
                agent: this.agent,
                method : optionsArg.method || 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            };

            if (optionsArg.params) {
                const keys = Object.keys(optionsArg.params);
                if (keys.length) {
                    const params = {};
                    keys.forEach(key => {
                       const value = optionsArg.params[key];
                       if (value instanceof Date) {
                           params[key] = value.toISOString();
                       } else {
                           params[key] = value;
                       }
                    });
                    options.path += '?' + querystring.stringify(params);
                }
            }

            let jsonData;
            let formData;
            if (optionsArg.data) {
                jsonData = JSON.stringify(optionsArg.data);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            } else if (optionsArg.uploadFiles) {
                formData = new FormData();
                optionsArg.uploadFiles.forEach(fileName => {
                    formData.append(path.basename(fileName), fs.createReadStream(fileName));
                });
                options.headers['Content-Type'] = 'multipart/form-data; boundary=' + formData.getBoundary();
            }

            if (this.cookies) {
                if (this.cookies['XSRF-TOKEN']) {
                    options.headers['X-XSRF-TOKEN'] = this.cookies['XSRF-TOKEN'];
                }
                
                const requestCookies = [];
                Object.keys(this.cookies).forEach(name => {
                    const value = encodeURIComponent(this.cookies[name]);
                    if (value != null) {
                        requestCookies.push(`${name}=${value}`);
                    }
                });
                if (requestCookies.length) {
                    options.headers.Cookie = requestCookies.join('; ');
                }
            }

            Object.assign(options.headers, this.defaultHeaders, optionsArg.headers);

            const requestMethod = this.agent.protocol === 'https:' ? https.request : http.request;
            const request = requestMethod(options, response => {
                const responseData = {
                    status: response.statusCode,
                    data: null,
                    headers: response.headers
                };

                if (this.cookies) {
                    const setCookieHeaders = response.headers['set-cookie'];
                    if (setCookieHeaders) {
                        setCookieHeaders.map(parseCookie).forEach(cookie => {
                            if (cookie['Max-Age'] === '0') {
                                delete this.cookies[cookie.name];
                            } else {
                                this.cookies[cookie.name] = cookie.value;
                            }
                        });
                    }
                }

                const chunks = [];
                if (optionsArg.writeToFile) {
                    const fileOutputStream = fs.createWriteStream(optionsArg.writeToFile);
                    response.pipe(fileOutputStream);
                } else {
                    response.on('data', chunk => chunks.push(chunk));
                }

                response.on('end', () => {
                    if (chunks.length) {
                        const fullBody = Buffer.concat(chunks);

                        if (optionsArg.dataType === 'buffer') {
                            responseData.data = fullBody;
                        } else {
                            const stringBody = fullBody.toString('utf8');

                            if (optionsArg.dataType === 'string') {
                                responseData.data = stringBody;
                            } else {
                                try {
                                    responseData.data = JSON.parse(stringBody);
                                } catch(e) {
                                    reject(e);
                                }
                            }
                        }
                    }

                    if (response.statusCode < 400) {
                        resolve(responseData);
                    } else {
                        const e = new Error(`Mango HTTP error - ${response.statusCode} ${response.statusMessage}`);
                        e.status = response.statusCode;
                        e.headers = response.headers;
                        e.response = response;
                        e.data = responseData.data;
                        reject(e);
                    }
                });
            });

            request.on('error', error => reject(error));

            if (formData) {
                formData.pipe(request);
            } else {
                if (jsonData) {
                    request.write(jsonData);
                }
                request.end();
            }
        });

        if (optionsArg.retries > 0) {
            optionsArg.retries--;
            requestPromise = requestPromise.catch((error) => {
                return delay(optionsArg.retryDelay || 5000).then(this.restRequest.bind(this, optionsArg));
            });
        }

        return requestPromise;

        function delay(time) {
            return new Promise((resolve) => {
                setTimeout(resolve, time);
            });
        }
        
        function parseCookie(cookieHeader) {
            const cookieParts = cookieHeader.split(/\s*;\s*/);
            const cookieObject = {};
            cookieParts.forEach((part, i) => {
                const keyValue = part.split('=');
                if (keyValue.length <= 0) return;

                if (i === 0) {
                    cookieObject.name = keyValue[0];
                    const matches = /^"(.*)"$/.exec(keyValue[1]);
                    cookieObject.value = decodeURIComponent(matches ? matches[1] : keyValue[1]);
                } else {
                    cookieObject[keyValue[0]] = keyValue[1];
                }
            });
            return cookieObject;
        }
    }
}

module.exports = MangoClient;
