import { LockliftConfig } from "locklift";
import { FactorySource } from "./build/factorySource";

require('dotenv').config();

declare global {
  const locklift: import("locklift").Locklift<FactorySource>;
}

const LOCAL_NETWORK_ENDPOINT = process.env.NETWORK_ENDPOINT || "http://localhost/graphql";
const DEV_NET_NETWORK_ENDPOINT = process.env.DEV_NET_NETWORK_ENDPOINT || "https://devnet-sandbox.evercloud.dev/graphql";

const VENOM_TESTNET_ENDPOINT = process.env.VENOM_TESTNET_ENDPOINT || "https://jrpc-testnet.venom.foundation/rpc";
const VENOM_ENDPOINT = process.env.VENOM_TESTNET_ENDPOINT || "https://jrpc.venom.foundation/rpc";
const VENOM_TESTNET_TRACE_ENDPOINT = process.env.VENOM_TESTNET_TRACE_ENDPOINT || "https://gql-testnet.venom.foundation/graphql";
const VENOM_MAINNET_TRACE_ENDPOINT = process.env.VENOM_TESTNET_TRACE_ENDPOINT || "https://gql.venom.foundation/graphql";

// Create your own link on https://dashboard.evercloud.dev/
const MAIN_NET_NETWORK_ENDPOINT = process.env.MAIN_NET_NETWORK_ENDPOINT || "https://mainnet.evercloud.dev/XXX/graphql";

const config: LockliftConfig = {
  compiler: {
    // Specify path to your TON-Solidity-Compiler
    // path: "/mnt/o/projects/broxus/TON-Solidity-Compiler/build/solc/solc",

    // Or specify version of compiler
    version: "0.70.0",

    // Specify config for extarnal contracts as in exapmple
    // externalContracts: {
    //   "node_modules/broxus-ton-tokens-contracts/build": ['TokenRoot', 'TokenWallet']
    // }
  },
  linker: {
    // Specify path to your stdlib
    // lib: "/mnt/o/projects/broxus/TON-Solidity-Compiler/lib/stdlib_sol.tvm",
    // // Specify path to your Linker
    // path: "/mnt/o/projects/broxus/TVM-linker/target/release/tvm_linker",

    // Or specify version of linker
    version: "0.20.3",
  },
  networks: {
      locklift: {
        connection: {
            id: 1001,
            // @ts-ignore
            type: "proxy",
            // @ts-ignore
            data: {},
        },
        // This giver is default local-node giverV2
        // giver: {
        //   // Check if you need provide custom giver
        //   address: process.env.LOCALHOST_GIVER_ADDRESS || '',
        //   key: process.env.LOCALHOST_GIVER_KEY || '',
        // },
        // tracing: {
        //   endpoint: LOCAL_NETWORK_ENDPOINT,
        // },
        keys: {
            // phrase: process.env.LOCALHOST_SEED,
            amount: 20,
        },
    },
    local: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: {
        id: 1,
        group: "localnet",
        type: "graphql",
        data: {
          endpoints: [LOCAL_NETWORK_ENDPOINT],
          latencyDetectionInterval: 1000,
          local: true,
        },
      },
      // This giver is default local-node giverV2
      giver: {
        // Check if you need provide custom giver
        address: process.env.LOCALHOST_GIVER_ADDRESS || '',
        key: process.env.LOCALHOST_GIVER_KEY || '',
      },
      tracing: {
        endpoint: LOCAL_NETWORK_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.LOCALHOST_SEED,
        amount: 20,
      },
    },
    test: {
      connection: {
        id: 1,
        type: "graphql",
        group: "dev",
        data: {
          endpoints: [DEV_NET_NETWORK_ENDPOINT],
          latencyDetectionInterval: 1000,
          local: false,
        },
      },
      giver: {
        address: process.env.TESTNET_EVER_GIVER_ADDRESS || '',
        key: process.env.TESTNET_EVER_GIVER_KEY || '',
      },
      tracing: {
        endpoint: DEV_NET_NETWORK_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.TESTNET_EVER_SEED,
        amount: 20,
      },
    },
    venom_test: {
      connection: {
        id: 1000,
        group: "dev",
        type: "graphql",
        data: {
          endpoints: ['https://gql-testnet.venom.foundation/graphql'],
          latencyDetectionInterval: 1000,
          local: false,
        },
        // type: "jrpc",
        // data: {
        //   endpoint: "https://jrpc-testnet.venom.foundation/",
        // },
      },
      giver: {
        address: process.env.TESTNET_VENOM_GIVER_ADDRESS || '',
        phrase: process.env.TESTNET_VENOM_SEED || '',
        accountId: parseInt(process.env.TESTNET_VENOM_GIVER_ID || '0'),
      },
      tracing: {
        endpoint: VENOM_TESTNET_TRACE_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.TESTNET_VENOM_SEED,
        amount: 20,
      },
    },
    venom: {
      connection: {
        id: 1,
        group: "main",
        type: "jrpc",
        data: {
          endpoint: "https://jrpc.venom.foundation",
        },
        // type: "graphql",
        // data: {
        //   endpoints: ['https://gql.venom.foundation/graphql'],
        //   latencyDetectionInterval: 1000,
        //   local: false,
        // },
        // type: "jrpc",
        // data: {
        //   endpoint: "https://jrpc.venom.foundation/rpc",
        // },
      },
      giver: {
        address: process.env.MAINNET_VENOM_GIVER_ADDRESS || '',
        phrase: process.env.MAINNET_VENOM_SEED || '',
        accountId: parseInt(process.env.MAINNET_VENOM_GIVER_ID || '0'),
      },
      tracing: {
        endpoint: VENOM_MAINNET_TRACE_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.MAINNET_VENOM_SEED,
        amount: 20,
      },
    },
    main: {
      // Specify connection settings for https://github.com/broxus/everscale-standalone-client/
      connection: {
        id: 1,
        type: "graphql",
        group: "main",
        data: {
          endpoints: [MAIN_NET_NETWORK_ENDPOINT],
          latencyDetectionInterval: 1000,
          local: false,
        },
      },
      // This giver is default Wallet
      giver: {
        address: process.env.MAINNET_EVER_GIVER_ADDRESS || '',
        key: process.env.MAINNET_EVER_GIVER_KEY || '',
      },
      tracing: {
        endpoint: MAIN_NET_NETWORK_ENDPOINT,
      },
      keys: {
        // Use everdev to generate your phrase
        // !!! Never commit it in your repos !!!
        phrase: process.env.MAINNET_EVER_SEED,
        amount: 20,
      },
    },
  },
  mocha: {
    timeout: 2000000,
  },
};

export default config;
