# OGC API Validator GitHub Action

<!-- [![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg) -->

This GitHub Action automates the process of validating an OGC API implementation
using the OGC CITE validator, e.g., OGC API Processes.

## Usage

### Inputs

| Name                        | Description                                                                      | Required | Default                    |
| --------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------------- |
| `service-url`               | URL of the OGC endpoint to validate                                              | `true`   | `http://localhost:8484/`   |
| `ogc-api-processes`         | If set, validate OGC API - Processes                                             | `false`  | `false`                    |
| `ogc-api-processes-version` | Version of OGC API - Processes to validate against                               | `false`  | `1.3-teamengine-6.0.0-RC2` |
| `echoprocessid`             | The process identifier to run for OGC API - Processes validation                 | `false`  | `echo`                     |
| `ogc-api-processes-ignore`  | Multi-line list of test identifiers to ignore for OGC API - Processes validation | `false`  | `''`                       |

## Testing with `@github/local-action`

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`fnm`](https://github.com/Schniz/fnm), this template has a `.node-version`
> file at the root of the repository that can be used to automatically switch to
> the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node`
> actions.

The [`@github/local-action`](https://github.com/github/local-action) utility
allows you to test your GitHub Action locally without needing to push changes to
a repository. This is useful for debugging and verifying functionality during
development.

1. :hammer_and_wrench: Install the dependencies

    ```bash
    npm install
    ```

1. Create an `.env` file in the root of your repository to define the necessary
   environment variables. Cf. [`.env.example`](./.env.example) for an example.

1. Test the action locally:

```bash
npx @github/local-action . src/main.ts .env
```

## Bundle and Test the Action

1. :building_construction: Package the TypeScript for distribution

    ```bash
    npm run bundle
    ```

1. :white_check_mark: Run the tests

    ```bash
    $ npm test

    PASS  ./index.test.js
      ✓ throws invalid number (3ms)
      ✓ wait 500 ms (504ms)
      ✓ test runs (95ms)

    ...
    ```

## Publishing a New Release

This project includes a helper script, [`script/release`](./script/release)
designed to streamline the process of tagging and pushing new releases for
GitHub Actions.

## Dependency License Management

Whenever you install or update dependencies, you can use the Licensed CLI to
update the licenses database. To install Licensed, see the project's
[Readme](https://github.com/licensee/licensed?tab=readme-ov-file#installation).

To update the cached licenses, run the following command:

```bash
licensed cache
```

To check the status of cached licenses, run the following command:

```bash
licensed status
```
