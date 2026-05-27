# OGC API Validator GitHub Action

[![CI](https://github.com/geo-engine/ogc-validator/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/geo-engine/ogc-validator/actions/workflows/ci.yml?branch=main)

This GitHub Action automates the process of validating an OGC API implementation
using the OGC CITE validator, e.g., OGC API Processes.

## Usage

```yaml
steps:
    - uses: geo-engine/ogc-validator@v1
      with:
          service-url: https://example.com
          ogc-api-processes: true
          ogc-api-processes-container-tag: 1.3-teamengine-6.0.0-RC2
          echoprocessid: echo
          ogc-api-processes-ignore: |-
              foobar
```

> [!NOTE]
>
> TeamEngine is run using Podman inside the action and uses port `8080`. Ensure
> that the GitHub Actions runner has Podman installed and configured correctly.
> Moreover, the action assumes that the TeamEngine container can bind to port
> `8080`. If this port is already in use on the runner, the action will fail.
> You may need to stop other services or containers that are using this port.

### Inputs

| Name                              | Description                                                                      | Required | Default                      |
| --------------------------------- | -------------------------------------------------------------------------------- | -------- | ---------------------------- |
| `service-url`                     | URL of the OGC endpoint to validate                                              | `true`   | `http://localhost:8484/`     |
| `ogc-api-common`                  | If set, validate OGC API - Common                                                | `false`  | `false`                      |
| `ogc-api-common-container-tag`    | Container tag to use for OGC API - Common validation                             | `false`  | `1.0-teamengine-6.0.0-RC2`   |
| `ogc-api-common-ignore`           | Multi-line list of test identifiers to ignore for OGC API - Common validation    | `false`  | `''`                         |
| `ogc-api-processes`               | If set, validate OGC API - Processes                                             | `false`  | `false`                      |
| `ogc-api-processes-container-tag` | Container tag to use for OGC API - Processes 1.0 validation                      | `false`  | `1.3-teamengine-6.0.0-RC2`   |
| `echoprocessid`                   | The process identifier to run for OGC API - Processes validation                 | `false`  | `echo`                       |
| `ogc-api-processes-ignore`        | Multi-line list of test identifiers to ignore for OGC API - Processes validation | `false`  | `''`                         |
| `ogc-api-features`                | If set, validate OGC API - Features                                              | `false`  | `false`                      |
| `ogc-api-features-container-tag`  | Container tag to use for OGC API - Features 1.0 validation                       | `false`  | `1.1.9-teamengine-6.0.0-RC2` |
| `ogc-api-features-ignore`         | Multi-line list of test identifiers to ignore for OGC API - Features validation  | `false`  | `''`                         |
| `ogc-api-tiles`                   | If set, validate OGC API - Tiles                                                 | `false`  | `false`                      |
| `ogc-api-tiles-container-tag`     | Container tag to use for OGC API - Tiles 1.0 validation                          | `false`  | `1.0-teamengine-6.0.0-RC2`   |
| `ogc-api-tiles-ignore`            | Multi-line list of test identifiers to ignore for OGC API - Tiles validation     | `false`  | `''`                         |

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
