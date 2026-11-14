# Contributing to growth-chart-app

This repository contains a legacy SMART growth-chart application and a separate modern implementation. The root [README](README.md) marks the legacy project deprecated and not actively maintained; contribution guidance does not change that status.

## Before you start

Search existing issues and pull requests before starting, and discuss substantial changes or new dependencies in an issue. Use an issue template when one is offered. For a bug, include the affected commit or version, environment, a minimal reproduction, and expected versus observed behavior; remove sensitive information from logs and screenshots.

## Development and validation

State whether your change targets the legacy app or [growth-chart-app-modern](growth-chart-app-modern/README.md). Their dependencies and commands differ. The legacy [package.json](package.json) provides `npm run serve`; it does not define an npm test script. Its browser-based tests are under [tests](tests).

For the modern application, use its own [package.json](growth-chart-app-modern/package.json) and run the applicable scripts from that directory:

```sh
npm test
npm run lint
npm run build
```

Record runtime/browser versions and any failures. For chart or calculation changes, check units, age boundaries, missing measurements, centile-source attribution, and rendered labels using synthetic measurements. Keep SMART/FHIR credentials and real patient records out of examples. A successful build or test does not establish clinical suitability.

## Pull requests

Work on a focused branch from the current default branch. Open a pull request explaining the problem, the resulting behavior, and any compatibility or data-format changes. Link the relevant issue and complete any existing PR template.

Add focused regression coverage for changed behavior and update affected examples or documentation. Describe the checks actually run, their results, and any checks you could not run. For documentation-only changes, verify links, examples, and rendered formatting. Use the repository's existing checks and review/merge process; preserve required checks and resolve actionable feedback without weakening the checks.

## Security and sensitive information

Follow the [account security policy](https://github.com/edithatogo/.github/blob/main/SECURITY.md). Report vulnerabilities privately through the repository's **Report a vulnerability** option if available; otherwise request a private reporting contact without posting exploit details. Never include credentials, personal information, restricted datasets, or confidential records in issues, commits, fixtures, or diagnostic output.

## Licensing and conduct

The repository's [license](LICENSE) continues to apply. Be respectful and constructive, and follow the [account code of conduct](https://github.com/edithatogo/.github/blob/main/CODE_OF_CONDUCT.md). Preserve attribution and third-party notices. Contribute only material you are entitled to share; resolve unclear permissions before adding third-party content. This guide does not change licensing terms or introduce a CLA or DCO requirement.

## References

- [GitHub contribution guideline conventions](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors)
- [OpenSSF contribution and quality criteria](https://www.bestpractices.dev/en/criteria)
