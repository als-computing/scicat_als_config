import { AccessGroupService as AccessGroupService } from "./access-group.service";
import { ALSGroupsResponseType } from "./access-group-service-factory";
import { Injectable } from "@nestjs/common";
import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { UserPayload } from "../interfaces/userPayload.interface";
import { HttpService } from "@nestjs/axios";
import { catchError, firstValueFrom } from "rxjs";

/**
 * This service is used to fetch access groups from the ALS User Service
 */
@Injectable()
export class AccessGroupFromALSApiService extends AccessGroupService {
  private readonly logger = new Logger(AccessGroupFromALSApiService.name);
  constructor(
    private apiUrl: string,
    private responseProcessor: (response: ALSGroupsResponseType) => string[],
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async getAccessGroups(
    userPayload: UserPayload,
  ): Promise<string[]> {
    if (userPayload.email?.split("@")[1] !== "lbl.gov"){
      return [];
    }
    
    const response = await this.callALSUserService(userPayload.email);
    const accessGroups = this.responseProcessor(response);

    return accessGroups;
    return [];
  }

  async callALSUserService(userEmail: string): Promise<ALSGroupsResponseType>{
    const response = await firstValueFrom(
      this.httpService.get(
        `${process.env.USER_SVC_API_URL}/${userEmail}/email?api_key=${process.env.USER_SVC_API_KEY}`,

        {
          headers: {
            "Content-Type": "application/json",
            // ...this.headers,
          },
        },
      ).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data);
          return [];
        }),
      ),
    );
    return response.data;
  }
}
