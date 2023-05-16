"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AccessGroupFromALSApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessGroupFromALSApiService = void 0;
const access_group_service_1 = require("./access-group.service");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let AccessGroupFromALSApiService = AccessGroupFromALSApiService_1 = class AccessGroupFromALSApiService extends access_group_service_1.AccessGroupService {
    constructor(apiUrl, responseProcessor, httpService) {
        super();
        this.apiUrl = apiUrl;
        this.responseProcessor = responseProcessor;
        this.httpService = httpService;
        this.logger = new common_2.Logger(AccessGroupFromALSApiService_1.name);
    }
    async getAccessGroups(userPayload) {
        var _a;
        if (((_a = userPayload.email) === null || _a === void 0 ? void 0 : _a.split("@")[1]) !== "lbl.gov") {
            return [];
        }
        const response = await this.callALSUserService(userPayload.email);
        const accessGroups = this.responseProcessor(response);
        return accessGroups;
    }
    async callALSUserService(userEmail) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${process.env.USER_SVC_API_URL}/${userEmail}/email?api_key=${process.env.USER_SVC_API_KEY}`, {
            headers: {
                "Content-Type": "application/json",
            },
        }).pipe((0, rxjs_1.catchError)((error) => {
            var _a;
            this.logger.error((_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
            return [];
        })));
        return response.data;
    }
};
AccessGroupFromALSApiService = AccessGroupFromALSApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, Function, axios_1.HttpService])
], AccessGroupFromALSApiService);
exports.AccessGroupFromALSApiService = AccessGroupFromALSApiService;
//# sourceMappingURL=access-group-from-ALS.service.js.map