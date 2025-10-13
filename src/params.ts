import * as core from '@actions/core';

interface Params {
    serviceUrl: string;
    ogcApiProcesses?: OgcApiProcessesParams;
}

interface OgcApiProcessesParams {
    ogcApiProcessesVersion: string;
    echoProcessId: string;
    ogcApiProcessesIgnore: string[];
}

export function getParams(): Params {
    const serviceUrl: string = core.getInput('service-url', {
        required: true,
        trimWhitespace: true,
    });

    const params: Params = { serviceUrl };

    if (core.getBooleanInput('ogc-api-processes')) {
        const ogcApiProcessesVersion: string = core.getInput(
            'ogc-api-processes-version'
        );
        const echoProcessId: string = core.getInput('echoprocessid');
        const ogcApiProcessesIgnore: string[] = core.getMultilineInput(
            'ogc-api-processes-ignore',
            { trimWhitespace: true }
        );
        params.ogcApiProcesses = {
            ogcApiProcessesVersion,
            echoProcessId,
            ogcApiProcessesIgnore,
        };
    }

    return params;
}

export function printParams(params: Params): void {
    core.info('Using parameters:');
    core.info(`- service-url: ${params.serviceUrl}`);
    if (params.ogcApiProcesses) {
        core.info(
            `- ogc-api-processes-version: ${params.ogcApiProcesses.ogcApiProcessesVersion}`
        );
        core.info(`- echoprocessid: ${params.ogcApiProcesses.echoProcessId}`);
        core.info(
            `- ogc-api-processes-ignore: ${
                params.ogcApiProcesses.ogcApiProcessesIgnore.join(', ') ||
                '(none)'
            }`
        );
    }
}
