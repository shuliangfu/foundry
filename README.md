# @dreamer/foundry

> A Foundry smart contract deployment and verification toolkit for Deno and Bun, with project init
> and automated deployment.

[![JSR](https://jsr.io/badges/@dreamer/foundry)](https://jsr.io/@dreamer/foundry)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-261%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)
[![Coverage](https://img.shields.io/badge/coverage-80--85%25-green)](./docs/en-US/TEST_REPORT.md)

**中文文档**: [docs/zh-CN/README.md](./docs/zh-CN/README.md) · **Changelog**:
[EN](./docs/en-US/CHANGELOG.md) | [中文](./docs/zh-CN/CHANGELOG.md)

---

## Features

`@dreamer/foundry` is a modern deployment and verification library for Foundry projects. It provides
project initialization, automated deployment, contract verification, and **full support for both
Deno and Bun**.

---

## Installation

### Global CLI

Install once, then use the `foundry` command anywhere:

```bash
# Install global CLI with Deno (recommended)
deno run -A jsr:@dreamer/foundry/setup

# Usage
foundry init [project-name]
foundry deploy --network testnet
foundry verify --network testnet -c <ContractName> --api-key YOUR_API_KEY
foundry run scripts/test.ts --network local
foundry test --network local
```

> **Why install with Deno?**
>
> - Deno can run `jsr:` URLs directly without a local install.
> - Bun does not run remote URLs directly, and JSR’s npm layer doesn’t support global install.
> - Install Deno if needed: `curl -fsSL https://deno.land/install.sh | sh`
>
> **Runtime detection**:
>
> - The global CLI runs with Deno.
> - For `foundry deploy` / `verify` / `run` / `test`, the CLI detects the project:
>   - `deno.json` present → uses `deno run` / `deno test`
>   - Only `package.json` → uses `bun run` / `bun test`

**Uninstall**:

```bash
deno run -A jsr:@dreamer/foundry/setup --uninstall
# or
foundry uninstall
```

### As a dependency

**Deno**:

```bash
deno add jsr:@dreamer/foundry
```

**Bun**:

```bash
bunx jsr add @dreamer/foundry
```

Then import:

```typescript
import { deploy, verify, Web3 } from "@dreamer/foundry";
```

---

## Environment support

| Environment | Version | Status                            |
| ----------- | ------- | --------------------------------- |
| **Deno**    | 2.5.0+  | ✅                                |
| **Bun**     | 1.0.0+  | ✅ (via @dreamer/runtime-adapter) |
| **Server**  | -       | ✅ (Deno/Bun)                     |

---

## Highlights

- **Core**: Auto discovery and run of deploy scripts; Etherscan/BSCScan verification; project init;
  Foundry CLI detection and install.
- **Utilities**: Logging, env loading/validation, contract loading, Web3 client (read/write,
  balance, events), Anvil time control, address validation/formatting, unit conversion, hashing, hex
  conversion.
- **Cross-runtime**: @dreamer/runtime-adapter for Deno/Bun; unified API and behavior.
- **Init**: Directory layout, config and template generation, sample contract and scripts.

---

## Quick start

### CLI commands

After installation: `foundry init`, `foundry deploy`, `foundry verify`, `foundry upgrade`,
`foundry uninstall`.

#### `foundry init`

Initialize a Foundry project in the current or given directory.

```bash
foundry init
foundry init /path/to/project
```

#### `foundry deploy`

Run scripts in `deploy/` in order. Contract names match the script naming (e.g.
`deploy/1-MyToken.ts` → `MyToken`).

```bash
foundry deploy --network testnet
foundry deploy --network testnet -c <MyToken>
foundry deploy --network testnet -c <Name1> <Name2> --force
foundry deploy --network testnet --verify --api-key YOUR_API_KEY
foundry deploy --network testnet --confirmations 3
```

| Option            | Short | Description                                            |
| ----------------- | ----- | ------------------------------------------------------ |
| `--network`       | `-n`  | `local` \| `testnet` \| `mainnet` (or from `WEB3_ENV`) |
| `--contract`      | `-c`  | One or more contract names                             |
| `--force`         | `-f`  | Force redeploy                                         |
| `--verify`        | -     | Verify on block explorer after deploy                  |
| `--api-key`       | -     | Explorer API key (or `ETH_API_KEY`)                    |
| `--confirmations` | -     | Block confirmations (default: local=0, others=2)       |

#### `foundry verify`

Verify contract source on the block explorer.

```bash
foundry verify --network testnet -c <ContractName>
foundry verify --network testnet -c <Name1> <Name2> --api-key YOUR_API_KEY
foundry verify --network testnet -c <Name> --address 0x... --api-key YOUR_API_KEY
```

| Option                     | Short | Required | Description                        |
| -------------------------- | ----- | -------- | ---------------------------------- |
| `--network`                | `-n`  | No       | From `WEB3_ENV` if omitted         |
| `--contract`               | `-c`  | **Yes**  | Contract name(s)                   |
| `--address`                | `-a`  | No       | Contract address (single contract) |
| `--api-key`                | -     | No       | Or `ETH_API_KEY`                   |
| `--rpc-url` / `--chain-id` | -     | No       | Override config                    |

#### `foundry run`

Run a TypeScript script with network env set.

```bash
foundry run scripts/test.ts --network local
```

#### `foundry test`

Run tests (Deno or Bun detected from project).

```bash
foundry test
foundry test --network local --filter "deploy" --watch
foundry test --coverage   # Deno only
```

#### `foundry upgrade` / `foundry uninstall`

Upgrade the global CLI or uninstall it.

---

## Usage examples

### Tools and Web3

```typescript
import { loadContract, loadEnv, logger, Web3 } from "@dreamer/foundry/utils";

logger.info("Deploying...");
const env = await loadEnv();
const contract = loadContract("MyContract", "testnet");

const web3 = new Web3("MyContract", {
  rpcUrl: "https://rpc.example.com",
  chainId: 97,
  privateKey: "0x...",
  address: "0x...",
});
const balance = await web3.read("balanceOf", ["0x..."]);
```

### Anvil time (local)

```typescript
import { advanceTime, getAnvilTimestamp, syncAnvilTime } from "@dreamer/foundry/utils";

const ts = await getAnvilTimestamp();
await syncAnvilTime();
await advanceTime(1); // 1 day
```

### Deploy script

Scripts in `deploy/` export `deploy(deployer)`:

```typescript
// deploy/1-mytoken.ts
import type { Deployer } from "@dreamer/foundry";
import { logger } from "@dreamer/foundry";

export async function deploy(deployer: Deployer) {
  const args = ["MyToken", "MTK", "18", "1000000"];
  const myToken = await deployer.deploy("MyToken", args);
  logger.info(`MyToken deployed at: ${myToken.address}`);
}
```

Run: `foundry deploy --network local` or call `deploy({ network, config, ... })` in code.

---

## Supported networks

Verification is supported on 11 chains (testnet + mainnet): BSC, Ethereum, Polygon, Arbitrum, Base,
Optimism, Avalanche, Linea, Scroll, Mantle, Blast. Deployment works on any EVM chain with correct
RPC and chainId.

See [docs/zh-CN/README.md](./docs/zh-CN/README.md) for full chain table and config format.

---

## Test report

261 of 264 tests pass (~98.9%), coverage ~80–85%. Full report:

- **English**: [docs/en-US/TEST_REPORT.md](./docs/en-US/TEST_REPORT.md)
- **中文**: [docs/zh-CN/TEST_REPORT.md](./docs/zh-CN/TEST_REPORT.md)

---

## Notes

- Configure `config/web3.json` after `init` (networks and accounts).
- Use `.env` for `WEB3_ENV`, `ETH_API_KEY`; never hardcode keys.
- Deploy scripts live in `deploy/` (not `script/`).
- Errors use `ConfigurationError`, `NetworkError`, etc.
- Deno/Bun compatibility via @dreamer/runtime-adapter.
- Foundry is auto-detected; CLI can prompt to install.

---

## Changelog

**v1.8.0** (2026-02-20)

- **Added**: CI workflow (Linux/macOS/Windows); i18n with `@dreamer/i18n` and `src/locales/`.
- **Changed**: CLI refactored into `src/cmd/`; dependency bumps; Windows path fixes; test report
  updates.

Full history: [docs/en-US/CHANGELOG.md](./docs/en-US/CHANGELOG.md) |
[docs/zh-CN/CHANGELOG.md](./docs/zh-CN/CHANGELOG.md)

---

## License

Apache-2.0 — see [LICENSE](./LICENSE).
