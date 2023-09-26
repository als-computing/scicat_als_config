# Introduction
This repository contains two override code for SciCat. These overrides are split into front end and backend. Both the frontend and backend project in scicat depend on certain customization occuring by overriding or adding certain files using volumne mounting with containers. This repo contains some of those files that are deployed at ALS. 

**Note**
At the time of writing, the SciCat backend v4 code is still in a repo called `scicat-backend-next`. It is anticipated that this will be renamed `backend` and the current `backend` repo will be renamed something like `backend-archived`. This readme uses `backend` to mean the newer v4 backend.

## Backend
The major purpose of these files is to integrate the the v4 version of the Scicat Backend with ALS Hub in order to obtain the user's group information. To date, this project is called "Scicat Backend Next" (based on Nest.js) but at a future time will be renamed by the SciCat team as "backend". The code here is not compatibhle with the old Scicat v3 backend (based on Loopback).

### Get user data from ALSHub 
Source code here is provided to communicate to ALSHub to get the logged-in user's group membership and apply it the scicat database. This talks to the splash_userservice, which in turn talks to the ALSHub.

#### Configuration
In order to apply this code, two files need to be added to the build time components of the SciCatbackend. Because the source is Typescript that must be transpiled into Javascript, the source and dist versions are provided. The source (*.ts) can be applied to a developement environment. The dist (*.js) can be applied to a prebuilt backend package, such as a container. In either case the files need to be added to the file tree.

Since docker-compose.yml files are a super popular way to distribute, here are examples of such a volume mounting. These assumes a directory atructure:

```
.
 - backend
 - frontend
 - scicat_als_config
 docker-compose.yml
```

For a development container, you would map files into the backend service like:

```yaml
    volumes:
      - ./scicat-backend-next:/home/node/app
      - /home/node/app/node_modules
      - /home/node/app/dist
      - ./scicat_als_config/frontend/dev-config.json:/home/node/app/dist/src/config/frontend.config.json
      - ./scicat_als_config/backend/src/auth/strategies/oidc.strategy.ts:/home/node/app/src/auth/strategies/oidc.strategy.ts
```

While for a runtime container, it would look like the following. Note the critical differences are `src` to `dist` and `.ts` to `js`.

```yaml
    volumes:
      - ./scicat_als_config/frontend/prod-config.json:/home/node/app/dist/src/config/frontend.config.json
      - ./scicat_als_config/backend/dist/src/auth/strategies/oidc.strategy.ts:/home/node/app/dist/src/auth/strategies/oidc.strategy.js
```