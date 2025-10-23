import * as core from '@actions/core';

export interface Params {
    serviceUrl: string;
    teamenginePort: number;
    ogcApiProcesses10?: OgcApiProcesses10Params;
    ogcApiFeatures10?: OgcApiFeatures10Params;
}

export interface OgcApiProcesses10Params {
    containerTag: string;
    echoProcessId: string;
    testsToIgnore: string[];
}

export interface OgcApiFeatures10Params {
    containerTag: string;
    testsToIgnore: string[];
}

const OGC_API_KEYS = {
    SERVICE_URL: 'service-url',
    TEAMENGINE_PORT: 'teamengine-port',
    // processes 1.0
    PROCESSES: {
        FLAG: 'ogc-api-processes',
        CONTAINER_TAG: 'ogc-api-processes-container-tag',
        ECHOPROCESSID: 'echoprocessid',
        TESTS_TO_IGNORE: 'ogc-api-processes-ignore',
    } as const,
    // features 1.0
    FEATURES: {
        FLAG: 'ogc-api-features',
        CONTAINER_TAG: 'ogc-api-features-container-tag',
        TESTS_TO_IGNORE: 'ogc-api-features-ignore',
    } as const,
} as const;

export function getParams(): Params {
    const serviceUrl: string = core.getInput(OGC_API_KEYS.SERVICE_URL, {
        required: true,
        trimWhitespace: true,
    });
    // const teamenginePort: number = parseInt(
    //     core.getInput(OGC_API_KEYS.TEAMENGINE_PORT, {
    //         trimWhitespace: true,
    //     }),
    //     10
    // );
    const teamenginePort: number = 8080; // default port

    const params: Params = { serviceUrl, teamenginePort };

    if (core.getBooleanInput(OGC_API_KEYS.PROCESSES.FLAG)) {
        const containerTag: string = core.getInput(
            OGC_API_KEYS.PROCESSES.CONTAINER_TAG
        );
        const echoProcessId: string = core.getInput(
            OGC_API_KEYS.PROCESSES.ECHOPROCESSID
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_KEYS.PROCESSES.TESTS_TO_IGNORE,
            { trimWhitespace: true }
        );
        params.ogcApiProcesses10 = {
            containerTag,
            echoProcessId,
            testsToIgnore,
        };
    }

    if (core.getBooleanInput(OGC_API_KEYS.FEATURES.FLAG)) {
        const containerTag: string = core.getInput(
            OGC_API_KEYS.FEATURES.CONTAINER_TAG
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE,
            { trimWhitespace: true }
        );
        params.ogcApiFeatures10 = {
            containerTag,
            testsToIgnore,
        };
    }

    return params;
}

export function printParams(params: Params): void {
    core.info('Using parameters:');
    core.info(`- ${OGC_API_KEYS.SERVICE_URL}: ${params.serviceUrl}`);
    core.info(`- ${OGC_API_KEYS.TEAMENGINE_PORT}: ${params.teamenginePort}`);

    if (params.ogcApiProcesses10) {
        core.info(
            `- ${OGC_API_KEYS.PROCESSES.CONTAINER_TAG}: ${params.ogcApiProcesses10.containerTag}`
        );
        core.info(
            `- ${OGC_API_KEYS.PROCESSES.ECHOPROCESSID}: ${params.ogcApiProcesses10.echoProcessId}`
        );
        core.info(
            `- ${OGC_API_KEYS.PROCESSES.TESTS_TO_IGNORE}: ${
                params.ogcApiProcesses10.testsToIgnore.join(', ') || '(none)'
            }`
        );
    }

    if (params.ogcApiFeatures10) {
        core.info(
            `- ${OGC_API_KEYS.FEATURES.CONTAINER_TAG}: ${params.ogcApiFeatures10.containerTag}`
        );
        core.info(
            `- ${OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE}: ${
                params.ogcApiFeatures10.testsToIgnore.join(', ') || '(none)'
            }`
        );
    }
}
