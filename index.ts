const process = require('process');
import { InlineProgramArgs, LocalWorkspace, LocalWorkspaceOptions } from "@pulumi/pulumi/automation";
import * as docker from "@pulumi/docker";

const {
    REGISTRY_AUTH_USERNAME,
    REGISTRY_AUTH_PASSWORD,
    REGISTRY_AUTH_ADDRESS,
    CONTAINER_NAME,
    DESTROY = false
} = process.env;

process.env.PULUMI_CONFIG_PASSPHRASE = "pulumi-docker-test";

const run = async () => {
    const pulumiProgram = async () => {

        // Define the provider so we can use a private repository
        const provider = new docker.Provider(`docker-provider`, {
            registryAuth: [{
                username: REGISTRY_AUTH_USERNAME,
                password: REGISTRY_AUTH_PASSWORD,
                address: `https://${REGISTRY_AUTH_ADDRESS}`
            }]
        });

        const registryImage = docker.getRegistryImage({
            name: `${REGISTRY_AUTH_ADDRESS}/${CONTAINER_NAME}`
        }, { provider });

        new docker.RemoteImage(`docker-container-pull`, {
            name: registryImage.then(image => image.name),
            keepLocally: true,
            pullTriggers: [registryImage.then(image => image.sha256Digest)],
            platform: 'linux/amd64',
        }, { provider });
    }

    const workspaceArgs: LocalWorkspaceOptions = {
        projectSettings: {
            name: 'pulumi-docker-test',
            runtime: 'nodejs',
            backend: {
                url: 'file://./'
            }
        },
        workDir: process.cwd()
    };

    const programArgs: InlineProgramArgs = {
        stackName: "pulumi-docker-test",
        projectName: "inlineNode",
        program: pulumiProgram
    };

    const stack = await LocalWorkspace.createOrSelectStack(programArgs, workspaceArgs);
    console.info("successfully initialized stack");

    console.info("refreshing stack...");
    await stack.refresh({ onOutput: console.info });
    console.info("refresh complete");

    if (DESTROY) {
        console.info("destroying stack...");
        const destroyRes = await stack.destroy({ onOutput: console.info });
        console.log(`destroy summary: \n${JSON.stringify(destroyRes.summary.resourceChanges, null, 4)}`);
        return;
    } else {
        console.info("updating stack...");
        const upRes = await stack.up({ onOutput: console.info });
        console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`);
    }
}

run().catch(err => console.log(err));