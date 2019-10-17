"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var https = __importStar(require("https"));
var events_1 = require("events");
var CloudLock = /** @class */ (function (_super) {
    __extends(CloudLock, _super);
    function CloudLock(resource, config) {
        if (config === void 0) { config = {}; }
        var _this = _super.call(this) || this;
        _this.delay = 0;
        _this.maxDelay = 5 * 1000;
        _this.retryTimer = undefined;
        _this.timeoutTimer = undefined;
        var _a = config.ttl, ttl = _a === void 0 ? 5 : _a, _b = config.timeout, timeout = _b === void 0 ? 60 * 1000 : _b;
        _this.resource = resource;
        _this.ttl = ttl;
        _this.timeout = timeout;
        _this.x = _this.getRestClient();
        _this.lockData = undefined;
        return _this;
    }
    CloudLock.prototype.getConfig = function () {
        return { ttl: this.ttl, timeout: this.timeout };
    };
    CloudLock.prototype.getRestClient = function () {
        var httpsAgent = new https.Agent({ keepAlive: true });
        return axios_1.default.create({
            baseURL: 'https://api.forkzero.com/cloudlock',
            timeout: 2000,
            headers: { 'X-ForkZero-Client': 'cloud-lock-js' },
            httpsAgent: httpsAgent,
            validateStatus: function (status) {
                return status === 201 || status === 423; // Reject only if the status code is not 201 or 423
            }
        });
    };
    CloudLock.prototype.lock = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.x.post("/accounts/foo/resources/" + this.resource + "/locks?ttl=" + this.ttl)];
                    case 1:
                        response = _a.sent();
                        console.log("status=" + response.status);
                        return [2 /*return*/, response.data];
                    case 2:
                        error_1 = _a.sent();
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    CloudLock.prototype.lockWithTimeout = function (resolve, reject) {
        var _this = this;
        this.retryTimer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.lock()];
                    case 1:
                        result = _a.sent();
                        if (result.status === 'granted') {
                            if (typeof this.timeoutTimer !== 'undefined') {
                                clearTimeout(this.timeoutTimer);
                            }
                            this.delay = 0;
                            this.emit('lock', result);
                            resolve(result);
                        }
                        else {
                            this.emit('retry', result);
                            this.lockWithTimeout(resolve, reject);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        this.emit('error', error_2);
                        this.lockWithTimeout(resolve, reject);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, this.nextDelay());
    };
    CloudLock.prototype.wait = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // setup the overall timout
            _this.timeoutTimer = setTimeout(function () {
                if (typeof _this.retryTimer !== 'undefined') {
                    clearTimeout(_this.retryTimer);
                }
                _this.delay = 0;
                _this.emit('timeout');
                reject(new Error("TimedOut"));
            }, _this.timeout);
            // try to get a lock
            _this.lockWithTimeout(resolve, reject);
        });
    };
    CloudLock.prototype.nextDelay = function () {
        var delay = this.delay;
        if (delay === 0) {
            this.delay = 100;
        }
        else {
            this.delay = delay * 2;
            if (this.delay > this.maxDelay) {
                this.delay = this.maxDelay;
            }
        }
        console.log("retry delay = " + delay + ", next = " + this.delay);
        return delay;
    };
    return CloudLock;
}(events_1.EventEmitter));
exports.default = CloudLock;
;
