import * as core from '@actions/core';
import { waitForWebsite } from './wait.js';
import { exec, getExecOutput } from '@actions/exec';
import { JPathOrMatcher, XMLParser } from 'fast-xml-parser';
import * as fs from 'fs/promises';
import { getParams, printParams } from './params.js';

const WAIT_TIMEOUT: number = 300; // 5 minutes in seconds

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    const summaries = [];
    let containerId: string | undefined;

    try {
        const params = getParams();
        printParams(params);

        const server_url = `http://localhost:${params.teamenginePort}`;
        const teamengine_url = `${server_url}/teamengine`;
        await assertServerIsNotResponding(server_url);

        // Dependencies
        await assertPodmanExists();

        core.info(`Waiting for ${params.serviceUrl} …`);
        await waitForWebsite(params.serviceUrl, WAIT_TIMEOUT);

        containerId = await startContainer(
            teamengine_url,
            params.teamengineImage
        );

        for (const serviceConfig of params.services) {
            const summary = await core.group(
                `Validating OGC API - ${serviceConfig.name}`,
                async () => {
                    core.info(`Validating OGC API - ${serviceConfig.name} …`);

                    return await validateOGCAPI({
                        testRequest: serviceConfig.request(
                            teamengine_url,
                            params.serviceUrl
                        ),
                        testsToIgnore: serviceConfig.testsToIgnore,
                        xmlFilePath: serviceConfig.xmlFilePath,
                    });
                }
            );
            summaries.push(summary);
        }

        if (!summaries.length) {
            core.warning(
                'No validations were selected. Please enable at least one validation option.'
            );
        }

        const hasFailures = summaries.some((s) => !s.success);
        if (hasFailures) {
            core.setFailed('One or more validations failed.');
        } else {
            core.info('All validations passed successfully.');
        }
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) core.setFailed(error.message);
    } finally {
        if (containerId) await stopContainer(containerId);
    }

    const tableHeaders = [
        'Test Suite',
        'Result',
        'Passed',
        'Skipped',
        'Failed',
        '(Failed but ignored)',
        'Total',
    ];

    printResults(summaries, tableHeaders);

    core.summary
        .addHeading('OGC API - Validation Summary')
        .addTable([
            tableHeaders.map((header) => ({ data: header, header: true })),
            ...summaries.map((s) => [
                s.name,
                s.success ? '✅ Success' : '❌ Failure',
                s.passed.toString(),
                s.skipped.toString(),
                s.failed.toString(),
                s.ignored.toString(),
                s.total.toString(),
            ]),
        ])
        .write();
}

/**
 * Checks if Podman is installed and available in the system.
 *
 * @throws Will throw an error if Podman is not found.
 */
async function assertPodmanExists(): Promise<void> {
    try {
        await exec('podman', ['--version'], { silent: true });
        core.info('Podman is installed and available.');
    } catch (_error) {
        throw new Error(
            'Podman is not installed or not available in the system PATH. Please install Podman to proceed.'
        );
    }
}

/**
 * Asserts that localhost:8080 is not responding.
 *
 * @throws Will throw an error if localhost:8080 is responding.
 */
async function assertServerIsNotResponding(serverUrl: string): Promise<void> {
    try {
        await fetch(serverUrl, {
            method: 'HEAD',
        });
        throw new Error(
            `Port ${new URL(serverUrl).port} on ${new URL(serverUrl).hostname} is already in use. Please free the port before running the action.`
        );
    } catch (_error) {
        core.info(
            `Port ${new URL(serverUrl).port} on ${new URL(serverUrl).hostname} is free to use.`
        );
    }
}

async function startContainer(
    teamengineUrl: string,
    containerName: string
): Promise<string> {
    const containerImage = `docker.io/ogccite/${containerName}`;
    const containerId = (
        await getExecOutput(
            'podman',
            ['run', '--rm', '--detach', '--network', 'host', containerImage],
            {
                silent: core.isDebug() ? false : true,
            }
        )
    ).stdout.trim();

    try {
        core.info(
            `Waiting for Team Engine server for image <${containerImage}> …`
        );
        await waitForWebsite(teamengineUrl, WAIT_TIMEOUT);

        return containerId;
    } catch (error) {
        throw new Error(
            `Failed to start Team Engine validator server with image <${containerImage}>: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

async function stopContainer(containerId: string) {
    await exec('podman', ['stop', containerId], {
        silent: true,
    });
    core.info('Stopped Team Engine validator server');
}

// async function run_with_container({
//     containerName,
//     containerTag,
//     teamengine_url,
//     validationFn,
// }: {
//     containerName: string;
//     containerTag: string;
//     teamengine_url: string;
//     validationFn: () => Promise<TestSummary>;
// }): Promise<TestSummary> {
//     const containerImage = `docker.io/ogccite/${containerName}:${containerTag}`;
//     const validatorServerContainerId = (
//         await getExecOutput(
//             'podman',
//             ['run', '--rm', '--detach', '--network', 'host', containerImage],
//             {
//                 silent: core.isDebug() ? false : true,
//             }
//         )
//     ).stdout.trim();

//     try {
//         core.info(
//             `Waiting for Team Engine server for image <${containerImage}> …`
//         );
//         await waitForWebsite(teamengine_url, WAIT_TIMEOUT);

//         return await validationFn();
//     } finally {
//         // Stop the validator server
//         await exec('podman', ['stop', validatorServerContainerId], {
//             silent: true,
//         });
//         core.info('Stopped Team Engine validator server');
//     }
// }

// export function validateOGCAPI({
//     testRequest,
//     testsToIgnore,
//     xmlFilePath,
// }: {
//     testRequest: Request;
//     testsToIgnore: string[];
//     xmlFilePath: string;
// }): () => Promise<TestSummary> {
//     return () =>
//         _validateOGCAPI({
//             testRequest,
//             testsToIgnore,
//             xmlFilePath,
//         });
// }

export async function validateOGCAPI({
    testRequest,
    testsToIgnore,
    xmlFilePath,
}: {
    testRequest: Request;
    testsToIgnore: string[];
    xmlFilePath: string;
}): Promise<TestSummary> {
    core.info(`Running tests using URL <${testRequest.url}> …`);
    const testResult = await fetch(testRequest);

    if (!testResult.ok) {
        throw new Error(
            `Failed to run OGC API tests: ${testResult.status} ${testResult.statusText}`
        );
    }

    const testResultXml = await testResult.text();
    if (core.isDebug()) {
        await fs.writeFile(xmlFilePath, testResultXml, { encoding: 'utf8' });
    }
    const { suite, results } = await extractResults(testResultXml);

    const total = results.length;
    const passed = results.filter((r) => r.status === 'PASS').length;
    const skipped = results.filter((r) => r.status === 'SKIP').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    let ignored = 0;

    for (const result of results) {
        if (result.status === 'PASS') continue;

        const message = result.message ?? 'No additional information provided.';

        if (result.status === 'SKIP') {
            core.warning(`${message} (SKIPPED)`, {
                title: result.name,
            });
            printAttributes(result.attributes);
        }

        if (result.status === 'FAIL') {
            const isIgnored = testsToIgnore.includes(result.name);
            const indicator = isIgnored ? 'IGNORED' : 'FAILED';
            ignored += isIgnored ? 1 : 0;
            core.error(`${message} (${indicator})`, {
                title: result.name,
            });
            printAttributes(result.attributes);
        }
    }

    const failedAndNotIgnored = failed - ignored;

    return {
        name: suite,
        success: failedAndNotIgnored === 0,
        passed,
        skipped,
        failed,
        ignored,
        total,
    };
}

function printAttributes(attributes?: Record<string, string>): void {
    if (!attributes) return;

    for (const [key, value] of Object.entries(attributes)) {
        core.notice(`  ${key}:\n${value}`);
    }
}

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    attributes?: Record<string, string>;
}

interface TestSummary {
    name: string;
    success: boolean;
    passed: number;
    skipped: number;
    failed: number;
    ignored: number;
    total: number;
}

interface TestNgSuite {
    test: Array<TestNgTest>;
}

interface TestNgTest {
    class: Array<TestNgClass>;
}

interface TestNgClass {
    'test-method': Array<TestNgTestMethod>;
}

interface TestNgTestMethod {
    name: string;
    status: string;
    'is-config'?: boolean;
    exception?: { message: string };
    attributes?: { attribute: Array<TestNgAttribute> };
}

interface TestNgAttribute {
    name: string;
    '#text': string;
}

interface ExtractionResult {
    suite: string;
    results: Array<TestResult>;
}

async function extractResults(xml: string): Promise<ExtractionResult> {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        isArray: (name: string, _jpath: JPathOrMatcher): boolean => {
            return [
                'suite',
                'test',
                'class',
                'test-method',
                'attribute',
            ].includes(name);
        },
    });
    const parsedXml = parser.parse(xml);

    if (!parsedXml || !parsedXml['testng-results']) {
        throw new Error('Invalid or missing test results in the XML.');
    }

    const testSuites: TestNgSuite[] = parsedXml['testng-results'].suite;

    const results: Array<TestResult> = [];

    for (const testMethod of testSuites.flatMap((suite) =>
        suite.test.flatMap((test) =>
            test['class'].flatMap((testClass) => testClass['test-method'])
        )
    )) {
        if (testMethod['is-config']) {
            continue;
        }

        results.push({
            name: testMethod.name,
            status: testMethod.status.toUpperCase() as 'PASS' | 'FAIL' | 'SKIP',
            message: testMethod.exception?.message,
            attributes: testMethod.attributes
                ? Object.fromEntries(
                      testMethod.attributes.attribute.map((attr) => [
                          attr.name,
                          attr['#text'],
                      ])
                  )
                : undefined,
        });
    }

    return {
        suite: parsedXml['testng-results'].suite[0].name,
        results,
    };
}

function printResults(
    summaries: Array<TestSummary>,
    tableHeader: string[]
): void {
    const tableRows = summaries.map((s) => [
        s.name,
        s.success ? '✅ Success' : '❌ Failure',
        s.passed.toString(),
        s.skipped.toString(),
        s.failed.toString(),
        s.ignored.toString(),
        s.total.toString(),
    ]);

    const columnWidths = tableHeader.map((_, colIndex) =>
        Math.max(
            tableHeader[colIndex].length,
            ...tableRows.map((row) => row[colIndex].length)
        )
    );

    const formatRow = (row: string[]) =>
        row
            .map((cell, colIndex) => cell.padEnd(columnWidths[colIndex], ' '))
            .join(' | ');

    const separator = columnWidths
        .map((width) => '-'.repeat(width))
        .join('-|-');

    console.info('\n' + formatRow(tableHeader));
    console.info(separator);
    tableRows.forEach((row) => console.info(formatRow(row)));
}
