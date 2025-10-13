import * as testResultsReporter from 'test-results-parser';

const { result: testResults, errors } = testResultsReporter.parseV2({
    type: 'testng',
    files: ['test-results.xml'],
});

console.log(testResults);

if (errors.length) {
    throw new Error(`Failed to parse test results: ${errors.join('; ')}`);
}
