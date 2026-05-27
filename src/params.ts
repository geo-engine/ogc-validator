import * as core from '@actions/core';

export interface Params {
    serviceUrl: string;
    teamenginePort: number;
    ogcApiCommon10?: OgcApiCommon10Params;
    ogcApiProcesses10?: OgcApiProcesses10Params;
    ogcApiFeatures10?: OgcApiFeatures10Params;
    ogcApiTiles10?: OgcApiTiles10Params;
}

const OGC_API_KEYS = {
    SERVICE_URL: 'service-url',
    TEAMENGINE_PORT: 'teamengine-port',
    // common 1.0
    COMMON: {
        FLAG: 'ogc-api-common',
        CONTAINER_TAG: 'ogc-api-common-container-tag',
        TESTS_TO_IGNORE: 'ogc-api-common-ignore',
    } as const,
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
    // tiles 1.0
    TILES: {
        FLAG: 'ogc-api-tiles',
        CONTAINER_TAG: 'ogc-api-tiles-container-tag',
        TESTS_TO_IGNORE: 'ogc-api-tiles-ignore',
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

    const ogcApiCommon10 = OgcApiCommon10Params.fromInput();
    const ogcApiProcesses10 = OgcApiProcesses10Params.fromInput();
    const ogcApiFeatures10 = OgcApiFeatures10Params.fromInput();
    const ogcApiTiles10 = OgcApiTiles10Params.fromInput();

    if (ogcApiCommon10) params.ogcApiCommon10 = ogcApiCommon10;
    if (ogcApiProcesses10) params.ogcApiProcesses10 = ogcApiProcesses10;
    if (ogcApiFeatures10) params.ogcApiFeatures10 = ogcApiFeatures10;
    if (ogcApiTiles10) params.ogcApiTiles10 = ogcApiTiles10;

    return params;
}

export function printParams(params: Params): void {
    core.info('Using parameters:');
    core.info(`- ${OGC_API_KEYS.SERVICE_URL}: ${params.serviceUrl}`);
    core.info(`- ${OGC_API_KEYS.TEAMENGINE_PORT}: ${params.teamenginePort}`);

    for (const apiParams of [
        ...(params.ogcApiCommon10?.printParams() ?? []),
        ...(params.ogcApiProcesses10?.printParams() ?? []),
        ...(params.ogcApiFeatures10?.printParams() ?? []),
        ...(params.ogcApiTiles10?.printParams() ?? []),
    ]) {
        core.info(`- ${apiParams.key}: ${apiParams.value}`);
    }
}

export abstract class OgcApiParams {
    static fromInput(): OgcApiParams | undefined {
        throw new Error('Not implemented');
    }

    abstract printParams(): Array<PrintParam>;
}

export class OgcApiCommon10Params extends OgcApiParams {
    containerTag: string;
    testsToIgnore: string[];

    constructor(containerTag: string, testsToIgnore: string[]) {
        super();
        this.containerTag = containerTag;
        this.testsToIgnore = testsToIgnore;
    }

    static override fromInput(): OgcApiCommon10Params | undefined {
        if (!core.getBooleanInput(OGC_API_KEYS.COMMON.FLAG)) return undefined;

        const containerTag: string = core.getInput(
            OGC_API_KEYS.COMMON.CONTAINER_TAG
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_KEYS.COMMON.TESTS_TO_IGNORE,
            { trimWhitespace: true }
        );
        return new OgcApiCommon10Params(containerTag, testsToIgnore);
    }

    override printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.COMMON.CONTAINER_TAG,
                value: this.containerTag,
            },
            {
                key: OGC_API_KEYS.COMMON.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }
}

interface PrintParam {
    key: string;
    value: string;
}

export class OgcApiProcesses10Params extends OgcApiParams {
    containerTag: string;
    echoProcessId: string;
    testsToIgnore: string[];

    constructor(
        containerTag: string,
        echoProcessId: string,
        testsToIgnore: string[]
    ) {
        super();
        this.containerTag = containerTag;
        this.echoProcessId = echoProcessId;
        this.testsToIgnore = testsToIgnore;
    }

    static override fromInput(): OgcApiProcesses10Params | undefined {
        if (!core.getBooleanInput(OGC_API_KEYS.PROCESSES.FLAG))
            return undefined;

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

        return new OgcApiProcesses10Params(
            containerTag,
            echoProcessId,
            testsToIgnore
        );
    }

    override printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.PROCESSES.CONTAINER_TAG,
                value: this.containerTag,
            },
            {
                key: OGC_API_KEYS.PROCESSES.ECHOPROCESSID,
                value: this.echoProcessId,
            },
            {
                key: OGC_API_KEYS.PROCESSES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }
}

export class OgcApiFeatures10Params extends OgcApiParams {
    containerTag: string;
    testsToIgnore: string[];

    constructor(containerTag: string, testsToIgnore: string[]) {
        super();
        this.containerTag = containerTag;
        this.testsToIgnore = testsToIgnore;
    }

    static override fromInput(): OgcApiFeatures10Params | undefined {
        if (!core.getBooleanInput(OGC_API_KEYS.FEATURES.FLAG)) return undefined;

        const containerTag: string = core.getInput(
            OGC_API_KEYS.FEATURES.CONTAINER_TAG
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE,
            { trimWhitespace: true }
        );

        return new OgcApiFeatures10Params(containerTag, testsToIgnore);
    }

    override printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.FEATURES.CONTAINER_TAG,
                value: this.containerTag,
            },
            {
                key: OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }
}

export class OgcApiTiles10Params extends OgcApiParams {
    containerTag: string;
    testsToIgnore: string[];

    constructor(containerTag: string, testsToIgnore: string[]) {
        super();
        this.containerTag = containerTag;
        this.testsToIgnore = testsToIgnore;
    }

    static override fromInput(): OgcApiTiles10Params | undefined {
        if (!core.getBooleanInput(OGC_API_KEYS.TILES.FLAG)) return undefined;

        const containerTag: string = core.getInput(
            OGC_API_KEYS.TILES.CONTAINER_TAG
        );
        const testsToIgnore: string[] = core.getMultilineInput(
            OGC_API_KEYS.TILES.TESTS_TO_IGNORE,
            { trimWhitespace: true }
        );

        return new OgcApiTiles10Params(containerTag, testsToIgnore);
    }

    override printParams(): Array<PrintParam> {
        return [
            {
                key: OGC_API_KEYS.TILES.CONTAINER_TAG,
                value: this.containerTag,
            },
            {
                key: OGC_API_KEYS.TILES.TESTS_TO_IGNORE,
                value: this.testsToIgnore.join(', ') || '(none)',
            },
        ];
    }
}
