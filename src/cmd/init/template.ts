/**
 * init 脚手架模板内容（参考 dweb 的 templates 写法）
 *
 * 所有生成到项目中的静态文件内容由此模块提供，run.ts 只负责目录创建与写入逻辑。
 */

import { $tr } from "../../i18n.ts";

/** foundry.toml 默认配置 */
export function getFoundryToml(): string {
  return `[profile.default]
# ${$tr("foundry.template.tomlDirConfig")}
src = "src"
test = "test"
script = "deploy"
out = "build/out"
cache_path = "build/cache"
broadcast = "broadcast"

# ${$tr("foundry.template.tomlLibConfig")}
# libs = ["lib"]

# ${$tr("foundry.template.tomlCompilerConfig")}
# ${$tr("foundry.template.tomlAutoDetect")}
auto_detect_solc = true  # ${$tr("foundry.template.tomlAutoDetectSolc")}
solc_version = "0.8.20"  # ${$tr("foundry.template.tomlDefaultVersion")}
evm_version = "shanghai"  # ${$tr("foundry.template.tomlEvmVersion")}
optimizer = true          # ${$tr("foundry.template.tomlOptimizer")}
optimizer_runs = 200      # ${$tr("foundry.template.tomlOptimizerRuns")}

# ${$tr("foundry.template.tomlRemappingsDesc")}
auto_detect_remappings = false  # ${$tr("foundry.template.tomlNoRemapping")}
remappings = []                 # ${$tr("foundry.template.tomlRemappingsEmpty")}

# ${$tr("foundry.template.tomlBuildOptions")}
cache = true              # ${$tr("foundry.template.tomlCache")}
extra_output = ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
build_info = true         # ${$tr("foundry.template.tomlBuildInfo")}

# ${$tr("foundry.template.tomlTestConfig")}
fuzz = { runs = 256 }     # ${$tr("foundry.template.tomlFuzzRuns")}
invariant = { runs = 256 } # ${$tr("foundry.template.tomlInvariantRuns")}

# ${$tr("foundry.template.tomlPerfConfig")}
# jobs = 0               # ${$tr("foundry.template.tomlJobs")}

# ${$tr("foundry.template.tomlFmt")}
[fmt]
tab_width = 2

# ${$tr("foundry.template.tomlLint")}
[lint]
lint_on_build = true      # ${$tr("foundry.template.tomlLintOnBuild")}
`;
}

/** .gitignore 内容 */
export function getGitignore(): string {
  return `# ${$tr("foundry.template.gitignoreFoundryBuild")}
build/out/
build/cache/

# ${$tr("foundry.template.gitignoreCoverage")}
coverage/
coverage.json

# ${$tr("foundry.template.gitignoreEnv")}
.env
.env.local
*.env

# ${$tr("foundry.template.gitignoreIde")}
.idea/
.DS_Store

# ${$tr("foundry.template.gitignoreLib")}
/lib/

# ${$tr("foundry.template.gitignoreDeno")}
.deno/
deno.lock
node_modules/

# ${$tr("foundry.template.gitignoreLogs")}
*.log

# ${$tr("foundry.template.gitignoreTest")}
tests/data/
`;
}

/** .env.example 内容 */
export function getEnvExample(): string {
  return `# ============================================
# ${$tr("foundry.template.envFoundryConfig")}
# ============================================

# ============================================
# ${$tr("foundry.template.envNetworkConfig")}
# ============================================
# ${$tr("foundry.template.envNoteWeb3")}
# ${$tr("foundry.template.envWeb3EnvValues")}
WEB3_ENV=local

# ============================================
# ${$tr("foundry.template.envVerifyConfig")}
# ============================================

# Etherscan/BSCScan/Polygonscan API Key
# ${$tr("foundry.template.envApiKeyHint")}
#   - Etherscan: https://etherscan.io/apis
#   - BSCScan: https://bscscan.com/apis
#   - Polygonscan: https://polygonscan.com/apis
ETH_API_KEY=your-api-key-here
`;
}

/** .env 初始内容 */
export function getEnvFile(): string {
  return `# ============================================
# ${$tr("foundry.template.envFoundryConfig")}
# ============================================

# ============================================
# ${$tr("foundry.template.envNetworkConfig")}
# ============================================
# ${$tr("foundry.template.envNoteWeb3")}
# ${$tr("foundry.template.envWeb3EnvValues")}
WEB3_ENV=local

# ============================================
# ${$tr("foundry.template.envVerifyConfig")}
# ============================================

# Etherscan/BSCScan/Polygonscan API Key
# ${$tr("foundry.template.envApiKeyHint")}
#   - Etherscan: https://etherscan.io/apis
#   - BSCScan: https://bscscan.com/apis
#   - Polygonscan: https://polygonscan.com/apis
ETH_API_KEY=your-api-key-here
`;
}

/** .prettierrc 内容 */
export function getPrettierrc(): string {
  return `{
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "singleQuote": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
`;
}

/** .cursorignore 内容 */
export function getCursorignore(): string {
  return `# ${$tr("foundry.template.cursorDeno")}
.deno/
deno.lock
*.so
*.dylib
*.dll

# ${$tr("foundry.template.cursorDeps")}
node_modules/
.npm/
.pnpm-store/

# ${$tr("foundry.template.cursorBuild")}
dist/
build/
out/
.next/
.nuxt/
.cache/
runtime/

# ${$tr("foundry.template.cursorCoverage")}
coverage/
.nyc_output/
*.lcov

# ${$tr("foundry.template.cursorLogs")}
*.log
*.log.*
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# ${$tr("foundry.template.cursorEnv")}
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

# ${$tr("foundry.template.cursorIde")}
.vscode/
.cursor/
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/
*.sublime-project
*.sublime-workspace

# ${$tr("foundry.template.cursorSystem")}
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
Desktop.ini

# ${$tr("foundry.template.cursorTemp")}
tmp/
temp/
*.tmp
*.temp
.cache/
.tmp/
*.pid
*.seed
*.pid.lock

# ${$tr("foundry.template.cursorTest")}
.test/
test-results/
playwright-report/
test-results/

# ${$tr("foundry.template.cursorDocs")}
docs/_build/
site/

# ${$tr("foundry.template.cursorOther")}
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
`;
}

/** deno.json 模板，需传入 @dreamer/foundry 版本号 */
export function getDenoJsonTemplate(version: string): string {
  return `{
  "version": "1.0.0",
  "license": "Apache-2.0",
  "imports": {
    "@dreamer/foundry": "jsr:@dreamer/foundry@^${version}",
\t\t"@dreamer/test": "jsr:@dreamer/test@1.0.0-beta.23"
  },
  "nodeModulesDir": "auto",
  "fmt": {
    "files": {
      "include": ["**/*.ts", "**/*.js"]
    },
    "options": {
      "indentWidth": 2,
      "lineWidth": 100,
      "useTabs": false
    }
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "exclude": ["no-explicit-any"]
    },
    "include": ["deploy/**/*.ts", "tests/**/*.ts"]
  },
  "compilerOptions": {
    "lib": ["deno.window"],
    "strict": true,
    "noImplicitAny": false
  },
  "allowScripts": {
    "allow": [],
    "deny": ["npm:esbuild@0.27.2", "npm:puppeteer@24.36.0"]
  }
}
`;
}

/** .vscode/settings.json 内容 */
export function getVscodeSettings(): string {
  return `{
  "solidity.defaultCompiler": "remote",
  "solidity.compileUsingRemoteVersion": "v0.8.20",
  "solidity.packageDefaultDependenciesContractsDirectory": "src",
  "solidity.packageDefaultDependenciesDirectory": "lib",
  "solidity.remappings": [
    "forge-std/=lib/forge-std/src/"
  ],
  "solidity.formatter": "forge",
  "[solidity]": {
    "editor.defaultFormatter": "JuanBlanco.solidity",
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.formatOnSave": true,
    "editor.detectIndentation": false
  },
  "files.associations": {
    "*.sol": "solidity"
  },
  "deno.enable": true,
  "deno.lint": true,
  "deno.config": "./deno.json",
  "[typescript]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[javascript]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "files.exclude": {
    "**/node_modules": true
  }
}
`;
}

/** .vscode/extensions.json 内容 */
export function getVscodeExtensions(): string {
  return `{
  "recommendations": [
    "JuanBlanco.solidity",
    "denoland.vscode-deno"
  ]
}
`;
}

/** config/web3.json 默认内容 */
export function getConfigWeb3Json(): string {
  return `{
  "chain": "bsc",
  "network": {
    "local": {
      "chainId": 31337,
      "rpcUrl": "http://127.0.0.1:8545",
      "wssUrl": "ws://127.0.0.1:8545",
      "accounts": [
        {
          "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        }
      ]
    },
    "testnet": {
      "chainId": 97,
      "rpcUrl": "https://bsc-testnet.nodereal.io/v1/your-api-key",
      "wssUrl": "wss://bsc-testnet.nodereal.io/ws/v1/your-api-key",
      "accounts": [
        {
          "address": "your-testnet-address-here",
          "privateKey": "your-testnet-private-key-here"
        }
      ]
    },
    "mainnet": {
      "chainId": 56,
      "rpcUrl": "https://go.getblock.io/your-api-key",
      "wssUrl": "wss://go.getblock.io/your-api-key",
      "accounts": [
        {
          "address": "your-mainnet-address-here",
          "privateKey": "your-mainnet-private-key-here"
        }
      ]
    }
  }
}
`;
}

/** 示例合约 MyToken.sol */
export function getExampleContractSol(): string {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MyToken
 * @dev ${$tr("foundry.template.solExampleErc20")}
 */
contract MyToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev ${$tr("foundry.template.solConstructor")}
     * @param _name ${$tr("foundry.template.solParamName")}
     * @param _symbol ${$tr("foundry.template.solParamSymbol")}
     * @param _decimals ${$tr("foundry.template.solParamDecimals")}
     * @param _initialSupply ${$tr("foundry.template.solParamSupply")}
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** _decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    /**
     * @dev ${$tr("foundry.template.solTransfer")}
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @dev ${$tr("foundry.template.solApprove")}
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * @dev ${$tr("foundry.template.solTransferFrom")}
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;
}

/** 示例部署脚本 deploy/1-mytoken.ts */
export function getExampleDeployScript(): string {
  return `#!/usr/bin/env -S deno run -A

/**
 * @title Deploy MyToken Contract
 * @dev ${$tr("foundry.template.deployDevDesc")}
 *
 * ${$tr("foundry.template.deployUsage")}
 */

import type { Deployer } from "@dreamer/foundry";
import { logger } from "@dreamer/foundry";

/**
 * ${$tr("foundry.template.deployFn")}
 * @param deployer ${$tr("foundry.template.deployParam")}
 */
export async function deploy(deployer: Deployer) {
  logger.info($tr("foundry.template.deployStartLog") + "\\n");

  // ${$tr("foundry.template.deployConstructorArgs")}
  const args = [
    "MyToken",      // name
    "MTK",          // symbol
    "18",           // decimals
    "1000000",      // initialSupply (1M)
  ];

  // ${$tr("foundry.template.deployContractComment")}
  const myToken = await deployer.deploy("MyToken", args);

  logger.info(\`✅ MyToken deployed at: \${myToken.address}\`);

  // ${$tr("foundry.template.deployWeb3Note")}
  // const web3 = await deployer.web3("MyToken");
  // const name = await web3.read("name");
  // logger.info(\`name: \${name}\`);

  logger.info("\\n✅ " + $tr("foundry.template.deployCompletedLog"));
}
`;
}

/** 示例测试脚本 tests/01-mytoken.test.ts */
export function getExampleTestScript(): string {
  return `/**
 * @title ${$tr("foundry.template.testTitle")}
 * @dev ${$tr("foundry.template.testDevDesc")}
 *
 * ${$tr("foundry.template.testUsage")}
 */

import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { createWeb3, logger, type Web3 } from "@dreamer/foundry";

describe($tr("foundry.template.testDescribe"), () => {
  let web3: Web3;
  let deployerAddress: string;

  beforeAll(() => {
    // ${$tr("foundry.template.testCreateWeb3")}
    web3 = createWeb3("MyToken");

    // ${$tr("foundry.template.testGetDeployer")}
    deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  });

  afterAll(() => {
    logger.info($tr("foundry.template.testDoneLog"));
  });

  describe($tr("foundry.template.testDescribeBasic"), () => {
    it($tr("foundry.template.testItName"), async () => {
      const name = await web3.read("name");
      expect(name).toBe("MyToken");
    });

    it($tr("foundry.template.testItSymbol"), async () => {
      const symbol = await web3.read("symbol");
      expect(symbol).toBe("MTK");
    });

    it($tr("foundry.template.testItDecimals"), async () => {
      const decimals = await web3.read("decimals");
      expect(Number(decimals)).toBe(18);
    });

    it($tr("foundry.template.testItSupply"), async () => {
      const totalSupply = await web3.read("totalSupply");
      expect(totalSupply).toBeDefined();
      expect(Number(totalSupply)).toBeGreaterThan(0);
    });
  });

  describe($tr("foundry.template.testDescribeBalance"), () => {
    it($tr("foundry.template.testItBalance"), async () => {
      const balance = await web3.read("balanceOf", [deployerAddress]);
      expect(balance).toBeDefined();
      expect(Number(balance)).toBeGreaterThan(0);
    });
  });
});
`;
}

/** README.md 内容 */
export function getReadmeContent(): string {
  return `# Foundry Project

${$tr("foundry.template.readmeIntro")}

## ${$tr("foundry.template.readmeStructure")}

\`\`\`
.
├── src/              # ${$tr("foundry.template.readmeSrc")}
├── deploy/          # ${$tr("foundry.template.readmeDeploy")}
├── tests/           # ${$tr("foundry.template.readmeTests")}
├── config/          # ${$tr("foundry.template.readmeConfig")}
│   └── web3.ts      # ${$tr("foundry.template.readmeConfigWeb3")}
└── build/           # ${$tr("foundry.template.readmeBuild")}
    └── abi/         # ${$tr("foundry.template.readmeAbi")}
\`\`\`

## ${$tr("foundry.template.readmeQuickStart")}

### 1. ${$tr("foundry.template.readmeInstallDeps")}

\`\`\`bash
# ${$tr("foundry.template.readmeDenoInstall")}
deno install

# ${$tr("foundry.template.readmeForgeBuild")}
forge build
\`\`\`

### 2. ${$tr("foundry.template.readmeGlobalCmd")}

${$tr("foundry.template.readmeGlobalCmdDesc")}

\`\`\`bash
deno run -A jsr:@dreamer/foundry/setup
\`\`\`

${$tr("foundry.template.readmeAfterInstall")}

### 3. ${$tr("foundry.template.readmeConfigEnv")}

\`\`\`bash
# ${$tr("foundry.template.readmeEnvEdit")}
\`\`\`

${$tr("foundry.template.readmeEnvNote")}

### 4. ${$tr("foundry.template.readmeConfigNetwork")}

### 5. ${$tr("foundry.template.readmeForgeBuild2")}

\`\`\`bash
forge build
\`\`\`

### 6. ${$tr("foundry.template.readmeRunTest")}

\`\`\`bash
# ${$tr("foundry.template.readmeDenoTest")}
deno test -A tests/

# ${$tr("foundry.template.readmeBunTest")}
bun test tests/
\`\`\`

### 7. ${$tr("foundry.template.readmeDeploy")}

#### ${$tr("foundry.template.readmeUseGlobal")}

\`\`\`bash
# ${$tr("foundry.template.readmeDeployAll")}
foundry deploy --network local

# ${$tr("foundry.template.readmeDeployContract")}
foundry deploy --network local --contract MyToken

# ${$tr("foundry.template.readmeDeployForce")}
foundry deploy --network local --force

# ${$tr("foundry.template.readmeDeployVerify")}
foundry deploy --network local --verify --api-key YOUR_API_KEY

# ${$tr("foundry.template.readmeDeployVerifyEnv")}
foundry deploy --network local --verify

# ${$tr("foundry.template.readmeDeployContractVerify")}
foundry deploy --network local --contract MyToken --verify --api-key YOUR_API_KEY
\`\`\`

#### ${$tr("foundry.template.readmeDenoRun")}

\`\`\`bash
deno run -A jsr:@dreamer/foundry/cli deploy --network local
\`\`\`

### 8. ${$tr("foundry.template.readmeVerify")}

#### ${$tr("foundry.template.readmeUseGlobal")}

\`\`\`bash
# ${$tr("foundry.template.readmeVerifyCmd")}
foundry verify --network local --contract MyToken --api-key YOUR_API_KEY

# ${$tr("foundry.template.readmeVerifyEnv")}
foundry verify --network local --contract MyToken
\`\`\`

#### ${$tr("foundry.template.readmeVerifyDenoRun")}

\`\`\`bash
deno run -A jsr:@dreamer/foundry/cli verify --network local --contract MyToken --api-key YOUR_API_KEY
\`\`\`

## ${$tr("foundry.template.readmeLibrary")}

\`\`\`typescript
import { createWeb3 } from "@dreamer/foundry";

// ${$tr("foundry.template.readmeCreateWeb3Note")}
const web3 = createWeb3("MyContract");

// ${$tr("foundry.template.readmeCreateWeb3Options")}
const web3WithOptions = createWeb3("MyContract", {
  rpcUrl: "http://custom-rpc:8545", // override rpcUrl
});
\`\`\`

${$tr("foundry.template.readmeCreateWeb3MergeNote")}

## ${$tr("foundry.template.readmeCmdHelp")}

- \`foundry deploy\` - ${$tr("foundry.template.readmeDeployCmd")}
  - \`--network <network>\` - ${$tr("foundry.template.readmeDeployNetwork")}
  - \`--contract <name>\` - ${$tr("foundry.template.readmeDeployContractOpt")}
  - \`--force\` / \`-f\` - ${$tr("foundry.template.readmeDeployForceOpt")}
  - \`--verify\` - ${$tr("foundry.template.readmeDeployVerifyOpt")}
  - \`--api-key <API_KEY>\` - ${$tr("foundry.template.readmeDeployApiKey")}

- \`foundry verify\` - ${$tr("foundry.template.readmeVerifyCmd2")}
  - \`--network <network>\` - ${$tr("foundry.template.readmeVerifyNetwork")}
  - \`--contract <name>\` - ${$tr("foundry.template.readmeVerifyContract")}
  - \`--api-key <API_KEY>\` - ${$tr("foundry.template.readmeVerifyApiKey")}

- \`foundry init [name]\` - ${$tr("foundry.template.readmeInitCmd")}

## ${$tr("foundry.template.readmeMoreInfo")}

- [${$tr("foundry.template.readmeFoundryDocs")}](https://book.getfoundry.sh/)
- [${$tr("foundry.template.readmeDreamerDocs")}](https://jsr.io/@dreamer/foundry)
`;
}

/** Apache 2.0 LICENSE 全文模板（占位：Dreamer Team） */
function getLicenseTemplate(rightsHolder: string): string {
  return `   Copyright 2026 ${rightsHolder}

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

================================================================================

   Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.
      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

      Copyright [yyyy] [name of copyright owner]

      Licensed under the Apache License, Version 2.0 (the "License");
      you may not use this file except in compliance with the License.
      You may obtain a copy of the License at

          http://www.apache.org/licenses/LICENSE-2.0

      Unless required by applicable law or agreed to in writing, software
      distributed under the License is distributed on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
      See the License for the specific language governing permissions and
      limitations under the License.
`;
}

/** NOTICE 全文模板（占位：Dreamer Team） */
function getNoticeTemplate(appName: string, copyrightOwner: string): string {
  return `   ${appName}

   Copyright 2026 ${copyrightOwner}

   This product is licensed under the Apache License, Version 2.0 (the "License").
   You may not use this file except in compliance with the License.
   You may obtain a copy of the License at:

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   For the full license text, see the LICENSE file in this distribution.
`;
}

/** LICENSE 内容，将占位替换为 copyrightOwner（通常来自 getCopyrightOwner：USER/USERNAME 或 "Dreamer Team"） */
export function getLicenseContent(copyrightOwner: string): string {
  return getLicenseTemplate(copyrightOwner);
}

/** NOTICE 内容，将占位替换为 copyrightOwner */
export function getNoticeContent(appName: string, copyrightOwner: string): string {
  return getNoticeTemplate(appName, copyrightOwner);
}
