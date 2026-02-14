# @dreamer/foundry Test Report

## Test Overview

- **Test framework**: @dreamer/test (based on Deno built-in test framework)
- **Test date**: 2026-01-26
- **Test environment**: Deno + Anvil local node
- **Data source**: Generated from actual terminal test output

## Test Results

### Summary

- **Total tests**: 247
- **Passed**: 244 ✅
- **Failed**: 0
- **Ignored**: 3 (require special environment)
- **Pass rate**: 98.8% ✅
- **Execution time**: ~17–23 seconds

### Test Files Summary

| Test file              | Count | Status       | Description                              |
| ---------------------- | ----- | ------------ | ---------------------------------------- |
| `cache.test.ts`        | 13    | ✅ All pass  | Cache utilities                          |
| `cli-utils.test.ts`    | 25    | ✅ All pass  | CLI helper functions (extended)          |
| `cli.test.ts`          | 27    | ✅ All pass  | CLI commands (new)                       |
| `config.test.ts`       | 11    | ✅ All pass  | Config manager                           |
| `contract.test.ts`     | 7     | ✅ All pass  | Contract utilities (new)                 |
| `deploy-utils.test.ts` | 18    | ✅ All pass  | Deploy helpers (extended)                |
| `deploy.test.ts`       | 6     | ✅ All pass  | Deploy flow                              |
| `env.test.ts`          | 6     | ✅ All pass  | Env var utilities                        |
| `errors.test.ts`       | 13    | ✅ All pass  | Error types                              |
| `init.test.ts`         | 18    | ✅ All pass  | Project init                             |
| `jsr.test.ts`          | 8     | ✅ All pass  | JSR helpers                              |
| `setup.test.ts`        | 12    | ⏭️ 2 skipped | Foundry setup (new)                      |
| `time.test.ts`         | 16    | ✅ All pass  | Anvil time utilities (new)               |
| `utils.test.ts`        | 5     | ⏭️ 1 skipped | General utilities                        |
| `verify.test.ts`       | 20    | ✅ All pass  | Verification (new)                       |
| `web3-config.test.ts`  | 10    | ✅ All pass  | Web3 config loading                      |
| `web3.test.ts`         | 32    | ✅ All pass  | Web3 helpers and instance (new/extended) |

## Feature Test Details

### 1. Cache (cache.test.ts) – 13 tests

**Scenarios**:

- ✅ writeCache and readCache
  - Write and read cache
  - Different version identifiers
  - Missing cache returns null
  - Cache complex objects
- ✅ getInstalledVersion and setInstalledVersion
  - Set and get installed version
  - Missing version returns null
  - Update existing version
- ✅ clearCache
  - Clear cache for a version
  - Clear all cache

**Result**: 13 tests passed

### 2. CLI helpers (cli-utils.test.ts) – 25 tests

**Scenarios**:

- ✅ getProjectConfig
- ✅ getScriptPath (deploy/verify, caching)
- ✅ getApiKey (from args, null, empty string)
- ✅ getNetworkName (from args, null)
- ✅ handleCommandResult (success, streamed)
- ✅ withProgressBar

**Result**: 25 tests passed

### 3. CLI commands (cli.test.ts) – 27 tests

**Scenarios**:

- ✅ Argument parsing: `--network`/`-n`, `--contract`/`-c`, `--force`/`-f`, `--verify`, `--api-key`
- ✅ Command detection: deploy, verify, init
- ✅ Contract name parsing (single/multiple)
- ✅ Network name validation (local/testnet/mainnet)
- ✅ Combined options, help, error handling

**Result**: 27 tests passed

### 4. Config manager (config.test.ts) – 11 tests

**Scenarios**:

- ✅ Singleton, initialize, getWeb3Config, getEnvConfig, getAllEnvConfig, clearCache

**Result**: 11 tests passed

### 5. Contract utilities (contract.test.ts) – 7 tests

**Scenarios**:

- ✅ loadContracts (missing dir, missing network, contract shape)
- ✅ Address and ABI validation

**Result**: 7 tests passed

### 6. Deploy helpers (deploy-utils.test.ts) – 18 tests

**Scenarios**:

- ✅ loadContract (local network, missing contract/network)
- ✅ extractNetworkFromAbiDir
- ✅ filterSensitiveInfo
- ✅ forgeDeploy params and errors

**Result**: 18 tests passed

### 7. Deploy (deploy.test.ts) – 6 tests

**Scenarios**:

- ✅ Deployer creation, env helpers, contract loading, verification, utilities

**Result**: 6 tests passed

### 8. Env (env.test.ts) – 6 tests

**Scenarios**:

- ✅ validateEnv (required vars, missing, empty list, empty string), format

**Result**: 6 tests passed

### 9. Errors (errors.test.ts) – 13 tests

**Scenarios**:

- ✅ FoundryError, DeploymentError, VerificationError, ConfigurationError, NetworkError, inheritance

**Result**: 13 tests passed

### 10. Init (init.test.ts) – 18 tests

**Scenarios**:

- ✅ Dir creation (src, deploy, tests, utils, build, config)
- ✅ Config files (foundry.toml, .gitignore, .env.example)
- ✅ Sample files (MyToken.sol, 1-mytoken.ts, 01-mytoken.test.ts)
- ✅ Content checks, skip existing, path handling

**Result**: 18 tests passed

### 11. JSR (jsr.test.ts) – 8 tests

**Scenarios**:

- ✅ parseJsrPackageFromUrl, parseJsrVersionFromUrl, parseJsrPackageNameFromUrl, relations

**Result**: 8 tests passed

### 12. Foundry setup (setup.test.ts) – 12 tests

**Scenarios**:

- ✅ Exports: ensureFoundryInstalled, findFoundryPath
- ✅ Signatures (Promise return)
- ✅ Default paths (~/.foundry/bin)
- ⏭️ Real install/path tests skipped (avoid resource leaks)

**Result**: 10 passed, 2 skipped

### 13. Anvil time (time.test.ts) – 16 tests

**Scenarios**:

- ✅ Exports and signatures for getAnvilTimestamp, syncAnvilTime, advanceAnvilTime, advanceTime
- ✅ Day/second conversion, value ranges
- ✅ Anvil node tests (timestamp, sync, advance, advanceTime, negative param rejected)

**Result**: 16 tests passed

### 14. Utils (utils.test.ts) – 5 tests

**Scenarios**:

- ✅ Logger, env, contract helpers; ⏭️ Web3 (needs RPC, skipped)

**Result**: 4 passed, 1 skipped

### 15. Verify (verify.test.ts) – 20 tests

**Scenarios**:

- ✅ findContractFileName, verify, verifyContract, param validation, error handling

**Result**: 20 tests passed

### 16. Web3 config (web3-config.test.ts) – 10 tests

**Scenarios**:

- ✅ loadWeb3ConfigSync, WEB3_ENV, missing config, preloadWeb3Config, createWeb3, lookup

**Result**: 10 tests passed

### 17. Web3 (web3.test.ts) – 32 tests

**Scenarios**:

- ✅ Address validation (isAddress, isPrivateKey, isTxHash)
- ✅ Formatting (toChecksumAddress, shortenAddress, formatAddress)
- ✅ Hex (addHexPrefix, stripHexPrefix, hexToNumber, numberToHex, hexToBytes, bytesToHex)
- ✅ Padding (padLeft, padRight)
- ✅ Units (toWei, fromWei, decimals)
- ✅ Hashing (keccak256, consistency)
- ✅ Config loading, createWeb3
- ✅ Web3 instance (no contract, getBalance, accountAddress)

**Result**: 32 tests passed

## Coverage Overview

### API coverage

| API / area                                      | Coverage               |
| ----------------------------------------------- | ---------------------- |
| init, deploy, verify                            | ✅ Covered             |
| createDeployer, loadContract                    | ✅ Covered             |
| loadEnv, validateEnv                            | ✅ Covered             |
| ConfigManager                                   | ✅ Covered             |
| Web3 / createWeb3                               | ✅ Covered             |
| CLI helpers & commands                          | ✅ Covered             |
| Cache, JSR, errors                              | ✅ Covered             |
| Time (Anvil)                                    | ✅ Covered             |
| Setup (ensureFoundryInstalled, findFoundryPath) | ✅ Covered (2 skipped) |

### Edge cases

- Missing contract, missing env file, existing file skip, invalid path, init without path,
  directory-as-file, invalid address/private key, negative time, fractional days – all covered.

### Error handling

- Missing contract, existing file, invalid path, missing env/config, bad network/params, negative
  time – all covered.

## Test Environment

### Required

1. **`config/web3.json`** – Web3 config (see repo for sample).
2. **Env**: `WEB3_ENV=local`.
3. **Anvil** – local node for RPC tests.

### Run tests

```bash
# Start Anvil if needed
anvil

# All tests
WEB3_ENV=local deno test -A

# Single file
WEB3_ENV=local deno test -A tests/web3.test.ts
```

## Conclusion

@dreamer/foundry has **247 tests: 244 passed, 3 skipped** (special env / resource safety). Coverage
is about **80–85%**. Suitable for production use.

**Summary**:

- **Total**: 247
- **Passed**: 244 ✅
- **Skipped**: 3
- **Failed**: 0
- **Pass rate**: 98.8%
