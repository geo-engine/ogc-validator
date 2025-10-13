/**
 * Waits for a number of milliseconds.
 *
 * @param milliseconds The number of milliseconds to wait.
 * @returns Resolves with 'done!' after the wait is over.
 */
export async function wait(milliseconds: number): Promise<string> {
    return new Promise((resolve) => {
        if (isNaN(milliseconds))
            throw new Error('milliseconds is not a number');

        setTimeout(() => resolve('done!'), milliseconds);
    });
}

/**
 * Waits for a website to be available, retrying every second for a specified number of seconds.
 *
 * @param url The URL of the website to check.
 * @param timeoutInSeconds The maximum time to wait for the website to be available, in seconds.
 * @returns Resolves if the website becomes available, or rejects if the timeout is exceeded.
 */
export async function waitForWebsite(
    url: string,
    timeoutInSeconds: number
): Promise<void> {
    const checkWebsite = async (): Promise<boolean> => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    };

    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(
                new Error(
                    `Website ${url} did not become available within ${timeoutInSeconds} seconds`
                )
            );
        }, timeoutInSeconds * 1000);

        const interval = setInterval(async () => {
            if (await checkWebsite()) {
                clearTimeout(timeout);
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    });
}
