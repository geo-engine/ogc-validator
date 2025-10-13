import * as core from '@actions/core';
import { waitForWebsite } from './wait.js';
import { exec, getExecOutput } from '@actions/exec';
import * as testResultsReporter from 'test-results-parser';
import * as fs from 'fs/promises';
import { getParams, printParams } from './params.js';

const WAIT_TIMEOUT: number = 300; // 5 minutes in seconds
const VALIDATOR_SERVER_URL = 'http://localhost:8080/teamengine';

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    const summaries = [];

    try {
        const params = getParams();
        printParams(params);

        core.info(`Waiting for ${params.serviceUrl} …`);
        await waitForWebsite(params.serviceUrl, WAIT_TIMEOUT);

        if (params.ogcApiProcesses) {
            core.startGroup('OGC API - Processes Validation');
            core.info('Validating OGC API - Processes …');
            summaries.push(
                await validateOGCAPIProcesses(
                    params.serviceUrl,
                    params.ogcApiProcesses.ogcApiProcessesVersion,
                    params.ogcApiProcesses.echoProcessId,
                    params.ogcApiProcesses.ogcApiProcessesIgnore
                )
            );
            core.endGroup();
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
    }

    core.summary
        .addHeading('OGC API - Validation Summary')
        .addTable([
            [
                { data: 'Test Suite', header: true },
                { data: 'Result', header: true },
                { data: 'Passed', header: true },
                { data: 'Skipped', header: true },
                { data: 'Failed', header: true },
                { data: '(Failed but ignored)', header: true },
                { data: 'Total', header: true },
            ],
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

async function validateOGCAPIProcesses(
    serviceUrl: string,
    ogcApiProcessesVersion: string,
    echoProcessId: string,
    ogcApiCoveragesIgnore: string[]
): Promise<TestSummary> {
    const validatorServerContainerId = (
        await getExecOutput(
            'podman',
            [
                'run',
                '--rm',
                '--detach',
                '--network',
                'host',
                `docker.io/ogccite/ets-ogcapi-processes10:${ogcApiProcessesVersion}`,
            ],
            {
                silent: true,
            }
        )
    ).stdout.trim();

    try {
        return await _validateOGCAPIProcesses(
            serviceUrl,
            echoProcessId,
            ogcApiCoveragesIgnore
        );
    } finally {
        // Stop the validator server
        await exec('podman', ['stop', validatorServerContainerId], {
            silent: true,
        });
        core.info('Stopped Team Engine validator server');
    }
}

export async function _validateOGCAPIProcesses(
    serviceUrl: string,
    echoProcessId: string,
    ogcApiCoveragesIgnore: string[]
): Promise<TestSummary> {
    core.info(`Waiting for Team Engine server …`);
    await waitForWebsite(VALIDATOR_SERVER_URL, WAIT_TIMEOUT);

    core.info(`Running tests …`);
    const url =
        `${VALIDATOR_SERVER_URL}/rest/suites/ogcapi-processes-1.0/run?` +
        new URLSearchParams({
            iut: serviceUrl,
            echoprocessid: echoProcessId,
        }).toString();
    core.notice(`Using test URL: ${url}`);
    const testRequest = new Request(url, {
        method: 'GET',
        headers: {
            Accept: 'application/xml', // delivers TestNG XML
            Authorization:
                'Basic ' + Buffer.from('ogctest:ogctest').toString('base64'),
        },
    });
    const testResult = await fetch(testRequest);

    if (!testResult.ok) {
        throw new Error(
            `Failed to run OGC API - Processes tests: ${testResult.status} ${testResult.statusText}`
        );
    }

    const testResultXml = await testResult.text();
    const results = await extractResults(testResultXml);

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
        }

        if (result.status === 'FAIL') {
            const isIgnored = ogcApiCoveragesIgnore.includes(result.name);
            const indicator = isIgnored ? 'IGNORED' : 'FAILED';
            ignored += isIgnored ? 1 : 0;
            core.error(`${message} (${indicator})`, {
                title: result.name,
            });
        }
    }

    const failedAndNotIgnored = failed - ignored;

    return {
        name: 'OGC API - Processes',
        success: failedAndNotIgnored === 0,
        passed,
        skipped,
        failed,
        ignored,
        total,
    };
}

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
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

async function extractResults(xml: string): Promise<Array<TestResult>> {
    const filePath = 'test-results.xml';
    await fs.writeFile(filePath, xml, {
        encoding: 'utf8',
    });

    const { result: testResults, errors } = testResultsReporter.parseV2({
        type: 'testng',
        files: [filePath],
        // files: ['test-results.fix.xml'],
    });
    if (errors.length) {
        throw new Error(`Failed to parse test results: ${errors.join('; ')}`);
    }

    const results = testResults.suites.flatMap((suite) =>
        suite.cases.map((testCase) => ({
            name: testCase.name,
            status: testCase.status.toUpperCase() as 'PASS' | 'FAIL' | 'SKIP',
            message: testCase.failure || undefined,
        }))
    );

    return results;
}
