"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessGroupServiceFactory = void 0;
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const access_group_from_multiple_providers_service_1 = require("./access-group-from-multiple-providers.service");
const access_group_from_ALS_service_1 = require("./access-group-from-ALS.service");
const access_group_from_static_values_service_1 = require("./access-group-from-static-values.service");
const access_group_service_1 = require("./access-group.service");
exports.accessGroupServiceFactory = {
    provide: access_group_service_1.AccessGroupService,
    useFactory: (configService) => {
        return getALSAccessGroupService(configService);
    },
    inject: [config_1.ConfigService],
};
function getALSAccessGroupService(configService) {
    const accessGroupsStaticValues = configService.get("accessGroupsStaticValues");
    const fromApi = getAccessGroupFromALSApiService(configService);
    const fromStatic = new access_group_from_static_values_service_1.AccessGroupFromStaticValuesService(accessGroupsStaticValues);
    const fromMultiple = new access_group_from_multiple_providers_service_1.AccessGroupFromMultipleProvidersService([
        fromApi,
        fromStatic,
    ]);
    return fromMultiple;
}
function getAccessGroupFromALSApiService(configService) {
    const url = configService.get("accessGroupService.apiUrl");
    const token = configService.get("accessGroupService.token");
    if (!url)
        throw new Error("No url for accessGroupService");
    if (!token)
        throw new Error("No token for accessGroupService");
    const responseProcessor = (response) => {
        const groups = response.groups;
        if (!groups)
            return [];
        return groups;
    };
    return new access_group_from_ALS_service_1.AccessGroupFromALSApiService(url, responseProcessor, new axios_1.HttpService());
}
//# sourceMappingURL=access-group-service-factory.js.map