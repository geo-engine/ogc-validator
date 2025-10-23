import * as core from '@actions/core';

interface Params {
    serviceUrl: string;
    ogcApiProcesses10?: OgcApiProcesses10Params;
}

interface OgcApiProcesses10Params {
    containerTag: string;
    echoProcessId: string;
    testsToIgnore: string[];
}

const OGC_API_PROCESSES_10_CONTAINER_TAG_PARAM =
    'ogc-api-processes-container-tag';
const OGC_API_PROCESSES_10_ECHOPROCESSID_PARAM = 'echoprocessid';
const OGC_API_PROCESSES_10_TESTS_TO_IGNORE_PARAM = 'ogc-api-processes-ignore';

export function getParams(): Params {
    const serviceUrl: string = core.getInput('service-url', {
        required: true,
        trimWhitespace: true,
    });

    const params: Params = { serviceUrl };

    if (core.getBooleanInput('ogc-api-processes')) {
        const containerTag: string = core.getInput(
            OGC_API_PROCESSES_10_CONTAINER_TAG_PARAM
        );
        const echoProcessId: string = core.getInput(
            OGC_API_PROCESSES_10_ECHOPROCESSID_PARAM
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_PROCESSES_10_TESTS_TO_IGNORE_PARAM,
            { trimWhitespace: true }
        );
        params.ogcApiProcesses10 = {
            containerTag,
            echoProcessId,
            testsToIgnore,
        };
    }

    return params;
}

export function printParams(params: Params): void {
    core.info('Using parameters:');
    core.info(`- service-url: ${params.serviceUrl}`);
    if (params.ogcApiProcesses10) {
        core.info(
            `- ${OGC_API_PROCESSES_10_CONTAINER_TAG_PARAM}: ${params.ogcApiProcesses10.containerTag}`
        );
        core.info(
            `- ${OGC_API_PROCESSES_10_ECHOPROCESSID_PARAM}: ${params.ogcApiProcesses10.echoProcessId}`
        );
        core.info(
            `- ${OGC_API_PROCESSES_10_TESTS_TO_IGNORE_PARAM}: ${
                params.ogcApiProcesses10.testsToIgnore.join(', ') || '(none)'
            }`
        );
    }
}
