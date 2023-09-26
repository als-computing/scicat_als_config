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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OidcStrategy = exports.BuildOpenIdClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const users_service_1 = require("../../users/users.service");
const openid_client_1 = require("openid-client");
const auth_service_1 = require("../auth.service");
const access_group_service_1 = require("../access-group-provider/access-group.service");
class BuildOpenIdClient {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    async build() {
        const oidcConfig = this.configService.get("oidc");
        const trustIssuer = await openid_client_1.Issuer.discover(`${oidcConfig?.issuer}/.well-known/openid-configuration`);
        const client = new trustIssuer.Client({
            client_id: oidcConfig?.clientID,
            client_secret: oidcConfig?.clientSecret,
        });
        return client;
    }
}
exports.BuildOpenIdClient = BuildOpenIdClient;
let OidcStrategy = class OidcStrategy extends (0, passport_1.PassportStrategy)(openid_client_1.Strategy, "oidc") {
    authService;
    configService;
    usersService;
    accessGroupService;
    client;
    authStrategy = "oidc";
    constructor(authService, client, configService, usersService, accessGroupService) {
        const oidcConfig = configService.get("oidc");
        super({
            client: client,
            params: {
                redirect_uri: oidcConfig?.callbackURL,
                scope: oidcConfig?.scope,
            },
            passReqToCallback: false,
            usePKCE: false,
        });
        this.authService = authService;
        this.configService = configService;
        this.usersService = usersService;
        this.accessGroupService = accessGroupService;
        this.client = client;
    }
    async validate(tokenset) {
        const userinfo = await this.client.userinfo(tokenset);
        const oidcConfig = this.configService.get("oidc");
        const userProfile = this.parseUserInfo(userinfo);
        const userPayload = {
            userId: userProfile.id,
            username: userProfile.username,
            email: userProfile.email,
            accessGroupProperty: oidcConfig?.accessGroupProperty,
            payload: userinfo,
        };
        userProfile.accessGroups =
            await this.accessGroupService.getAccessGroups(userPayload);
        const userFilter = {
            $or: [
                { username: `oidc.${userProfile.username}` },
                { email: userProfile.email },
            ],
        };
        let user = await this.usersService.findOne(userFilter);
        if (!user) {
            const createUser = {
                username: userProfile.username,
                email: userProfile.email,
                authStrategy: "oidc",
            };
            const newUser = await this.usersService.create(createUser);
            if (!newUser) {
                throw new common_1.InternalServerErrorException("Could not create User from OIDC response.");
            }
            common_1.Logger.log("Created oidc user ", newUser.username);
            const createUserIdentity = {
                authStrategy: "oidc",
                credentials: {},
                externalId: userProfile.id,
                profile: userProfile,
                provider: "oidc",
                userId: newUser._id,
            };
            await this.usersService.createUserIdentity(createUserIdentity);
            common_1.Logger.log("Created user identity for oidc user with id ", newUser._id);
            user = newUser;
        }
        else {
            await this.usersService.updateUserIdentity({
                profile: userProfile,
            }, user._id);
        }
        const jsonUser = JSON.parse(JSON.stringify(user));
        const { password, ...returnUser } = jsonUser;
        returnUser.userId = returnUser._id;
        return returnUser;
    }
    getUserPhoto(userinfo) {
        return userinfo.thumbnailPhoto
            ? "data:image/jpeg;base64," +
                Buffer.from(userinfo.thumbnailPhoto, "binary").toString("base64")
            : "no photo";
    }
    parseUserInfo(userinfo) {
        const profile = {};
        const userId = userinfo.sub || userinfo.user_id;
        if (!userId) {
            throw new Error("Could not find sub or user_id in userinfo response");
        }
        profile.id = userId;
        profile.username = userinfo.preferred_username ?? userinfo.name ?? "";
        profile.displayName = userinfo.name ?? "";
        profile.emails = userinfo.email ? [{ value: userinfo.email }] : [];
        profile.email = userinfo.email ?? "";
        profile.thumbnailPhoto = this.getUserPhoto(userinfo);
        return profile;
    }
};
OidcStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService, Object, config_1.ConfigService,
        users_service_1.UsersService,
        access_group_service_1.AccessGroupService])
], OidcStrategy);
exports.OidcStrategy = OidcStrategy;
//# sourceMappingURL=oidc.strategy.js.map