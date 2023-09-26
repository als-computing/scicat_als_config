import { HttpService } from "@nestjs/axios";
import { AxiosError } from 'axios';
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { FilterQuery } from "mongoose";
import { CreateUserIdentityDto } from "src/users/dto/create-user-identity.dto";
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { User, UserDocument } from "src/users/schemas/user.schema";
import { UsersService } from "src/users/users.service";
import {
  Strategy,
  Client,
  UserinfoResponse,
  TokenSet,
  Issuer,
} from "openid-client";
import { AuthService } from "../auth.service";
import { Profile } from "passport";
import { UserProfile } from "src/users/schemas/user-profile.schema";
import { OidcConfig } from "src/config/configuration";
import { AccessGroupService } from "../access-group-provider/access-group.service";
import { UserPayload } from "../interfaces/userPayload.interface";
import { catchError, firstValueFrom } from "rxjs";

/** Creates an openid client that knows fetches published information from the service */
export class BuildOpenIdClient {
  constructor(private configService: ConfigService) {}
  async build() {
    const oidcConfig = this.configService.get<OidcConfig>("oidc");
    const trustIssuer = await Issuer.discover(
      `${oidcConfig?.issuer}/.well-known/openid-configuration`,
    );
    const client = new trustIssuer.Client({
      client_id: oidcConfig?.clientID as string,
      client_secret: oidcConfig?.clientSecret as string,
    });
    return client;
  }
}

type ALSHubProfile = {
  uid: string,
  authenticators?: string[],
  given_name: string,
  family_name: string,
  current_institution: string,
  current_email: string,
  orcid: string
  groups: string[]
};


/** Indented to override the stock OidcStrategy, accomplishing ALS-specific tasks like
 *  authenticating with ORCID (which the standard code does not do) and communicating wtiht eh ALS user service
 *  to get things like email and accessGroup information.
 */
@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  client: Client;
  authStrategy =   "oidc";
  alsUserService: ALSUserApiService;
  constructor(
    private readonly authService: AuthService,
    client: Client,
    private configService: ConfigService,
    private usersService: UsersService,
    private accessGroupService: AccessGroupService,
    
  ) {
    const oidcConfig = configService.get<OidcConfig>("oidc");
    super({
      client: client,
      params: {
        redirect_uri: oidcConfig?.callbackURL,
        scope: oidcConfig?.scope,
      },
      passReqToCallback: false,
      usePKCE: false,
      
    });
    this.alsUserService = new ALSUserApiService(new HttpService());
    this.client = client;
  }
 
  async validate(tokenset: TokenSet): Promise<Omit<User, "password">> {
    // userinfo contains data from orcid
    const userTokenInfo: UserinfoResponse = await this.client.userinfo(tokenset);
    const oidcConfig = this.configService.get<OidcConfig>("oidc");
    const alshubProfile = await this.alsUserService.getALSUesrInfo(userTokenInfo.sub as string);
    const userProfile = this.parseUserInfo(userTokenInfo, alshubProfile);
    const userFilter: FilterQuery<UserDocument> = {
      $or: [
        { username: `oidc.${userProfile.username}` },
        { email: userProfile.email as string },
      ],
    };
    let user = await this.usersService.findOne(userFilter);
    if (!user) {
      const createUser: CreateUserDto = {
        username: userProfile.username,
        email: userProfile.email as string,
        authStrategy: "oidc",
      };

      const newUser = await this.usersService.create(createUser);
      if (!newUser) {
        throw new InternalServerErrorException(
          "Could not create User from OIDC response.",
        );
      }
      Logger.log("Created oidc user ", newUser.username);

      const createUserIdentity: CreateUserIdentityDto = {
        authStrategy: "oidc",
        credentials: {},
        externalId: userProfile.id,
        profile: userProfile,
        provider: "oidc",
        userId: newUser._id,
      };

      await this.usersService.createUserIdentity(createUserIdentity);
      Logger.log("Created user identity for oidc user with id ", newUser._id);
      user = newUser;
    } else {
      await this.usersService.updateUserIdentity(
        {
          profile: userProfile,
        },
        user._id,
      );
    }

    const jsonUser = JSON.parse(JSON.stringify(user));
    const { password, ...returnUser } = jsonUser;
    returnUser.userId = returnUser._id;
    // Logger.log("returning user ", returnUser);
    return returnUser;
  }

  getUserPhoto(userinfo: UserinfoResponse) {
    return userinfo.thumbnailPhoto
      ? "data:image/jpeg;base64," +
          Buffer.from(userinfo.thumbnailPhoto as string, "binary").toString(
            "base64",
          )
      : "no photo";
  }

  parseUserInfo(userinfo: UserinfoResponse, alshubProfile: ALSHubProfile) {
    type OidcProfile = Profile & UserProfile;
    const profile = {} as OidcProfile;

    // Prior to OpenID Connect Basic Client Profile 1.0 - draft 22, the "sub"
    // claim was named "user_id".  Many providers still use the old name, so
    // fallback to that.
    const userId = userinfo.sub || (userinfo.user_id as string);
    if (!userId) {
      throw new Error("Could not find sub or user_id in userinfo response");
    }
    profile.id = userId;
    profile.username = alshubProfile.orcid;
    profile.displayName = `${alshubProfile.given_name} ${alshubProfile.family_name}`;
    profile.email = alshubProfile.current_email;
    profile.accessGroups = alshubProfile.groups;
    return profile;
  }
}

  @Injectable()
  export class ALSUserApiService {
    private readonly logger = new Logger(ALSUserApiService.name);
    constructor(
      private readonly httpService: HttpService,
    ) {
    }
    async getALSUesrInfo(orcid: string): Promise<ALSHubProfile>{
      const apiURL = `${process.env.USER_SVC_API_URL}/${orcid}/orcid?api_key=${process.env.USER_SVC_API_KEY}`
      Logger.log(`talking to ${apiURL}`)
      const response = await firstValueFrom(
        this.httpService.get(
          apiURL,
          {
            headers: {
              "Content-Type": "application/json",
              // ...this.headers,
            },
          },
        ).pipe(
          catchError((error: AxiosError) => {
            this.logger.log(`Could not get ALS information for orcid ${orcid} ${error.response?.data}`);
            return [];
          }),
        ),
      );
      return response.data;
    }
  }