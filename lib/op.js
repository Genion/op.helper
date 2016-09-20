	'use strict';

	var https = require('https');

	var querystring = require("querystring");

	var log = (() => {
	    function time() {
	        var d = new Date();
	        var fix = function(v) {
	            return v < 10 ? ('0' + v) : v;
	        }

	        return fix(d.getHours()) + ':' + fix(d.getMinutes()) + ":" + fix(d.getSeconds());
	    }

	    return (v) => {
	        console.log('\x1BcRuning\n[' + time() + '] ' + v);
	    }
	}());

	class OP {

	    static run(usr, pwd) {
	        if (usr && pwd) {
	            return new OP({ email: usr, password: pwd });

	        } else {
	            log('require email and password!');
	        }
	    }

	    constructor(opts) {
	    	log('Start');

	        this.account = {
	            'email': opts.email,
	            'password': opts.password
	        }

	        this.count = 0;

	        if (this.account.email && this.account.password) {
	            this.signin();
	        }
	    }

	    post(path, obj, cb, fail) {

	        let local = this;

	        const HOST = 'panel.op-net.com';


	        let data = querystring.stringify(obj);
	        let opts = {
	            host: HOST,
	            path: path,
	            method: "POST",
	            headers: {
	                "Content-Length": data.length,
	                "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
	                "Cache-Control": "no-cache",
	                "Connection": "Keep-Alive",
	                "Host": "panel.op-net.com",
	                "Referer": "https://panel.op-net.com/",
	                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36",
	                "X-requested-with": "XMLHttpRequest"
	            }
	        };

	        if (local.cookie) {
	            opts.headers['Cookie'] = local.cookie.value.join('; ');
	        }

	        let req = https.request(opts, (res) => {
	            let response = "";

	            res.on("data", (d) => { response += d; });
	            res.on("end", () => {
	                if (!local.cookie) {
	                    let headers = res.headers;
	                    let cookie = headers["set-cookie"];
	                    local.cookie = {
	                        value: cookie,
	                        expires: cookie.join().match(/Expires=(.*);/i)[1]
	                    };
	                }
	                cb(response);
	            });
	        });

	        req.on('error', (e) => {
	            fail && fail();
	        });

	        req.write(data);
	        req.end();
	    }

	    signin() {
	        let local = this;
	        this.post('/login', this.account, (resp) => {
	            if (resp.indexOf('you entered is incorrect') == -1) {
	                if (resp.indexOf('Sign in') != -1) {
	                    log(resp.substring(resp.indexOf('Sign in'), 1000))
	                    log('Login fail retry');
	                    local.signin();
	                } else {
	                    log('Login success');
	                    local.get_csrf();
	                }

	            } else {
	                log('Login fail , The email or password you entered is incorrect.');
	            }
	        }, (e) => {
	            log('Login fail retry');
	            local.signin();
	        })
	    }

	    get_csrf() {
	        let local = this;

	        this.post('/cloud', {}, (resp) => {
	            let csrf_token = (resp.match(/csrf_token\" value=\"([^\"]+)/i) || ['', ''])[1];
	            let vm_id = (resp.replace(/[\r\n\t]/g,'').match(/vm_id\" value=\"([^\"]+)\"><.*?open_vm/i) || ['', ''])[1];

	            local.csrf_token = csrf_token;
	            local.vm_id = vm_id;

	            log('Get csrf_token:' + csrf_token + ', vm_id:' + vm_id);
	            local.process();
	        })
	    }

	    process() {
	        let local = this;

	        if (!this.csrf_token || !this.vm_id) return;
	        var data = {
	            plan: 'Plan 01',
	            csrf_token: this.csrf_token,
	            vm_id: this.vm_id,
	            location: 13,
	            os: 'linux-ubuntu-14.04-server-x86_64-min-gen2-v1',
	            hostname: "op-hosname",
	            root: ""
	        };

	        this.post('/cloud/open', data, (resp) => {
	            if (
	            	resp.indexOf('impossible to create a VM Plan 01') == -1
	            	&& 
	            	resp.indexOf('Something went wrong') == -1
	            ) {
	                log('Create success , enjoy!');
	                //location.href = url + 'cloud'
	            } else {
	                log('Create fail' + ' ( ' + ++local.count + ' times )');
	                setTimeout(function() {
	                    local.process();
	                }, 50);
	            }
	        }, (e) => {
	            log('Request fail' + ' (' + count + ')');
	            setTimeout(function() {
	                local.process();
	            }, 50);
	        })
	    }
	}

	if (typeof module !== "undefined" && module.exports) {
	    module.exports = OP;
	}
