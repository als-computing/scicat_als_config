import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AccessGroupFromGraphQLApiService } from "./access-group-from-graphql-api-call.service";
import { AccessGroupFromMultipleProvidersService } from "./access-group-from-multiple-providers.service";
//import { AccessGroupFromPayloadService } from "./access-group-from-payload.service";
import {AccessGroupFromALSApiService} from "./access-group-from-ALS.service";
import { AccessGroupFromStaticValuesService } from "./access-group-from-static-values.service";
import { AccessGroupService } from "./access-group.service";

/*
 * this is the default function which provides an empty array as groups
 */
export const accessGroupServiceFactory = {
  provide: AccessGroupService,
  useFactory: (configService: ConfigService) => {
    return getALSAccessGroupService(configService);
  },
  inject: [ConfigService],
};


function getALSAccessGroupService(configService: ConfigService){
  const accessGroupsStaticValues = configService.get(
    "accessGroupsStaticValues",
  );

  const fromApi = getAccessGroupFromALSApiService(configService);
  const fromStatic = new AccessGroupFromStaticValuesService(
    accessGroupsStaticValues,
  );

  const fromMultiple = new AccessGroupFromMultipleProvidersService([
    fromApi,
    fromStatic,
  ]);

  return fromMultiple;
}

export type ALSGroupsResponseType = {
  groups: string[]
};


function getAccessGroupFromALSApiService(configService: ConfigService) {
  const url = configService.get<string>("accessGroupService.apiUrl");
  const token = configService.get<string>("accessGroupService.token");

  if (!url) throw new Error("No url for accessGroupService");
  if (!token) throw new Error("No token for accessGroupService");

  const responseProcessor = (response: ALSGroupsResponseType) => {
    const groups = (response as ALSGroupsResponseType).groups;
    if (!groups) return [];
    return groups;
  };

  return new AccessGroupFromALSApiService(
    url,
    responseProcessor,
    new HttpService(),
  );
}