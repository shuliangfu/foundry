# Changelog

All notable changes to @dreamer/foundry are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.11] - 2026-02-20

### Added

- **CI**: GitHub Actions workflow `.github/workflows/ci.yml` runs `deno check`, `deno lint`, and
  `deno test -A tests/` on Linux, macOS, and Windows on push or PR to `dev` for cross-platform
  validation.
- **i18n**: New dependency `@dreamer/i18n`; CLI and related copy now use internationalization (e.g.
  English and Chinese) with strings managed in `src/locales/` and `$tr()`.

### Changed

- **CLI**: Refactored `cli.ts` so that deploy, init, verify, run, test, upgrade, uninstall, and
  build logic live in `src/cmd/`; the CLI entry only registers commands and delegates execution for
  easier maintenance and extension.
- Dependency updates: upgrade `@dreamer/web3`, `@dreamer/logger`, `@dreamer/runtime-adapter`,
  `@dreamer/test`, `@dreamer/console` to current stable versions.
- **Windows compatibility**: `run` command now uses `isAbsolute`/`resolve` for script path so
  Windows absolute paths (e.g. `C:\path\to\script.ts`) work; `setup.ts` and `cmd/upgrade.ts` Windows
  root detection updated to match forward-slash form (`C:`/`C:/`) from runtime-adapter to avoid
  incorrect root detection.
- Test reports (`docs/zh-CN/TEST_REPORT.md`, `docs/en-US/TEST_REPORT.md`) and README (root and
  `docs/zh-CN/README.md`): update test stats to 264 total, 261 passed, 3 ignored, ~6s execution
  time, 98.9% pass rate.

## [1.7.10] - 2026-02-13

### Added

- Documentation structure under `docs/`: `docs/en-US/` and `docs/zh-CN/` for English and Chinese
  content.
- English test report at `docs/en-US/TEST_REPORT.md` (moved from root).
- Chinese test report at `docs/zh-CN/TEST_REPORT.md`.
- English changelog at `docs/en-US/CHANGELOG.md`.
- Chinese changelog at `docs/zh-CN/CHANGELOG.md`.
- Chinese README at `docs/zh-CN/README.md` (full documentation in Chinese).

### Changed

- **CLI**: `foundry test` now accepts `mainnet` as a valid network (validator and message updated
  from "local, testnet" to "local, testnet, mainnet").
- Root `README.md` is now English-only; previous Chinese content moved to `docs/zh-CN/README.md`.
- Test report and changelog links in root README point to `docs/en-US/` and `docs/zh-CN/`
  respectively.
- `docs/zh-CN/README.md` links to English README, English test report, and both changelogs.
- Cursor rules `00-文档位置.mdc` updated with foundry docs paths (en-US/zh-CN README, TEST_REPORT,
  CHANGELOG).

### Documentation

- License remains **Apache License 2.0**; root `LICENSE` file unchanged. README badges and links
  reference `./LICENSE` (root) or `../../LICENSE` from `docs/zh-CN/`.

## [1.7.9] - 2026-02-13

### Added

- Implement `serializeConstructorArg` to handle nested arrays in constructor argument serialization
  for contract verification.

### Changed

- Upgrade `@dreamer/test` to 1.0.5.
- Enhance constructor args handling to support nested arrays in verification.

## [1.7.8] - 2026-02-05

### Changed

- Upgrade `@dreamer/web3` to ^1.0.6-beta.13.

## [1.7.7] - 2026-02-01

### Changed

- Upgrade `@dreamer/web3` to 1.0.6-beta.12 for compatibility with latest dependencies.

## [1.7.6] - 2026-02-01

### Changed

- Version bump for dependency compatibility.

## [1.7.5] - 2026-02-01

### Changed

- Refine force deployment warning message in CLI for improved clarity.

## [1.7.4] - 2026-01-31

### Changed

- Refine CLI contract name examples in deploy and verify command help for clarity.

## [1.7.3] - 2026-01-31

### Added

- Check Foundry installation during CLI setup; refactor so setup verifies Foundry is available.

### Changed

- Extend `.gitignore` for test output and coverage artifacts.

## [1.7.2] - 2026-01-31

### Changed

- Refine CLI description to better reflect contract development capabilities.

## [1.7.1] - 2026-01-31

### Changed

- Adjust CLI description for clarity in contract development tools.

## [1.7.0] - 2026-01-31

### Changed

- Reorganize force deployment confirmation logic in CLI for clearer UX and flow.

## [1.6.9] - 2026-01-31

### Changed

- Add newline in force deployment confirmation prompt for readability.

## [1.6.8] - 2026-01-31

### Changed

- Improve user prompt clarity in CLI with newline formatting.

## [1.6.7] - 2026-01-31

### Changed

- Move deployment start messages in CLI for clearer logging.

## [1.6.6] - 2026-01-31

### Added

- Immediate contract verification in deploy flow with API key support in CLI and deploy module.

## [1.6.5] - 2026-01-31

### Changed

- Upgrade default Solidity compiler version to 0.8.20 in `init` for better compatibility and
  features.

## [1.6.4] - 2026-01-31

### Added

- New `foundry build` command to compile Solidity contracts with options for sizes, force
  recompilation, and optimizer runs.

## [1.6.3] - 2026-01-31

### Changed

- Upgrade `@dreamer/web3`, `@dreamer/logger`, and `@dreamer/test` to latest beta versions.

## [1.6.2] - 2026-01-30

### Added

- Reintroduce global environment variable initialization in CLI for configuration handling.

### Changed

- Improve error messages in CLI for easier debugging.

## [1.6.1] - 2026-01-29

### Changed

- Add newline after script execution in CLI for readability.

## [1.6.0] - 2026-01-29

### Changed

- Add newline in CLI log output for readability after script execution.

## [1.5.9] - 2026-01-29

### Changed

- Remove unnecessary log message from deploy function for cleaner output.

## [1.5.8] - 2026-01-29

### Changed

- Remove completion log message from deploy function.

## [1.5.7] - 2026-01-29

### Changed

- Add newline formatting in CLI during contract verification for readability.

## [1.5.6] - 2026-01-29

### Changed

- Improve error logging in CLI by removing unnecessary newlines during version checks.

## [1.5.5] - 2026-01-29

### Changed

- Remove loading progress bar from transaction confirmation handling in deploy-utils for streamlined
  logging.

## [1.5.4] - 2026-01-29

### Changed

- Add newline formatting for version check and upgrade messages in CLI.

## [1.5.3] - 2026-01-29

### Added

- Loading progress bar during block confirmations in deploy-utils for better user feedback.

## [1.5.2] - 2026-01-29

### Changed

- Use `spawn()` for command execution in CLI for better process handling and error reporting.
- Align runtime-adapter version in config.

## [1.5.1] - 2026-01-29

### Changed

- Use `spawn()` in CLI for command execution and status checking.

## [1.5.0] - 2026-01-29

### Added

- Validation for network option in CLI.

### Changed

- Ensure correct `WEB3_ENV` propagation in CLI for network handling.

## [1.4.9] - 2026-01-29

### Added

- `waitForConfirmations` in deploy-utils for transaction confirmation during deployment.

## [1.4.8] - 2026-01-29

### Added

- `--confirmations` option in CLI to specify block confirmation count during deployment.
- Deploy interfaces and documentation updated for confirmation support.

## [1.4.7] - 2026-01-29

### Added

- `foundry test` command to run tests with network options.
- README usage for test command; setup help includes test command info.

## [1.4.6] - 2026-01-29

### Added

- `foundry run` command to execute TypeScript scripts with network options.

### Changed

- Environment variable handling in env module to avoid overwriting existing values.

## [1.4.5] - 2026-01-29

### Added

- `foundry run` command and README usage instructions.

## [1.4.4] - 2026-01-29

### Changed

- Add console log in deploy for output clarity.

## [1.4.3] - 2026-01-29

### Changed

- Refactor argument parsing in CLI, deploy, and verify to handle `runtimeArgs` as a function for
  Deno/Bun compatibility.

## [1.4.2] - 2026-01-29

### Changed

- Refactor command execution for Deno and Bun compatibility.
- Improve environment variable handling for script execution.

## [1.4.1] - 2026-01-29

### Added

- README support for both Deno and Bun runtimes.
- Bun-related entries in `.gitignore`.

### Changed

- Improved test coverage and error handling across CLI utilities and verification.

## [1.4.0] - 2026-01-29

### Changed

- Adjust progress bar message in deploy for better user feedback.

## [1.3.9] - 2026-01-29

### Changed

- Refactor progress bar in deploy so it starts and stops correctly per script.

## [1.3.8] - 2026-01-29

### Changed

- Ensure progress bar stops after all deployment scripts in deploy.

## [1.3.7] - 2026-01-29

### Added

- Loading progress bar with 5-second wait in deploy.

### Changed

- License badge link in README for accessibility.

## [1.3.6] - 2026-01-29

### Changed

- Set `auto_detect_remappings` to false in init and add explicit remappings to avoid issues with
  removed dependencies.

## [1.3.5] - 2026-01-28

### Changed

- Add deploy and verify file paths; improve CLI structure.

## [1.3.4] - 2026-01-28

### Changed

- Unify import paths in CLI, deploy, and verify.
- Improve error handling and logging in deploy-utils.

## [1.3.3] - 2026-01-28

### Changed

- Include test files in init file patterns for project structure.

## [1.3.2] - 2026-01-28

### Added

- New time utility (Anvil); README examples for time manipulation on local Anvil.

### Changed

- Replace time-sync utility with new time utility; export in mod; remove deprecated time-sync.

## [1.3.1] - 2026-01-28

### Added

- Automatic Foundry installation check in CLI and setup.

## [1.3.0] - 2026-01-28

### Changed

- Refactor network handling in deploy and verify to use default network constant.

## [1.2.9] - 2026-01-28

### Changed

- Differentiate connection errors from other errors in deploy-utils during transaction replacement.

## [1.2.8] - 2026-01-28

### Changed

- Increase wait to 3 seconds between deployment scripts for RPC/state readiness.

## [1.2.7] - 2026-01-28

### Added

- Support for multiple contract names in deploy and verify CLI arguments.

### Changed

- README clarity for contract name usage in deploy/verify.

## [1.2.6] - 2026-01-28

### Changed

- Whitespace cleanup in deploy-utils.

## [1.2.5] - 2026-01-28

### Added

- Constants for gas price handling in deploy-utils.

### Changed

- Deployment error handling in deploy-utils for transaction management.

## [1.2.4] - 2026-01-28

### Changed

- Simplify confirmation prompt in CLI.

## [1.2.3] - 2026-01-28

### Changed

- Add 2-second wait between deployment scripts for RPC/state readiness.

## [1.2.2] - 2026-01-28

### Changed

- Set `WEB3_ENV` in CLI, deploy, and verify for network configuration.

## [1.2.1] - 2026-01-28

### Changed

- Use `config.address` for deployer accounts for clearer address management.

## [1.2.0] - 2026-01-28

### Added

- Deploy script example in README; deployer interface now includes logger.

## [1.1.9] - 2026-01-26

### Changed

- Remove global CLI installation instructions from README.

## [1.1.8] - 2026-01-26

### Changed

- Update script paths and network configuration handling in CLI; remove obsolete docs.

## [1.1.7] - 2026-01-26

### Added

- New utility exports in deno.json; Web3 class methods for account and contract management.

## [1.1.6] - 2026-01-26

### Added

- `foundry uninstall` command with confirmation and path detection.

## [1.1.5] - 2026-01-26

### Added

- Loading progress bar during upgrades in CLI.

## [1.1.4] - 2026-01-26

### Changed

- Refine type annotations in deploy for type safety.

## [1.1.3] - 2026-01-26

### Changed

- Type safety and error handling in CLI, deploy, and verify.

## [1.1.2] - 2026-01-26

### Changed

- Reduce logging in CLI for version check and upgrade.

## [1.1.1] - 2026-01-26

### Changed

- Remove redundant logging in deploy-utils during retries.

## [1.1.0] - 2026-01-26

### Changed

- Reduce logging in CLI and deploy for cleaner output.

## [1.1.0-beta.41] - 2026-01-26

### Changed

- Upgrade command no longer requires user confirmation (auto upgrade to latest).

## [1.1.0-beta.40] - 2026-01-26

### Added

- Loading progress bar for deployment and verification in CLI, deploy, and verify.

## [1.1.0-beta.39] - 2026-01-26

### Changed

- Version check always refreshes from network for accurate comparison.

## [1.1.0-beta.38] - 2026-01-26

### Added

- Force refresh option for version cache in CLI.

## [1.1.0-beta.37] - 2026-01-26

### Added

- Help for upgrade command in setup.

## [1.1.0-beta.36] - 2026-01-26

### Added

- `foundry upgrade` command to check and upgrade to latest version (including beta).

## [1.1.0-beta.35] - 2026-01-26

### Added

- Command execution with real-time stdout/stderr streaming in verify and cli-utils.

## [1.1.0-beta.34] - 2026-01-26

### Changed

- Logging for deployment; script path caching in CLI and deploy.

## [1.1.0-beta.33] - 2026-01-26

### Added

- Global installed version caching in CLI and setup.

## [1.1.0-beta.32] - 2026-01-26

### Changed

- Network configuration and web3 config loading in init and verify.

## [1.1.0-beta.31] - 2026-01-26

### Added

- Case-insensitive contract name handling in CLI and verify.

## [1.1.0-beta.30] - 2026-01-26

### Added

- On-chain contract existence check before verification; improved API key error handling.

## [1.1.0-beta.29] - 2026-01-26

### Added

- Constructor argument encoding in verify.

## [1.1.0-beta.28] - 2026-01-26

### Changed

- abiDir and network extraction in deploy and deploy-utils.

## [1.1.0-beta.27] - 2026-01-26

### Changed

- JSR metadata and deno.json caching in CLI and setup.

## [1.1.0-beta.26] - 2026-01-26

### Added

- Exports for deploy and verify in module.

---

For earlier beta and 1.0.x changes, see the git history.

[1.7.10]: https://github.com/dreamer-jsr/foundry/compare/v1.7.9...v1.7.10
[1.7.9]: https://github.com/dreamer-jsr/foundry/compare/v1.7.8...v1.7.9
[1.7.8]: https://github.com/dreamer-jsr/foundry/compare/v1.7.7...v1.7.8
[1.7.7]: https://github.com/dreamer-jsr/foundry/compare/v1.7.6...v1.7.7
[1.7.6]: https://github.com/dreamer-jsr/foundry/compare/v1.7.5...v1.7.6
[1.7.5]: https://github.com/dreamer-jsr/foundry/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/dreamer-jsr/foundry/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/dreamer-jsr/foundry/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/dreamer-jsr/foundry/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/dreamer-jsr/foundry/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/dreamer-jsr/foundry/compare/v1.6.9...v1.7.0
[1.6.9]: https://github.com/dreamer-jsr/foundry/compare/v1.6.8...v1.6.9
[1.6.8]: https://github.com/dreamer-jsr/foundry/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/dreamer-jsr/foundry/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/dreamer-jsr/foundry/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/dreamer-jsr/foundry/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/dreamer-jsr/foundry/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/dreamer-jsr/foundry/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/dreamer-jsr/foundry/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/dreamer-jsr/foundry/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/dreamer-jsr/foundry/compare/v1.5.9...v1.6.0
[1.5.9]: https://github.com/dreamer-jsr/foundry/compare/v1.5.8...v1.5.9
[1.5.8]: https://github.com/dreamer-jsr/foundry/compare/v1.5.7...v1.5.8
[1.5.7]: https://github.com/dreamer-jsr/foundry/compare/v1.5.6...v1.5.7
[1.5.6]: https://github.com/dreamer-jsr/foundry/compare/v1.5.5...v1.5.6
[1.5.5]: https://github.com/dreamer-jsr/foundry/compare/v1.5.4...v1.5.5
[1.5.4]: https://github.com/dreamer-jsr/foundry/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/dreamer-jsr/foundry/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/dreamer-jsr/foundry/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/dreamer-jsr/foundry/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/dreamer-jsr/foundry/compare/v1.4.9...v1.5.0
[1.4.9]: https://github.com/dreamer-jsr/foundry/compare/v1.4.8...v1.4.9
[1.4.8]: https://github.com/dreamer-jsr/foundry/compare/v1.4.7...v1.4.8
[1.4.7]: https://github.com/dreamer-jsr/foundry/compare/v1.4.6...v1.4.7
[1.4.6]: https://github.com/dreamer-jsr/foundry/compare/v1.4.5...v1.4.6
[1.4.5]: https://github.com/dreamer-jsr/foundry/compare/v1.4.4...v1.4.5
[1.4.4]: https://github.com/dreamer-jsr/foundry/compare/v1.4.3...v1.4.4
[1.4.3]: https://github.com/dreamer-jsr/foundry/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/dreamer-jsr/foundry/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/dreamer-jsr/foundry/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/dreamer-jsr/foundry/compare/v1.3.9...v1.4.0
[1.3.9]: https://github.com/dreamer-jsr/foundry/compare/v1.3.8...v1.3.9
[1.3.8]: https://github.com/dreamer-jsr/foundry/compare/v1.3.7...v1.3.8
[1.3.7]: https://github.com/dreamer-jsr/foundry/compare/v1.3.6...v1.3.7
[1.3.6]: https://github.com/dreamer-jsr/foundry/compare/v1.3.5...v1.3.6
[1.3.5]: https://github.com/dreamer-jsr/foundry/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/dreamer-jsr/foundry/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/dreamer-jsr/foundry/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/dreamer-jsr/foundry/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/dreamer-jsr/foundry/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/dreamer-jsr/foundry/compare/v1.2.9...v1.3.0
[1.2.9]: https://github.com/dreamer-jsr/foundry/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/dreamer-jsr/foundry/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/dreamer-jsr/foundry/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/dreamer-jsr/foundry/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/dreamer-jsr/foundry/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/dreamer-jsr/foundry/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/dreamer-jsr/foundry/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/dreamer-jsr/foundry/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/dreamer-jsr/foundry/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/dreamer-jsr/foundry/compare/v1.1.9...v1.2.0
[1.1.9]: https://github.com/dreamer-jsr/foundry/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/dreamer-jsr/foundry/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/dreamer-jsr/foundry/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/dreamer-jsr/foundry/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/dreamer-jsr/foundry/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/dreamer-jsr/foundry/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/dreamer-jsr/foundry/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/dreamer-jsr/foundry/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/dreamer-jsr/foundry/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/dreamer-jsr/foundry/compare/v1.1.0-beta.41...v1.1.0
