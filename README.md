pulumi-docker-test
==================

Test case for # . 

Demonstrating an issue with docker.Provider caching DOCKER_HOST environment variable, preventing different users/systems from modifying pulumi stack resources when their docker daemon configurations are different. For example, when using a CI pipeline (DOCKER_HOST=tcp://localhost:2376) to build the initial stack and then trying to update the stack from a local machine (DOCKER_HOST=unix:///$HOME/.docker/run/docker.sock).

> NOTE: real-world use case has many other AWS resource controlled in the stack and the local docker daemon is only used to pull from a private repository and push to a different private repository.

## Pre-requisites

1. [Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Docker](https://docs.docker.com/get-docker/) running on local system
3. [node.js](https://nodejs.org/en/download/) installed on local system
4. node.js dependencies: `npm install`
5. Environment variables setup for private registry authentication

```bash
export REGISTRY_AUTH_ADDRESS=YOUR_PRIVATE_REGISTRY_ADDR // e.g. 00000000000.dkr.ecr.us-east-1.amazonaws.com
export REGISTRY_AUTH_USERNAME=YOUR_PRIVATE_REGISTRY_USERNAME // e.g. AWS
export REGISTRY_AUTH_PASSWORD=YOUR_PRIVATE_REGISTRY_PASSWORD // e.g. eyJwYXlsb2FkI...
export CONTAINER_NAME=YOUR_PRIVATE_REGISTRY_CONTAINER_IMAGE_NAME // e.g. ubuntu:latest
```

## Running the test

The following assumes this test is running on a macOS system with the default docker daemon configuration (unix:///$HOME/.docker/run/docker.sock). Your docker daemon setup may differ.

1. Create additional tcp lister for docker daemon

    This is necessary to test the issue on a single workstation. The real use case is when the intitial build is run in a CI pipeline with a different docker damone configuration for example.

    ```bash
    brew install socat
    socat -v TCP-LISTEN:2376,reuseaddr,fork,bind=127.0.0.1 UNIX-CLIENT:$HOME/.docker/run/docker.sock
    ```

2. Create the pulumi stack with DOCKER_HOST set to the non-default value (tcp://localhost:2376)

    ```bash
    $ export DOCKER_HOST=tcp://localhost:2376
    $ npm run up

    > pulumi-docker-test@1.0.0 up
    > ts-node ./index.ts

    successfully initialized stack
    ...
    update summary: 
    {
        "create": 3
    }
    ```

3. Attempt to update the pulumi stack with **DOCKER_HOST unset** to use system default. Observe the error.

    Stop the socat listener so pulumi docker cannot communicate if tcp://localhost:2376 is used.

    ```bash
    $ unset DOCKER_HOST
    $ npm run up

    ...
        Diagnostics:
        docker:index:RemoteImage (docker-container-pull):
            error: Docker native provider returned an unexpected error from Configure: failed to connect to any docker daemon
    ```

4. Attempt to update the pulumi stack with **DOCKER_HOST set to the default value (unix:///$HOME/.docker/run/docker.sock)**. Observe the error.

    ```bash
    $ export DOCKER_HOST=unix:///$HOME/.docker/run/docker.sock
    $ npm run up

    ...
        Diagnostics:
        docker:index:RemoteImage (docker-container-pull):
            error: Docker native provider returned an unexpected error from Configure: failed to connect to any docker daemon
    ```