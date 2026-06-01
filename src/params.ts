import * as core from '@actions/core';
import {
    OgcApiFeatures10Service,
    OgcApiProcesses10Service,
    OgcApiServiceConfig,
    OgcApiTiles10Service,
} from './services.js';

export interface Params {
    serviceUrl: string;
    teamenginePort: number;
    teamengineImage: string;
    services: Array<OgcApiServiceConfig>;
}

export const OGC_API_KEYS = {
    SERVICE_URL: 'service-url',
    TEAMENGINE_IMAGE: 'teamengine-image',
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
    // tiles 1.0
    TILES: {
        FLAG: 'ogc-api-tiles',
        CONTAINER_TAG: 'ogc-api-tiles-container-tag',
        TILE_MATRIX_SET_DEFINITION_URL:
            'ogc-api-tiles-tilematrixsetdefinitionurl',
        URL_TEMPLATE_FOR_TILES: 'ogc-api-tiles-urltemplatefortiles',
        TILE_MATRIX: 'ogc-api-tiles-tilematrix',
        MIN_TILE_ROW: 'ogc-api-tiles-mintilerow',
        MAX_TILE_ROW: 'ogc-api-tiles-maxtilerow',
        MIN_TILE_COL: 'ogc-api-tiles-mintilecol',
        MAX_TILE_COL: 'ogc-api-tiles-maxtilecol',
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
    const teamengineImage: string = core.getInput(
        OGC_API_KEYS.TEAMENGINE_IMAGE,
        {
            required: true,
            trimWhitespace: true,
        }
    );

    const params: Params = {
        serviceUrl,
        teamenginePort,
        teamengineImage,
        services: [],
    };

    if (core.getBooleanInput(OGC_API_KEYS.PROCESSES.FLAG)) {
        params.services.push(
            new OgcApiProcesses10Service(
                core.getInput(OGC_API_KEYS.PROCESSES.ECHOPROCESSID),
                core.getMultilineInput(OGC_API_KEYS.PROCESSES.TESTS_TO_IGNORE, {
                    trimWhitespace: true,
                })
            )
        );
    }

    if (core.getBooleanInput(OGC_API_KEYS.FEATURES.FLAG)) {
        params.services.push(
            new OgcApiFeatures10Service(
                core.getMultilineInput(OGC_API_KEYS.FEATURES.TESTS_TO_IGNORE, {
                    trimWhitespace: true,
                })
            )
        );
    }

    if (core.getBooleanInput(OGC_API_KEYS.TILES.FLAG)) {
        params.services.push(
            new OgcApiTiles10Service(
                core.getMultilineInput(OGC_API_KEYS.TILES.TESTS_TO_IGNORE, {
                    trimWhitespace: true,
                }),
                core.getInput(
                    OGC_API_KEYS.TILES.TILE_MATRIX_SET_DEFINITION_URL,
                    {
                        trimWhitespace: true,
                    }
                ),
                core.getInput(OGC_API_KEYS.TILES.URL_TEMPLATE_FOR_TILES, {
                    trimWhitespace: true,
                }),
                getIntegerInput(OGC_API_KEYS.TILES.TILE_MATRIX),
                getIntegerInput(OGC_API_KEYS.TILES.MIN_TILE_ROW),
                getIntegerInput(OGC_API_KEYS.TILES.MAX_TILE_ROW),
                getIntegerInput(OGC_API_KEYS.TILES.MIN_TILE_COL),
                getIntegerInput(OGC_API_KEYS.TILES.MAX_TILE_COL)
            )
        );
    }

    return params;
}

export function printParams(params: Params): void {
    core.info('Using parameters:');
    core.info(`- ${OGC_API_KEYS.SERVICE_URL}: ${params.serviceUrl}`);
    core.info(`- ${OGC_API_KEYS.TEAMENGINE_PORT}: ${params.teamenginePort}`);

    for (const apiParams of params.services.flatMap((s) => s.printParams())) {
        core.info(`- ${apiParams.key}: ${apiParams.value}`);
    }
}

function getIntegerInput(key: string): number {
    const rawValue = core.getInput(key, {
        required: true,
        trimWhitespace: true,
    });
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value)) {
        throw new Error(`Input ${key} must be an integer, got '${rawValue}'.`);
    }

    return value;
}
